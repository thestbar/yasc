package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/robfig/cron/v3"
	"github.com/thestbar/yasc/api/internal/config"
	"github.com/thestbar/yasc/api/internal/models"
	"github.com/uptrace/bun"
)

type CurrencyHandler struct {
	db  *bun.DB
	cfg *config.Config
}

func NewCurrencyHandler(db *bun.DB, cfg *config.Config) *CurrencyHandler {
	return &CurrencyHandler{db: db, cfg: cfg}
}

func (h *CurrencyHandler) Rates(c echo.Context) error {
	base := c.QueryParam("base")
	if base == "" {
		base = "USD"
	}
	ctx := c.Request().Context()

	var rates []models.ExchangeRate
	_ = h.db.NewSelect().Model(&rates).Where("base_currency = ?", base).Scan(ctx)

	stale := len(rates) == 0
	if !stale {
		for _, r := range rates {
			if time.Since(r.FetchedAt) > 24*time.Hour {
				stale = true
				break
			}
		}
	}

	if stale {
		fetched, err := h.fetchFromFrankfurter(base)
		if err != nil {
			log.Printf("currency: fetch error: %v", err)
			if len(rates) > 0 {
				return c.JSON(http.StatusOK, ratesToMap(rates))
			}
			return internalError(c)
		}
		h.upsertRates(ctx, base, fetched)
		return c.JSON(http.StatusOK, fetched)
	}

	return c.JSON(http.StatusOK, ratesToMap(rates))
}

func (h *CurrencyHandler) StartScheduler() {
	cr := cron.New(cron.WithLocation(time.UTC))
	_, _ = cr.AddFunc("0 16 * * *", func() {
		ctx := context.Background()
		for _, base := range []string{"USD", "EUR", "GBP"} {
			fetched, err := h.fetchFromFrankfurter(base)
			if err != nil {
				log.Printf("currency scheduler: fetch %s: %v", base, err)
				continue
			}
			h.upsertRates(ctx, base, fetched)
			log.Printf("currency scheduler: updated %s rates", base)
		}
	})
	cr.Start()
}

func (h *CurrencyHandler) fetchFromFrankfurter(base string) (map[string]float64, error) {
	url := fmt.Sprintf("%s/latest?from=%s", h.cfg.FrankfurterURL, base)
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	result.Rates[base] = 1.0
	return result.Rates, nil
}

func (h *CurrencyHandler) upsertRates(ctx context.Context, base string, rates map[string]float64) {
	now := time.Now()
	for target, rate := range rates {
		row := &models.ExchangeRate{
			ID:             uuid.New().String(),
			BaseCurrency:   base,
			TargetCurrency: target,
			Rate:           rate,
			FetchedAt:      now,
		}
		_, _ = h.db.NewInsert().Model(row).
			On("CONFLICT (base_currency, target_currency) DO UPDATE").
			Set("rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at").
			Exec(ctx)
	}
}

func ratesToMap(rates []models.ExchangeRate) map[string]float64 {
	m := make(map[string]float64, len(rates))
	for _, r := range rates {
		m[r.TargetCurrency] = r.Rate
	}
	return m
}
