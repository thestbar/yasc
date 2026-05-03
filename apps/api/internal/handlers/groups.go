package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/thestbar/yasc/api/internal/services"
	"github.com/uptrace/bun"
)

type GroupsHandler struct {
	db       *bun.DB
	activity *services.ActivityService
}

func NewGroupsHandler(db *bun.DB, act *services.ActivityService) *GroupsHandler {
	return &GroupsHandler{db: db, activity: act}
}

type CreateGroupRequest struct {
	Name          string  `json:"name"`
	ImageURL      *string `json:"imageUrl"`
	StartDate     *string `json:"startDate"`
	EndDate       *string `json:"endDate"`
	MaxMembers    *int    `json:"maxMembers"`
	DefaultSplit  string  `json:"defaultSplit"`
	SimplifyDebts bool    `json:"simplifyDebts"`
}

func (h *GroupsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	var groups []models.Group
	if err := h.db.NewSelect().Model(&groups).
		Join(`JOIN group_members gm ON gm.group_id = "group".id`).
		Where("gm.user_id = ?", userID).
		OrderExpr(`"group".created_at DESC`).
		Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, groups)
}

func (h *GroupsHandler) Create(c echo.Context) error {
	var req CreateGroupRequest
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return badRequest(c, "name is required")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	if req.DefaultSplit == "" {
		req.DefaultSplit = "equal"
	}

	group := &models.Group{
		ID:            uuid.New().String(),
		Name:          req.Name,
		ImageURL:      req.ImageURL,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		MaxMembers:    req.MaxMembers,
		SimplifyDebts: req.SimplifyDebts,
		DefaultSplit:  req.DefaultSplit,
		InviteCode:    uuid.New().String(),
		CreatedByID:   userID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return internalError(c)
	}
	if _, err = tx.NewInsert().Model(group).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}
	member := &models.GroupMember{
		ID:       uuid.New().String(),
		GroupID:  group.ID,
		UserID:   userID,
		Role:     "owner",
		JoinedAt: time.Now(),
	}
	if _, err = tx.NewInsert().Model(member).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}
	if err = tx.Commit(); err != nil {
		return internalError(c)
	}

	h.activity.LogGroupCreated(ctx, userID, group.ID)
	return c.JSON(http.StatusCreated, group)
}

func (h *GroupsHandler) Get(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isMember(ctx, id, userID) {
		return forbidden(c, "not a member of this group")
	}

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).
		Relation("Members", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Relation("User")
		}).
		Where(`"group".id = ?`, id).Scan(ctx); err != nil {
		return notFound(c, "group not found")
	}
	return c.JSON(http.StatusOK, group)
}

func (h *GroupsHandler) Update(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isOwner(ctx, id, userID) {
		return forbidden(c, "only the group owner can update")
	}

	var body struct {
		Name          *string `json:"name"`
		ImageURL      *string `json:"imageUrl"`
		MaxMembers    *int    `json:"maxMembers"`
		SimplifyDebts *bool   `json:"simplifyDebts"`
		DefaultSplit  *string `json:"defaultSplit"`
	}
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "invalid request body")
	}

	q := h.db.NewUpdate().Model((*models.Group)(nil)).Where("id = ?", id).Set("updated_at = ?", time.Now())
	if body.Name != nil {
		q = q.Set("name = ?", *body.Name)
	}
	if body.ImageURL != nil {
		q = q.Set("image_url = ?", *body.ImageURL)
	}
	if body.MaxMembers != nil {
		q = q.Set("max_members = ?", *body.MaxMembers)
	}
	if body.SimplifyDebts != nil {
		q = q.Set("simplify_debts = ?", *body.SimplifyDebts)
	}
	if body.DefaultSplit != nil {
		q = q.Set("default_split = ?", *body.DefaultSplit)
	}
	if _, err := q.Exec(ctx); err != nil {
		return internalError(c)
	}

	h.activity.LogGroupUpdated(ctx, userID, id)

	group := &models.Group{}
	_ = h.db.NewSelect().Model(group).Where("id = ?", id).Scan(ctx)
	return c.JSON(http.StatusOK, group)
}

func (h *GroupsHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isOwner(ctx, id, userID) {
		return forbidden(c, "only the group owner can delete")
	}

	_, _ = h.db.NewDelete().Model((*models.Group)(nil)).Where("id = ?", id).Exec(ctx)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *GroupsHandler) ListMembers(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isMember(ctx, id, userID) {
		return forbidden(c, "not a member")
	}

	var members []models.GroupMember
	if err := h.db.NewSelect().Model(&members).
		Relation("User").Where("group_member.group_id = ?", id).Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, members)
}

