package handlers

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/thestbar/yasc/api/internal/config"
	appMiddleware "github.com/thestbar/yasc/api/internal/middleware"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/thestbar/yasc/api/internal/services"
	"github.com/uptrace/bun"
)

type ExpensesHandler struct {
	db       *bun.DB
	activity *services.ActivityService
	cfg      *config.Config
}

func NewExpensesHandler(db *bun.DB, act *services.ActivityService, cfg *config.Config) *ExpensesHandler {
	return &ExpensesHandler{db: db, activity: act, cfg: cfg}
}

func (h *ExpensesHandler) applyConversion(ctx context.Context, groupCurrency, expCurrency string, amount int64) (convertedAmount int64, rate float64, err error) {
	rate, err = services.LookupExchangeRate(ctx, h.db, h.cfg.FrankfurterURL, expCurrency, groupCurrency)
	if err != nil {
		return 0, 0, err
	}
	convertedAmount = int64(math.Round(float64(amount) * rate))
	return convertedAmount, rate, nil
}

type SplitInput struct {
	UserID     string   `json:"userId"`
	Amount     int64    `json:"amount"`
	Percentage *float64 `json:"percentage"`
	Shares     *int64   `json:"shares"`
}

type CreateExpenseRequest struct {
	Description string       `json:"description"`
	Amount      int64        `json:"amount"`
	Currency    string       `json:"currency"`
	Date        string       `json:"date"`
	Category    string       `json:"category"`
	PaidByID    string       `json:"paidById"`
	SplitType   string       `json:"splitType"`
	Splits      []SplitInput `json:"splits"`
	ReceiptURL  *string      `json:"receiptUrl"`
	Notes       *string      `json:"notes"`
}

func (h *ExpensesHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	page, limit := paginate(c)

	expenses := make([]models.Expense, 0)
	q := h.db.NewSelect().Model(&expenses).
		Relation("PaidBy").Relation("Splits", func(q *bun.SelectQuery) *bun.SelectQuery {
		return q.Relation("User")
	}).
		Where("expense.group_id = ?", groupID).
		OrderExpr("expense.date DESC, expense.created_at DESC").
		Limit(limit).Offset((page - 1) * limit)

	if cat := c.QueryParam("category"); cat != "" {
		q = q.Where("expense.category = ?", cat)
	}
	if paid := c.QueryParam("paidById"); paid != "" {
		q = q.Where("expense.paid_by_id = ?", paid)
	}
	if from := c.QueryParam("dateFrom"); from != "" {
		q = q.Where("expense.date >= ?", from)
	}
	if to := c.QueryParam("dateTo"); to != "" {
		q = q.Where("expense.date <= ?", to)
	}

	if err := q.Scan(ctx); err != nil {
		return internalError(c)
	}

	total, _ := h.db.NewSelect().Model((*models.Expense)(nil)).Where("group_id = ?", groupID).Count(ctx)
	return c.JSON(http.StatusOK, PaginatedResponse[models.Expense]{
		Data:    expenses,
		Total:   total,
		Page:    page,
		Limit:   limit,
		HasMore: (page * limit) < total,
	})
}

