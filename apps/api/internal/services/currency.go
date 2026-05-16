package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

func fetchFrankfurter(baseURL, from, to string) (float64, error) {
	url := fmt.Sprintf("%s/latest?from=%s&to=%s", baseURL, from, to)
	resp, err := httpClient.Get(url) //nolint:gosec
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("frankfurter: status %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Rates map[string]float64 `json:"rates"`
	}
	if json.Unmarshal(body, &result) == nil {
		if r, ok := result.Rates[to]; ok {
			return r, nil
		}
	}
	return 0, fmt.Errorf("frankfurter: rate not found for %s/%s", from, to)
}

func fetchOpenER(from, to string) (float64, error) {
	url := fmt.Sprintf("https://open.er-api.com/v6/latest/%s", from)
	resp, err := httpClient.Get(url) //nolint:gosec
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Result string             `json:"result"`
		Rates  map[string]float64 `json:"rates"`
	}
	if json.Unmarshal(body, &result) == nil && result.Result == "success" {
		if r, ok := result.Rates[to]; ok {
			return r, nil
		}
	}
	return 0, fmt.Errorf("open.er-api: rate not found for %s/%s", from, to)
}

func cacheRate(ctx context.Context, db *bun.DB, from, to string, rate float64) {
	row := &models.ExchangeRate{
		ID:             uuid.New().String(),
		BaseCurrency:   from,
		TargetCurrency: to,
		Rate:           rate,
		FetchedAt:      time.Now(),
	}
	_, _ = db.NewInsert().Model(row).
		On("CONFLICT (base_currency, target_currency) DO UPDATE").
		Set("rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at").
		Exec(ctx)
}

// LookupExchangeRate returns the rate to convert `from` currency to `to`.
// Tries the DB cache first (accepts up to 25h stale). On cache miss/expiry,
// fetches from Frankfurter and upserts. Falls back to a stale DB value if the
// network call fails.
func LookupExchangeRate(ctx context.Context, db *bun.DB, frankfurterURL, from, to string) (float64, error) {
	if from == to {
		return 1.0, nil
	}

	cached := &models.ExchangeRate{}
	cacheErr := db.NewSelect().Model(cached).
		Where("base_currency = ? AND target_currency = ?", from, to).
		Scan(ctx)

	if cacheErr == nil && time.Since(cached.FetchedAt) < 25*time.Hour {
		return cached.Rate, nil
	}

	if r, fetchErr := fetchFrankfurter(frankfurterURL, from, to); fetchErr == nil {
		cacheRate(ctx, db, from, to, r)
		return r, nil
	}

	// Frankfurter doesn't cover all currencies (e.g. AMD); fall back to open.er-api.com
	if r, fetchErr := fetchOpenER(from, to); fetchErr == nil {
		cacheRate(ctx, db, from, to, r)
		return r, nil
	}

	if cacheErr == nil {
		return cached.Rate, nil
	}
	return 0, fmt.Errorf("no exchange rate available for %s → %s", from, to)
}
