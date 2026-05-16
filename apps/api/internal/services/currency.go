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

	// Fetch from Frankfurter
	url := fmt.Sprintf("%s/latest?from=%s&to=%s", frankfurterURL, from, to)
	resp, err := http.Get(url) //nolint:gosec
	if err == nil {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var result struct {
			Rates map[string]float64 `json:"rates"`
		}
		if json.Unmarshal(body, &result) == nil {
			if r, ok := result.Rates[to]; ok {
				row := &models.ExchangeRate{
					ID:             uuid.New().String(),
					BaseCurrency:   from,
					TargetCurrency: to,
					Rate:           r,
					FetchedAt:      time.Now(),
				}
				_, _ = db.NewInsert().Model(row).
					On("CONFLICT (base_currency, target_currency) DO UPDATE").
					Set("rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at").
					Exec(ctx)
				return r, nil
			}
		}
	}

	if cacheErr == nil {
		return cached.Rate, nil
	}
	return 0, fmt.Errorf("no exchange rate available for %s → %s", from, to)
}