func (h *GroupsHandler) AddMember(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isMember(ctx, id, userID) {
		return forbidden(c, "not a member")
	}

	var body struct {
		UserID   *string `json:"userId"`
		Email    *string `json:"email"`
		Username *string `json:"username"`
	}
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "invalid request body")
	}

	target := &models.User{}
	q := h.db.NewSelect().Model(target)
	switch {
	case body.UserID != nil:
		q = q.Where("id = ?", *body.UserID)
	case body.Email != nil:
		q = q.Where("email = ?", *body.Email)
	case body.Username != nil:
		q = q.Where("username = ?", *body.Username)
	default:
		return badRequest(c, "userId, email, or username required")
	}
	if err := q.Scan(ctx); err != nil {
		return notFound(c, "user not found")
	}

	group := &models.Group{}
	_ = h.db.NewSelect().Model(group).Where("id = ?", id).Scan(ctx)
	if group.MaxMembers != nil {
		count, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).Where("group_id = ?", id).Count(ctx)
		if count >= *group.MaxMembers {
			return badRequest(c, "group is at maximum capacity")
		}
	}

	member := &models.GroupMember{
		ID:       uuid.New().String(),
		GroupID:  id,
		UserID:   target.ID,
		Role:     "member",
		JoinedAt: time.Now(),
	}
	if _, err := h.db.NewInsert().Model(member).
		On("CONFLICT (group_id, user_id) DO NOTHING").Exec(ctx); err != nil {
		return internalError(c)
	}
	h.activity.LogMemberJoined(ctx, target.ID, id)
	return c.JSON(http.StatusCreated, member)
}

func (h *GroupsHandler) RemoveMember(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("id")
	targetUserID := c.Param("userId")

	if !h.isOwner(ctx, groupID, userID) {
		return forbidden(c, "only the owner can remove members")
	}

	_, _ = h.db.NewDelete().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ?", groupID, targetUserID).Exec(ctx)
	h.activity.LogMemberLeft(ctx, targetUserID, groupID)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *GroupsHandler) Leave(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if h.isOwner(ctx, id, userID) {
		return badRequest(c, "owner cannot leave; transfer ownership or delete the group")
	}

	_, _ = h.db.NewDelete().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ?", id, userID).Exec(ctx)
	h.activity.LogMemberLeft(ctx, userID, id)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *GroupsHandler) RegenerateInvite(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isOwner(ctx, id, userID) {
		return forbidden(c, "only the owner can regenerate the invite code")
	}

	newCode := uuid.New().String()
	_, _ = h.db.NewUpdate().Model((*models.Group)(nil)).
		Set("invite_code = ?", newCode).Where("id = ?", id).Exec(ctx)
	return c.JSON(http.StatusOK, map[string]string{"inviteCode": newCode})
}

func (h *GroupsHandler) JoinPreview(c echo.Context) error {
	ctx := c.Request().Context()
	code := c.Param("inviteCode")

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).Where("invite_code = ?", code).Scan(ctx); err != nil {
		return notFound(c, "invite link not found or expired")
	}
	return c.JSON(http.StatusOK, map[string]any{"group": map[string]any{"id": group.ID, "name": group.Name, "imageUrl": group.ImageURL}})
}

func (h *GroupsHandler) Join(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	code := c.Param("inviteCode")

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).Where("invite_code = ?", code).Scan(ctx); err != nil {
		return notFound(c, "invite link not found")
	}

	if group.MaxMembers != nil {
		count, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).Where("group_id = ?", group.ID).Count(ctx)
		if count >= *group.MaxMembers {
			return badRequest(c, "group is at maximum capacity")
		}
	}

	member := &models.GroupMember{
		ID:       uuid.New().String(),
		GroupID:  group.ID,
		UserID:   userID,
		Role:     "member",
		JoinedAt: time.Now(),
	}
	if _, err := h.db.NewInsert().Model(member).
		On("CONFLICT (group_id, user_id) DO NOTHING").Exec(ctx); err != nil {
		return internalError(c)
	}
	h.activity.LogMemberJoined(ctx, userID, group.ID)
	return c.JSON(http.StatusOK, map[string]any{"group": group})
}

func (h *GroupsHandler) Balances(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	if !h.isMember(ctx, id, userID) {
		return forbidden(c, "not a member")
	}

	var expenses []*models.Expense
	_ = h.db.NewSelect().Model(&expenses).Relation("Splits").Where("expense.group_id = ?", id).Scan(ctx)

	var settlements []*models.Settlement
	_ = h.db.NewSelect().Model(&settlements).Where("settlement.group_id = ?", id).Scan(ctx)

	balances := services.CalculateGroupBalances(expenses, settlements)

	group := &models.Group{}
	_ = h.db.NewSelect().Model(group).Where("id = ?", id).Scan(ctx)

	if group.SimplifyDebts {
		debts := services.SimplifyDebts(balances)
		return c.JSON(http.StatusOK, map[string]any{"balances": balances, "simplifiedDebts": debts})
	}
	return c.JSON(http.StatusOK, map[string]any{"balances": balances, "simplifiedDebts": []any{}})
}

func (h *GroupsHandler) isMember(ctx context.Context, groupID, userID string) bool {
	exists, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ?", groupID, userID).Exists(ctx)
	return exists
}

func (h *GroupsHandler) isOwner(ctx context.Context, groupID, userID string) bool {
	exists, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ? AND role = 'owner'", groupID, userID).Exists(ctx)
	return exists
}
