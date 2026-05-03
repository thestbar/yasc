package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ErrorResponse struct {
	StatusCode int               `json:"statusCode"`
	Message    string            `json:"message"`
	Errors     map[string]string `json:"errors,omitempty"`
}

type PaginatedResponse[T any] struct {
	Data    []T   `json:"data"`
	Total   int   `json:"total"`
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	HasMore bool  `json:"hasMore"`
}

func fail(c echo.Context, status int, msg string) error {
	return c.JSON(status, ErrorResponse{StatusCode: status, Message: msg})
}

func badRequest(c echo.Context, msg string) error {
	return fail(c, http.StatusBadRequest, msg)
}

func notFound(c echo.Context, msg string) error {
	return fail(c, http.StatusNotFound, msg)
}

func forbidden(c echo.Context, msg string) error {
	return fail(c, http.StatusForbidden, msg)
}

func conflict(c echo.Context, msg string) error {
	return fail(c, http.StatusConflict, msg)
}

func internalError(c echo.Context) error {
	return fail(c, http.StatusInternalServerError, "internal server error")
}

func paginate(c echo.Context) (page, limit int) {
	page, _ = strconv.Atoi(c.QueryParam("page"))
	limit, _ = strconv.Atoi(c.QueryParam("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return
}

func randomToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	raw = hex.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	return
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
