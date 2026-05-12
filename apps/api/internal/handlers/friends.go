package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/thestbar/yasc/api/internal/mailer"
	"github.com/uptrace/bun"
)

type FriendsHandler struct {
	db     *bun.DB
	mailer *mailer.Mailer
}

func NewFriendsHandler(db *bun.DB, m *mailer.Mailer) *FriendsHandler {
	return &FriendsHandler{db: db, mailer: m}
}

func (h *FriendsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	friendships := make([]models.Friendship, 0)
	if err := h.db.NewSelect().Model(&friendships).
		Relation("User").Relation("Friend").
		Where("(friendship.user_id = ? OR friendship.friend_id = ?) AND friendship.status = 'accepted'", userID, userID).
		Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, friendships)
}

func (h *FriendsHandler) Requests(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	friendships := make([]models.Friendship, 0)
	if err := h.db.NewSelect().Model(&friendships).
		Relation("User").
		Where("friendship.friend_id = ? AND friendship.status = 'pending'", userID).
		Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, friendships)
}

func (h *FriendsHandler) SendRequest(c echo.Context) error {
	var body struct {
		Identifier string `json:"identifier"`
	}
	if err := c.Bind(&body); err != nil || body.Identifier == "" {
		return badRequest(c, "identifier is required")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	target := &models.User{}
	if err := h.db.NewSelect().Model(target).
		Where("email = ? OR username = ?", body.Identifier, body.Identifier).
		Scan(ctx); err != nil {
		return notFound(c, "user not found")
	}
	if target.ID == userID {
		return badRequest(c, "cannot send friend request to yourself")
	}

	exists, _ := h.db.NewSelect().Model((*models.Friendship)(nil)).
		Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
			userID, target.ID, target.ID, userID).
		Exists(ctx)
	if exists {
		return conflict(c, "friendship already exists or request already sent")
	}

	friendship := &models.Friendship{
		ID:        uuid.New().String(),
		UserID:    userID,
		FriendID:  target.ID,
		Status:    "pending",
		CreatedAt: time.Now(),
	}
	if _, err := h.db.NewInsert().Model(friendship).Exec(ctx); err != nil {
		return internalError(c)
	}

	sender := &models.User{}
	_ = h.db.NewSelect().Model(sender).Where("id = ?", userID).Scan(ctx)
	h.mailer.SendFriendRequest(target.Email, sender.DisplayName, "")

	return c.JSON(http.StatusCreated, friendship)
}

func (h *FriendsHandler) AcceptRequest(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	friendship := &models.Friendship{}
	if err := h.db.NewSelect().Model(friendship).Where("id = ?", id).Scan(ctx); err != nil {
		return notFound(c, "request not found")
	}
	if friendship.FriendID != userID {
		return forbidden(c, "not your request")
	}

	_, _ = h.db.NewUpdate().Model(friendship).Set("status = 'accepted'").WherePK().Exec(ctx)
	friendship.Status = "accepted"
	return c.JSON(http.StatusOK, friendship)
}

func (h *FriendsHandler) DeclineRequest(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	friendship := &models.Friendship{}
	if err := h.db.NewSelect().Model(friendship).Where("id = ?", id).Scan(ctx); err != nil {
		return notFound(c, "request not found")
	}
	if friendship.FriendID != userID {
		return forbidden(c, "not your request")
	}

	_, _ = h.db.NewDelete().Model(friendship).WherePK().Exec(ctx)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *FriendsHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	id := c.Param("id")

	friendship := &models.Friendship{}
	if err := h.db.NewSelect().Model(friendship).Where("id = ?", id).Scan(ctx); err != nil {
		return notFound(c, "friendship not found")
	}
	if friendship.UserID != userID && friendship.FriendID != userID {
		return forbidden(c, "not your friendship")
	}

	_, _ = h.db.NewDelete().Model(friendship).WherePK().Exec(ctx)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}