func (h *ExpensesHandler) Create(c echo.Context) error {
	var req CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request body")
	}
	if req.Description == "" || req.Amount <= 0 || req.PaidByID == "" || len(req.Splits) == 0 {
		return badRequest(c, "description, amount, paidById, and splits are required")
	}

	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	if req.Currency == "" {
		req.Currency = "USD"
	}
	if req.Category == "" {
		req.Category = "general"
	}

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).Where("id = ?", groupID).Scan(ctx); err != nil {
		return internalError(c)
	}

	var (
		originalCurrency *string
		originalAmount   *int64
		exchangeRate     *float64
	)

	if group.ConsolidateCurrencies && req.Currency != "" && req.Currency != group.Currency {
		orig := req.Currency
		origAmt := req.Amount
		converted, rate, cerr := h.applyConversion(ctx, group.Currency, req.Currency, req.Amount)
		if cerr != nil {
			return badRequest(c, fmt.Sprintf("currency conversion unavailable: %v", cerr))
		}
		req.Amount = converted
		req.Currency = group.Currency
		originalCurrency = &orig
		originalAmount = &origAmt
		exchangeRate = &rate
	}

	// Validate and compute splits
	svcInputs := make([]services.SplitInput, len(req.Splits))
	for i, s := range req.Splits {
		svcInputs[i] = services.SplitInput{
			UserID:     s.UserID,
			Amount:     s.Amount,
			Percentage: s.Percentage,
			Shares:     s.Shares,
		}
	}

	var (
		finalInputs []services.SplitInput
		err         error
	)
	switch req.SplitType {
	case "equal":
		finalInputs, err = services.ValidateEqualSplit(req.Amount, svcInputs)
	case "percentage":
		finalInputs, err = services.ValidatePercentageSplit(req.Amount, svcInputs)
	case "shares":
		finalInputs, err = services.ValidateSharesSplit(req.Amount, svcInputs)
	case "exact", "":
		if verr := services.ValidateExactSplit(req.Amount, svcInputs); verr != nil {
			return badRequest(c, verr.Error())
		}
		finalInputs = svcInputs
	default:
		return badRequest(c, "invalid splitType")
	}
	if err != nil {
		return badRequest(c, err.Error())
	}

	expense := &models.Expense{
		ID:               uuid.New().String(),
		GroupID:          groupID,
		Description:      req.Description,
		Amount:           req.Amount,
		Currency:         req.Currency,
		Date:             req.Date,
		Category:         req.Category,
		PaidByID:         req.PaidByID,
		SplitType:        req.SplitType,
		ReceiptURL:       req.ReceiptURL,
		Notes:            req.Notes,
		OriginalCurrency: originalCurrency,
		OriginalAmount:   originalAmount,
		ExchangeRate:     exchangeRate,
		CreatedByID:      userID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return internalError(c)
	}
	if _, err = tx.NewInsert().Model(expense).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}
	for _, inp := range finalInputs {
		split := &models.ExpenseSplit{
			ID:         uuid.New().String(),
			ExpenseID:  expense.ID,
			UserID:     inp.UserID,
			Amount:     inp.Amount,
			Percentage: inp.Percentage,
			Shares:     inp.Shares,
		}
		if _, err = tx.NewInsert().Model(split).Exec(ctx); err != nil {
			_ = tx.Rollback()
			return internalError(c)
		}
	}
	if err = tx.Commit(); err != nil {
		return internalError(c)
	}

	h.activity.LogExpenseCreated(ctx, userID, groupID, expense.ID)
	return c.JSON(http.StatusCreated, expense)
}

