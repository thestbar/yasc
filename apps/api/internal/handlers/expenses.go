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

	affectedIDs := make([]string, 0, len(finalInputs)+1)
	affectedIDs = append(affectedIDs, req.PaidByID)
	for _, inp := range finalInputs {
		if inp.UserID != req.PaidByID {
			affectedIDs = append(affectedIDs, inp.UserID)
		}
	}
	names := h.userNames(ctx, affectedIDs)
	h.activity.LogExpenseCreated(ctx, userID, groupID, expense.ID, expense.Description, expense.Amount, expense.Currency, req.PaidByID, names[req.PaidByID], h.buildSplitsMeta(req.PaidByID, finalInputs, names), affectedIDs)
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
	updatedAffectedIDs := make([]string, 0, len(finalInputs)+1)
	updatedAffectedIDs = append(updatedAffectedIDs, req.PaidByID)
	for _, inp := range finalInputs {
		if inp.UserID != req.PaidByID {
			updatedAffectedIDs = append(updatedAffectedIDs, inp.UserID)
		}
	}
	updatedNames := h.userNames(ctx, updatedAffectedIDs)
	h.activity.LogExpenseUpdated(ctx, userID, groupID, id, req.Description, req.Amount, req.Currency, req.PaidByID, updatedNames[req.PaidByID], h.buildSplitsMeta(req.PaidByID, finalInputs, updatedNames), updatedAffectedIDs)
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpensesHandler) ConvertPreview(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")
	to := c.QueryParam("to")

	if to == "" {
		return badRequest(c, "to query param is required")
	}
	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).Where("id = ? AND group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}

	if expense.Currency == to {
		return c.JSON(http.StatusOK, map[string]any{
			"from":            expense.Currency,
			"to":              to,
			"rate":            1.0,
			"originalAmount":  expense.Amount,
			"convertedAmount": expense.Amount,
		})
	}

	rate, err := services.LookupExchangeRate(ctx, h.db, h.cfg.FrankfurterURL, expense.Currency, to)
	if err != nil {
		return badRequest(c, fmt.Sprintf("currency conversion unavailable: %v", err))
	}

	convertedAmount := int64(math.Round(float64(expense.Amount) * rate))
	return c.JSON(http.StatusOK, map[string]any{
		"from":            expense.Currency,
		"to":              to,
		"rate":            rate,
		"originalAmount":  expense.Amount,
		"convertedAmount": convertedAmount,
	})
}

type ConvertExpenseRequest struct {
	TargetCurrency string `json:"targetCurrency"`
}

