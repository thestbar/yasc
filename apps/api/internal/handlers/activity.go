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

	expenseTypes := []string{"expense_added", "expense_updated", "expense_deleted"}
	groupIDParam := c.QueryParam("groupId")

	applyWhere := func(q *bun.SelectQuery) *bun.SelectQuery {
		q = q.
			Join(`JOIN group_members gm ON gm.group_id = "activity_log".group_id`).
			Where("gm.user_id = ?", userID).
			Where(`(
				"activity_log".type NOT IN (?)
				OR "activity_log".actor_id = ?
				OR ("activity_log".metadata->'affectedUserIds') @> to_jsonb(?::text)
			)`, bun.In(expenseTypes), userID, userID)
		if groupIDParam != "" {
			q = q.Where(`"activity_log".group_id = ?`, groupIDParam)
		}
		return q
	}

	logs := make([]models.ActivityLog, 0)
	if err := applyWhere(h.db.NewSelect().Model(&logs)).
		Relation("Actor").
		Relation("Group").
		OrderExpr(`"activity_log".created_at DESC`).
		Limit(limit).Offset((page-1)*limit).
		Scan(ctx); err != nil {
		return internalError(c)
	}

	var total int
	_ = applyWhere(h.db.NewSelect().TableExpr(`"activity_logs" AS "activity_log"`)).
		ColumnExpr("COUNT(*)").
		Scan(ctx, &total)

	return c.JSON(http.StatusOK, PaginatedResponse[models.ActivityLog]{
		Data:    logs,
		Total:   total,
		Page:    page,
		Limit:   limit,
		HasMore: (page * limit) < total,
	})
}
