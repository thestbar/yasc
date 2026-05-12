package handlers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

type UsersHandler struct {
	db *bun.DB
}

func NewUsersHandler(db *bun.DB) *UsersHandler {
	return &UsersHandler{db: db}
}

func (h *UsersHandler) Me(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	user := &models.User{}
	if err := h.db.NewSelect().Model(user).Where("id = ?", userID).Scan(ctx); err != nil {
		return notFound(c, "user not found")
	}
	return c.JSON(http.StatusOK, user)
}

func (h *UsersHandler) UpdateMe(c echo.Context) error {
	var body struct {
		DisplayName *string `json:"displayName"`
		AvatarURL   *string `json:"avatarUrl"`
	}
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "invalid request body")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	q := h.db.NewUpdate().Model((*models.User)(nil)).Where("id = ?", userID).Set("updated_at = ?", time.Now())
	if body.DisplayName != nil {
		q = q.Set("display_name = ?", *body.DisplayName)
	}
	if body.AvatarURL != nil {
		q = q.Set("avatar_url = ?", *body.AvatarURL)
	}
	if _, err := q.Exec(ctx); err != nil {
		return internalError(c)
	}

	user := &models.User{}
	_ = h.db.NewSelect().Model(user).Where("id = ?", userID).Scan(ctx)
	return c.JSON(http.StatusOK, user)
}

func (h *UsersHandler) UpdatePassword(c echo.Context) error {
	var body struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := c.Bind(&body); err != nil || body.CurrentPassword == "" || body.NewPassword == "" {
		return badRequest(c, "currentPassword and newPassword are required")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	user := &models.User{}
	if err := h.db.NewSelect().Model(user).Where("id = ?", userID).Scan(ctx); err != nil {
		return internalError(c)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.CurrentPassword)); err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{StatusCode: 401, Message: "incorrect current password"})
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 12)
	if err != nil {
		return internalError(c)
	}
	_, _ = h.db.NewUpdate().Model((*models.User)(nil)).
		Set("password_hash = ?", string(newHash)).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", userID).Exec(ctx)

	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *UsersHandler) DeleteMe(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	_, _ = h.db.NewUpdate().Model((*models.User)(nil)).
		Set("email = ?", "deleted_"+userID+"@deleted.invalid").
		Set("username = ?", "deleted_"+userID).
		Set("display_name = ?", "Deleted User").
		Set("avatar_url = NULL").
		Set("password_hash = ?", "").
		Set("updated_at = ?", time.Now()).
		Where("id = ?", userID).Exec(ctx)

	_, _ = h.db.NewDelete().Model((*models.RefreshToken)(nil)).Where("user_id = ?", userID).Exec(ctx)

	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *UsersHandler) Search(c echo.Context) error {
	q := c.QueryParam("q")
	if len(q) < 2 {
		return badRequest(c, "q must be at least 2 characters")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)

	pattern := q + "%"
	users := make([]models.User, 0)
	if err := h.db.NewSelect().Model(&users).
		Where("(username ILIKE ? OR email ILIKE ?) AND id != ?", pattern, pattern, userID).
		Limit(10).Scan(ctx); err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, users)
}