func (h *ExpensesHandler) Get(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).
		Relation("PaidBy").
		Relation("Splits", func(q *bun.SelectQuery) *bun.SelectQuery { return q.Relation("User") }).
		Where("expense.id = ? AND expense.group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpensesHandler) Update(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).Where("id = ? AND group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}
	if expense.CreatedByID != userID && !h.isOwner(ctx, groupID, userID) {
		return forbidden(c, "only the creator or group owner can edit")
	}

	var req CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request body")
	}
	if req.Description == "" || req.Amount <= 0 || req.PaidByID == "" || len(req.Splits) == 0 {
		return badRequest(c, "description, amount, paidById, and splits are required")
	}

	if req.Currency == "" {
		req.Currency = "USD"
	}
	if req.Category == "" {
		req.Category = "general"
	}

	updateGroup := &models.Group{}
	if err := h.db.NewSelect().Model(updateGroup).Where("id = ?", groupID).Scan(ctx); err != nil {
		return internalError(c)
	}

	var (
		updatedOriginalCurrency *string
		updatedOriginalAmount   *int64
		updatedExchangeRate     *float64
	)

	if updateGroup.ConsolidateCurrencies && req.Currency != "" && req.Currency != updateGroup.Currency {
		orig := req.Currency
		origAmt := req.Amount
		converted, rate, cerr := h.applyConversion(ctx, updateGroup.Currency, req.Currency, req.Amount)
		if cerr != nil {
			return badRequest(c, fmt.Sprintf("currency conversion unavailable: %v", cerr))
		}
		req.Amount = converted
		req.Currency = updateGroup.Currency
		updatedOriginalCurrency = &orig
		updatedOriginalAmount = &origAmt
		updatedExchangeRate = &rate
	}

	svcInputs := make([]services.SplitInput, len(req.Splits))
	for i, s := range req.Splits {
		svcInputs[i] = services.SplitInput{
			UserID:     s.UserID,
			Amount:     s.Amount,
			Percentage: s.Percentage,
			Shares:     s.Shares,
		}
	}

	var (
		finalInputs []services.SplitInput
		splitErr    error
	)
	switch req.SplitType {
	case "equal":
		finalInputs, splitErr = services.ValidateEqualSplit(req.Amount, svcInputs)
	case "percentage":
		finalInputs, splitErr = services.ValidatePercentageSplit(req.Amount, svcInputs)
	case "shares":
		finalInputs, splitErr = services.ValidateSharesSplit(req.Amount, svcInputs)
	case "exact", "":
		if verr := services.ValidateExactSplit(req.Amount, svcInputs); verr != nil {
			return badRequest(c, verr.Error())
		}
		finalInputs = svcInputs
	default:
		return badRequest(c, "invalid splitType")
	}
	if splitErr != nil {
		return badRequest(c, splitErr.Error())
	}

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return internalError(c)
	}

	// Delete old splits
	if _, err = tx.NewDelete().Model((*models.ExpenseSplit)(nil)).Where("expense_id = ?", id).Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}

	// Update expense fields
	if _, err = tx.NewUpdate().Model(expense).
		Set("description = ?", req.Description).
		Set("amount = ?", req.Amount).
		Set("currency = ?", req.Currency).
		Set("date = ?", req.Date).
		Set("category = ?", req.Category).
		Set("paid_by_id = ?", req.PaidByID).
		Set("split_type = ?", req.SplitType).
		Set("notes = ?", req.Notes).
		Set("original_currency = ?", updatedOriginalCurrency).
		Set("original_amount = ?", updatedOriginalAmount).
		Set("exchange_rate = ?", updatedExchangeRate).
		Set("updated_at = ?", time.Now()).
		WherePK().Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}

	// Re-insert validated splits
	for _, inp := range finalInputs {
		split := &models.ExpenseSplit{
			ID:         uuid.New().String(),
			ExpenseID:  id,
			UserID:     inp.UserID,
			Amount:     inp.Amount,
			Percentage: inp.Percentage,
			Shares:     inp.Shares,
		}
		if _, err = tx.NewInsert().Model(split).Exec(ctx); err != nil {
			_ = tx.Rollback()
			return internalError(c)
		}
	}

	if err = tx.Commit(); err != nil {
		return internalError(c)
	}
	h.activity.LogExpenseUpdated(ctx, userID, groupID, id)
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpensesHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).Where("id = ? AND group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}
	if expense.CreatedByID != userID && !h.isOwner(ctx, groupID, userID) {
		return forbidden(c, "only the creator or group owner can delete")
	}

	_, _ = h.db.NewDelete().Model(expense).WherePK().Exec(ctx)
	h.activity.LogExpenseDeleted(ctx, userID, groupID, map[string]any{"description": expense.Description, "amount": expense.Amount})
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *ExpensesHandler) isMember(ctx context.Context, groupID, userID string) bool {
	exists, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ?", groupID, userID).Exists(ctx)
	return exists
}

func (h *ExpensesHandler) isOwner(ctx context.Context, groupID, userID string) bool {
	exists, _ := h.db.NewSelect().Model((*models.GroupMember)(nil)).
		Where("group_id = ? AND user_id = ? AND role = 'owner'", groupID, userID).Exists(ctx)
	return exists
}
