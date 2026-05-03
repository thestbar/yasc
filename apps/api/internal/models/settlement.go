package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Settlement struct {
	bun.BaseModel `bun:"table:settlements"`
	ID         string    `bun:"id,pk" json:"id"`
	GroupID    string    `bun:"group_id,notnull" json:"groupId"`
	FromUserID string    `bun:"from_user_id,notnull" json:"fromUserId"`
	ToUserID   string    `bun:"to_user_id,notnull" json:"toUserId"`
	Amount     int64     `bun:"amount,notnull" json:"amount"`
	Currency   string    `bun:"currency,notnull" json:"currency"`
	Date       string    `bun:"date,notnull" json:"date"`
	Notes      *string   `bun:"notes" json:"notes"`
	CreatedAt  time.Time `bun:"created_at,notnull" json:"createdAt"`

	FromUser *User `bun:"rel:belongs-to,join:from_user_id=id" json:"fromUser,omitempty"`
	ToUser   *User `bun:"rel:belongs-to,join:to_user_id=id" json:"toUser,omitempty"`
}