func (h *ExpensesHandler) Convert(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	var req ConvertExpenseRequest
	if err := c.Bind(&req); err != nil || req.TargetCurrency == "" {
		return badRequest(c, "targetCurrency is required")
	}

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).
		Relation("PaidBy").
		Relation("Splits", func(q *bun.SelectQuery) *bun.SelectQuery { return q.Relation("User") }).
		Where("expense.id = ? AND expense.group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}

	if expense.Currency == req.TargetCurrency {
		return c.JSON(http.StatusOK, expense)
	}

	rate, err := services.LookupExchangeRate(ctx, h.db, h.cfg.FrankfurterURL, expense.Currency, req.TargetCurrency)
	if err != nil {
		return badRequest(c, fmt.Sprintf("currency conversion unavailable: %v", err))
	}

	origCurrency := expense.Currency
	origAmount := expense.Amount
	newAmount := int64(math.Round(float64(origAmount) * rate))

	totalAllocated := int64(0)
	for i := range expense.Splits {
		scaled := int64(math.Round(float64(expense.Splits[i].Amount) * rate))
		totalAllocated += scaled
		expense.Splits[i].Amount = scaled
	}
	if len(expense.Splits) > 0 {
		expense.Splits[0].Amount += newAmount - totalAllocated
	}

	tx, txErr := h.db.BeginTx(ctx, nil)
	if txErr != nil {
		return internalError(c)
	}

	if _, err = tx.NewUpdate().Model(expense).
		Set("amount = ?", newAmount).
		Set("currency = ?", req.TargetCurrency).
		Set("original_currency = ?", origCurrency).
		Set("original_amount = ?", origAmount).
		Set("exchange_rate = ?", rate).
		Set("updated_at = ?", time.Now()).
		WherePK().Exec(ctx); err != nil {
		_ = tx.Rollback()
		return internalError(c)
	}

	for i := range expense.Splits {
		if _, err = tx.NewUpdate().Model(expense.Splits[i]).
			Set("amount = ?", expense.Splits[i].Amount).
			WherePK().Exec(ctx); err != nil {
			_ = tx.Rollback()
			return internalError(c)
		}
	}

	if err = tx.Commit(); err != nil {
		return internalError(c)
	}

	expense.Amount = newAmount
	expense.Currency = req.TargetCurrency
	expense.OriginalCurrency = &origCurrency
	expense.OriginalAmount = &origAmount
	expense.ExchangeRate = &rate

	convertAffectedIDs := make([]string, 0, len(expense.Splits)+1)
	convertAffectedIDs = append(convertAffectedIDs, expense.PaidByID)
	for _, s := range expense.Splits {
		if s.UserID != expense.PaidByID {
			convertAffectedIDs = append(convertAffectedIDs, s.UserID)
		}
	}
	convertNames := h.userNames(ctx, convertAffectedIDs)
	convertSplitInputs := make([]services.SplitInput, len(expense.Splits))
	for i, s := range expense.Splits {
		convertSplitInputs[i] = services.SplitInput{UserID: s.UserID, Amount: s.Amount}
	}
	h.activity.LogExpenseUpdated(ctx, userID, groupID, id, expense.Description, newAmount, req.TargetCurrency, expense.PaidByID, convertNames[expense.PaidByID], h.buildSplitsMeta(expense.PaidByID, convertSplitInputs, convertNames), convertAffectedIDs)
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpensesHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")
	id := c.Param("id")

	expense := &models.Expense{}
	if err := h.db.NewSelect().Model(expense).Relation("Splits").Where("expense.id = ? AND expense.group_id = ?", id, groupID).Scan(ctx); err != nil {
		return notFound(c, "expense not found")
	}
	if expense.CreatedByID != userID && !h.isOwner(ctx, groupID, userID) {
		return forbidden(c, "only the creator or group owner can delete")
	}

	deleteAffectedIDs := make([]string, 0, len(expense.Splits)+1)
	deleteAffectedIDs = append(deleteAffectedIDs, expense.PaidByID)
	for _, s := range expense.Splits {
		if s.UserID != expense.PaidByID {
			deleteAffectedIDs = append(deleteAffectedIDs, s.UserID)
		}
	}

	_, _ = h.db.NewDelete().Model(expense).WherePK().Exec(ctx)
	h.activity.LogExpenseDeleted(ctx, userID, groupID, deleteAffectedIDs, map[string]any{
		"description": expense.Description,
		"amount":      expense.Amount,
		"currency":    expense.Currency,
	})
	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func (h *ExpensesHandler) ConvertAllPreview(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isMember(ctx, groupID, userID) {
		return forbidden(c, "not a member")
	}

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).Where("id = ?", groupID).Scan(ctx); err != nil {
		return internalError(c)
	}

	type row struct {
		Currency string `json:"currency"`
		Count    int    `json:"count"`
	}
	rows := make([]row, 0)
	if err := h.db.NewSelect().
		TableExpr("expenses").
		ColumnExpr("currency, COUNT(*) AS count").
		Where("group_id = ? AND currency != ?", groupID, group.Currency).
		GroupExpr("currency").
		Scan(ctx, &rows); err != nil {
		return internalError(c)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"groupCurrency": group.Currency,
		"breakdown":     rows,
	})
}

