package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/thestbar/yasc/api/internal/config"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/mailer"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db     *bun.DB
	cfg    *config.Config
	mailer *mailer.Mailer
}

func NewAuthHandler(db *bun.DB, cfg *config.Config, m *mailer.Mailer) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg, mailer: m}
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	User         *models.User `json:"user"`
}

func (h *AuthHandler) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request body")
	}
	if req.Email == "" || req.Username == "" || req.Password == "" || req.DisplayName == "" {
		return badRequest(c, "email, username, displayName, and password are required")
	}

	ctx := c.Request().Context()

	exists, _ := h.db.NewSelect().Model((*models.User)(nil)).
		Where("email = ? OR username = ?", req.Email, req.Username).
		Exists(ctx)
	if exists {
		return conflict(c, "email or username already in use")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return internalError(c)
	}

	user := &models.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		Username:     req.Username,
		DisplayName:  req.DisplayName,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if _, err := h.db.NewInsert().Model(user).Exec(ctx); err != nil {
		return internalError(c)
	}

	h.mailer.SendWelcome(user.Email, user.DisplayName)

	access, refresh, err := h.issueTokens(ctx, user)
	if err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusCreated, AuthResponse{AccessToken: access, RefreshToken: refresh, User: user})
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	ctx := c.Request().Context()
	user := &models.User{}
	if err := h.db.NewSelect().Model(user).Where("email = ?", req.Email).Scan(ctx); err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{StatusCode: 401, Message: "invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{StatusCode: 401, Message: "invalid credentials"})
	}

	access, refresh, err := h.issueTokens(ctx, user)
	if err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, AuthResponse{AccessToken: access, RefreshToken: refresh, User: user})
}

func (h *AuthHandler) Refresh(c echo.Context) error {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.Bind(&body); err != nil || body.RefreshToken == "" {
		return badRequest(c, "refreshToken is required")
	}

	ctx := c.Request().Context()
	hash := hashToken(body.RefreshToken)

	rt := &models.RefreshToken{}
	if err := h.db.NewSelect().Model(rt).Where("token_hash = ?", hash).Scan(ctx); err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{StatusCode: 401, Message: "invalid refresh token"})
	}
	if time.Now().After(rt.ExpiresAt) {
		_, _ = h.db.NewDelete().Model(rt).WherePK().Exec(ctx)
		return c.JSON(http.StatusUnauthorized, ErrorResponse{StatusCode: 401, Message: "refresh token expired"})
	}

	user := &models.User{}
	if err := h.db.NewSelect().Model(user).Where("id = ?", rt.UserID).Scan(ctx); err != nil {
		return internalError(c)
	}

	// Sliding expiry: extend RT lifetime instead of rotating, so a lost
	// response (e.g. page reload mid-request) never strands the user.
	refreshExpiry, _ := time.ParseDuration(h.cfg.RefreshExpiry)
	_, _ = h.db.NewUpdate().Model(rt).
		Set("expires_at = ?", time.Now().Add(refreshExpiry)).
		WherePK().Exec(ctx)

	access, err := h.issueAccessToken(user)
	if err != nil {
		return internalError(c)
	}
	return c.JSON(http.StatusOK, AuthResponse{AccessToken: access, RefreshToken: body.RefreshToken, User: user})
}

func (h *AuthHandler) Logout(c echo.Context) error {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	_ = c.Bind(&body)
	if body.RefreshToken != "" {
		hash := hashToken(body.RefreshToken)
		_, _ = h.db.NewDelete().Model((*models.RefreshToken)(nil)).
			Where("token_hash = ?", hash).Exec(c.Request().Context())
	}
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthHandler) ForgotPassword(c echo.Context) error {
	var body struct {
		Email string `json:"email"`
	}
	if err := c.Bind(&body); err != nil || body.Email == "" {
		return badRequest(c, "email is required")
	}
	ctx := c.Request().Context()

	user := &models.User{}
	if err := h.db.NewSelect().Model(user).Where("email = ?", body.Email).Scan(ctx); err != nil {
		return c.JSON(http.StatusOK, map[string]bool{"ok": true})
	}

	raw, hash, err := randomToken()
	if err != nil {
		return internalError(c)
	}

	prt := &models.PasswordResetToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(15 * time.Minute),
		CreatedAt: time.Now(),
	}
	_, _ = h.db.NewInsert().Model(prt).On("CONFLICT (token_hash) DO NOTHING").Exec(ctx)

	resetURL := h.cfg.AppURL + "/reset-password?token=" + raw
	h.mailer.SendPasswordReset(user.Email, resetURL)

	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthHandler) ResetPassword(c echo.Context) error {
	var body struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := c.Bind(&body); err != nil || body.Token == "" || body.NewPassword == "" {
		return badRequest(c, "token and newPassword are required")
	}
	ctx := c.Request().Context()

	hash := hashToken(body.Token)
	prt := &models.PasswordResetToken{}
	if err := h.db.NewSelect().Model(prt).Where("token_hash = ?", hash).Scan(ctx); err != nil {
		return badRequest(c, "invalid or expired token")
	}
	if time.Now().After(prt.ExpiresAt) {
		_, _ = h.db.NewDelete().Model(prt).WherePK().Exec(ctx)
		return badRequest(c, "token expired")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 12)
	if err != nil {
		return internalError(c)
	}

	_, _ = h.db.NewUpdate().Model((*models.User)(nil)).
		Set("password_hash = ?", string(newHash)).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", prt.UserID).Exec(ctx)

	_, _ = h.db.NewDelete().Model(prt).WherePK().Exec(ctx)
	_, _ = h.db.NewDelete().Model((*models.RefreshToken)(nil)).Where("user_id = ?", prt.UserID).Exec(ctx)

	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthHandler) issueAccessToken(user *models.User) (string, error) {
	expiry, _ := time.ParseDuration(h.cfg.JWTExpiry)
	claims := appMiddleware.JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.cfg.JWTSecret))
}

func (h *AuthHandler) issueTokens(ctx context.Context, user *models.User) (string, string, error) {
	expiry, _ := time.ParseDuration(h.cfg.JWTExpiry)
	claims := appMiddleware.JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	raw, hash, err := randomToken()
	if err != nil {
		return "", "", err
	}
	refreshExpiry, _ := time.ParseDuration(h.cfg.RefreshExpiry)
	rt := &models.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(refreshExpiry),
		CreatedAt: time.Now(),
	}
	if _, err = h.db.NewInsert().Model(rt).Exec(ctx); err != nil {
		return "", "", err
	}
	return accessToken, raw, nil
}
