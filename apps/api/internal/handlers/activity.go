package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
)

type ActivityHandler struct {
	db *bun.DB
}

func NewActivityHandler(db *bun.DB) *ActivityHandler {
	return &ActivityHandler{db: db}
}

func (h *ActivityHandler) Feed(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	page, limit := paginate(c)

	q := h.db.NewSelect().Model((*models.ActivityLog)(nil)).
		TableExpr("activity_logs AS al").
		Relation("Actor").
		Relation("Group").
		Join("JOIN group_members gm ON gm.group_id = al.group_id").
		Where("gm.user_id = ?", userID).
		OrderExpr("al.created_at DESC").
		Limit(limit).Offset((page - 1) * limit)

	if groupID := c.QueryParam("groupId"); groupID != "" {
		q = q.Where("al.group_id = ?", groupID)
	}

	logs := make([]models.ActivityLog, 0)
	if err := q.Scan(ctx); err != nil {
		return internalError(c)
	}

	total, _ := h.db.NewSelect().Model((*models.ActivityLog)(nil)).
		TableExpr("activity_logs AS al").
		Join("JOIN group_members gm ON gm.group_id = al.group_id").
		Where("gm.user_id = ?", userID).Count(ctx)

	return c.JSON(http.StatusOK, PaginatedResponse[models.ActivityLog]{
		Data:    logs,
		Total:   total,
		Page:    page,
		Limit:   limit,
		HasMore: (page * limit) < total,
	})
}
