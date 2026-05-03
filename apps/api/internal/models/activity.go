package models

import (
	"time"

	"github.com/uptrace/bun"
)

type ActivityLog struct {
	bun.BaseModel `bun:"table:activity_logs"`
	ID           string         `bun:"id,pk" json:"id"`
	Type         string         `bun:"type,notnull" json:"type"`
	ActorID      string         `bun:"actor_id,notnull" json:"actorId"`
	GroupID      *string        `bun:"group_id" json:"groupId"`
	ExpenseID    *string        `bun:"expense_id" json:"expenseId"`
	SettlementID *string        `bun:"settlement_id" json:"settlementId"`
	Metadata     map[string]any `bun:"metadata,type:jsonb" json:"metadata"`
	CreatedAt    time.Time      `bun:"created_at,notnull" json:"createdAt"`

	Actor *User   `bun:"rel:belongs-to,join:actor_id=id" json:"actor,omitempty"`
	Group *Group  `bun:"rel:belongs-to,join:group_id=id" json:"group,omitempty"`
}

type ExchangeRate struct {
	bun.BaseModel  `bun:"table:exchange_rates"`
	ID             string    `bun:"id,pk" json:"id"`
	BaseCurrency   string    `bun:"base_currency,notnull" json:"baseCurrency"`
	TargetCurrency string    `bun:"target_currency,notnull" json:"targetCurrency"`
	Rate           float64   `bun:"rate,notnull" json:"rate"`
	FetchedAt      time.Time `bun:"fetched_at,notnull" json:"fetchedAt"`
}
