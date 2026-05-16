package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Expense struct {
	bun.BaseModel `bun:"table:expenses"`
	ID           string    `bun:"id,pk" json:"id"`
	GroupID      string    `bun:"group_id,notnull" json:"groupId"`
	Description  string    `bun:"description,notnull" json:"description"`
	Amount       int64     `bun:"amount,notnull" json:"amount"`
	Currency     string    `bun:"currency,notnull" json:"currency"`
	Date         string    `bun:"date,notnull" json:"date"`
	Category     string    `bun:"category,notnull" json:"category"`
	PaidByID     string    `bun:"paid_by_id,notnull" json:"paidById"`
	SplitType    string    `bun:"split_type,notnull" json:"splitType"`
	ReceiptURL       *string  `bun:"receipt_url" json:"receiptUrl"`
	Notes            *string  `bun:"notes" json:"notes"`
	OriginalCurrency *string  `bun:"original_currency" json:"originalCurrency"`
	OriginalAmount   *int64   `bun:"original_amount" json:"originalAmount"`
	ExchangeRate     *float64 `bun:"exchange_rate" json:"exchangeRate"`
	CreatedByID  string    `bun:"created_by_id,notnull" json:"createdById"`
	CreatedAt    time.Time `bun:"created_at,notnull" json:"createdAt"`
	UpdatedAt    time.Time `bun:"updated_at,notnull" json:"updatedAt"`

	PaidBy *User          `bun:"rel:belongs-to,join:paid_by_id=id" json:"paidBy,omitempty"`
	Splits []*ExpenseSplit `bun:"rel:has-many,join:id=expense_id" json:"splits,omitempty"`
}

type ExpenseSplit struct {
	bun.BaseModel `bun:"table:expense_splits"`
	ID         string   `bun:"id,pk" json:"id"`
	ExpenseID  string   `bun:"expense_id,notnull" json:"expenseId"`
	UserID     string   `bun:"user_id,notnull" json:"userId"`
	Amount     int64    `bun:"amount,notnull" json:"amount"`
	Percentage *float64 `bun:"percentage" json:"percentage"`
	Shares     *int64   `bun:"shares" json:"shares"`
	Settled    bool     `bun:"settled,notnull" json:"settled"`

	User *User `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
}
