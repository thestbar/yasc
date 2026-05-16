package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Group struct {
	bun.BaseModel `bun:"table:groups"`
	ID            string    `bun:"id,pk" json:"id"`
	Name          string    `bun:"name,notnull" json:"name"`
	Description   *string   `bun:"description" json:"description"`
	Currency      string    `bun:"currency,notnull" json:"currency"`
	ImageURL      *string   `bun:"image_url" json:"imageUrl"`
	StartDate     *string   `bun:"start_date" json:"startDate"`
	EndDate       *string   `bun:"end_date" json:"endDate"`
	MaxMembers    *int      `bun:"max_members" json:"maxMembers"`
	SimplifyDebts         bool      `bun:"simplify_debts,notnull" json:"simplifyDebts"`
	ConsolidateCurrencies bool      `bun:"consolidate_currencies,notnull" json:"consolidateCurrencies"`
	DefaultSplit  string    `bun:"default_split,notnull" json:"defaultSplit"`
	InviteCode    string    `bun:"invite_code,notnull" json:"inviteCode"`
	CreatedByID   string    `bun:"created_by_id,notnull" json:"createdById"`
	CreatedAt     time.Time `bun:"created_at,notnull" json:"createdAt"`
	UpdatedAt     time.Time `bun:"updated_at,notnull" json:"updatedAt"`

	Members []*GroupMember `bun:"rel:has-many,join:id=group_id" json:"members,omitempty"`
}

type GroupMember struct {
	bun.BaseModel `bun:"table:group_members"`
	ID       string    `bun:"id,pk" json:"id"`
	GroupID  string    `bun:"group_id,notnull" json:"groupId"`
	UserID   string    `bun:"user_id,notnull" json:"userId"`
	Role     string    `bun:"role,notnull" json:"role"`
	JoinedAt time.Time `bun:"joined_at,notnull" json:"joinedAt"`

	User *User `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
}
