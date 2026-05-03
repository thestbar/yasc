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

type SettlementsHandler struct {
	db       *bun.DB
	activity *services.ActivityService
}

func NewSettlementsHandler(db *bun.DB, act *services.ActivityService) *SettlementsHandler {
	return &SettlementsHandler{db: db, activity: act}
}

func (h *SettlementsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	var settlements []models.Settlement
	if err := h.db.NewSelect().Model(&settlements).
		Relation("FromUser").Relation("ToUser").
		Where("settlement.group_id = ?", groupID).
		OrderExpr("settlement.date DESC, settlement.created_at DESC").
		Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, settlements)
}

func (h *SettlementsHandler) Create(c echo.Context) error {
	var body struct {
		FromUserID string  `json:"fromUserId"`
		ToUserID   string  `json:"toUserId"`
		Amount     int64   `json:"amount"`
		Currency   string  `json:"currency"`
		Date       string  `json:"date"`
		Notes      *string `json:"notes"`
	}
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "invalid request body")
	}
	if body.FromUserID == "" || body.ToUserID == "" || body.Amount <= 0 || body.Date == "" {
		return badRequest(c, "fromUserId, toUserId, amount, and date are required")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	if body.Currency == "" {
		body.Currency = "USD"
	}

	settlement := &models.Settlement{
		ID:         uuid.New().String(),
		GroupID:    groupID,
		FromUserID: body.FromUserID,
		ToUserID:   body.ToUserID,
		Amount:     body.Amount,
		Currency:   body.Currency,
		Date:       body.Date,
		Notes:      body.Notes,
		CreatedAt:  time.Now(),
	}

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return internalError(c)
	}
	if _, err = tx.NewInsert().Model(settlement).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}
	if err = tx.Commit(); err != nil {
		return internalError(c)
	}

	h.activity.LogSettlementCreated(ctx, userID, groupID, settlement.ID)
	return c.JSON(http.StatusCreated, settlement)
}

func (h *SettlementsHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	_, _ = h.db.NewDelete().Model((*models.Settlement)(nil)).
		Where("id = ? AND group_id = ?", id, groupID).Exec(ctx)
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *SettlementsHandler) isMember(ctx context.Context, groupID, userID string) bool {
	exists, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ?", groupID, userID).Exists(ctx)
	return exists
}