func (h *ExpensesHandler) ConvertAll(c echo.Context) error {
	ctx := c.Request().Context()
	userID := appMiddleware.CurrentUserID(c)
	groupID := c.Param("groupId")

	if !h.isOwner(ctx, groupID, userID) {
		return forbidden(c, "only the group owner can bulk convert expenses")
	}

	group := &models.Group{}
	if err := h.db.NewSelect().Model(group).Where("id = ?", groupID).Scan(ctx); err != nil {
		return internalError(c)
	}

	expenses := make([]*models.Expense, 0)
	if err := h.db.NewSelect().Model(&expenses).
		Relation("Splits").
		Where("expense.group_id = ? AND expense.currency != ?", groupID, group.Currency).
		Scan(ctx); err != nil {
		return internalError(c)
	}

	converted := 0
	skipped := 0
	for _, expense := range expenses {
		rate, err := services.LookupExchangeRate(ctx, h.db, h.cfg.FrankfurterURL, expense.Currency, group.Currency)
		if err != nil {
			skipped++
			continue
		}

		origCurrency := expense.Currency
		origAmount := expense.Amount
		newAmount := int64(math.Round(float64(origAmount) * rate))

		totalAllocated := int64(0)
		for i := range expense.Splits {
			scaled := int64(math.Round(float64(expense.Splits[i].Amount) * rate))
			totalAllocated += scaled
			expense.Splits[i].Amount = scaled
		}
		if len(expense.Splits) > 0 {
			expense.Splits[0].Amount += newAmount - totalAllocated
		}

		tx, txErr := h.db.BeginTx(ctx, nil)
		if txErr != nil {
			skipped++
			continue
		}

		if _, err = tx.NewUpdate().Model(expense).
			Set("amount = ?", newAmount).
			Set("currency = ?", group.Currency).
			Set("original_currency = ?", origCurrency).
			Set("original_amount = ?", origAmount).
			Set("exchange_rate = ?", rate).
			Set("updated_at = ?", time.Now()).
			WherePK().Exec(ctx); err != nil {
			_ = tx.Rollback()
			skipped++
			continue
		}

		failed := false
		for i := range expense.Splits {
			if _, err = tx.NewUpdate().Model(expense.Splits[i]).
				Set("amount = ?", expense.Splits[i].Amount).
				WherePK().Exec(ctx); err != nil {
				_ = tx.Rollback()
				failed = true
				break
			}
		}
		if failed {
			skipped++
			continue
		}

		if err = tx.Commit(); err != nil {
			skipped++
			continue
		}
		converted++
	}

	// Convert settlements in non-group currencies so they don't create phantom balances
	var settlementsToConvert []*models.Settlement
	_ = h.db.NewSelect().Model(&settlementsToConvert).
		Where("group_id = ? AND currency != ?", groupID, group.Currency).
		Scan(ctx)

	for _, s := range settlementsToConvert {
		rate, rateErr := services.LookupExchangeRate(ctx, h.db, h.cfg.FrankfurterURL, s.Currency, group.Currency)
		if rateErr != nil {
			continue
		}
		newAmt := int64(math.Round(float64(s.Amount) * rate))
		_, _ = h.db.NewUpdate().Model(s).
			Set("amount = ?", newAmt).
			Set("currency = ?", group.Currency).
			WherePK().Exec(ctx)
	}

	h.activity.LogExpensesConverted(ctx, userID, groupID, group.Currency, converted, skipped)
	return c.JSON(http.StatusOK, map[string]any{
		"converted": converted,
		"skipped":   skipped,
		"total":     len(expenses),
	})
}

func (h *ExpensesHandler) userNames(ctx context.Context, ids []string) map[string]string {
	if len(ids) == 0 {
		return map[string]string{}
	}
	users := make([]models.User, 0, len(ids))
	_ = h.db.NewSelect().Model(&users).Where("id IN (?)", bun.In(ids)).Scan(ctx)
	m := make(map[string]string, len(users))
	for _, u := range users {
		m[u.ID] = u.DisplayName
	}
	return m
}

func (h *ExpensesHandler) buildSplitsMeta(paidByID string, inputs []services.SplitInput, names map[string]string) []services.SplitMeta {
	splits := make([]services.SplitMeta, 0, len(inputs))
	for _, inp := range inputs {
		if inp.UserID != paidByID {
			splits = append(splits, services.SplitMeta{
				UserID: inp.UserID,
				Name:   names[inp.UserID],
				Amount: inp.Amount,
			})
		}
	}
	return splits
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
