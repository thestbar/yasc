package models

import (
	"time"

	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users"`
	ID            string    `bun:"id,pk" json:"id"`
	Email         string    `bun:"email,notnull" json:"email"`
	Username      string    `bun:"username,notnull" json:"username"`
	DisplayName   string    `bun:"display_name,notnull" json:"displayName"`
	PasswordHash  string    `bun:"password_hash,notnull" json:"-"`
	AvatarURL     *string   `bun:"avatar_url" json:"avatarUrl"`
	CreatedAt     time.Time `bun:"created_at,notnull" json:"createdAt"`
	UpdatedAt     time.Time `bun:"updated_at,notnull" json:"updatedAt"`
}

type Friendship struct {
	bun.BaseModel `bun:"table:friendships"`
	ID        string    `bun:"id,pk" json:"id"`
	UserID    string    `bun:"user_id,notnull" json:"userId"`
	FriendID  string    `bun:"friend_id,notnull" json:"friendId"`
	Status    string    `bun:"status,notnull" json:"status"`
	CreatedAt time.Time `bun:"created_at,notnull" json:"createdAt"`

	User   *User `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
	Friend *User `bun:"rel:belongs-to,join:friend_id=id" json:"friend,omitempty"`
}

type RefreshToken struct {
	bun.BaseModel `bun:"table:refresh_tokens"`
	ID        string    `bun:"id,pk"`
	UserID    string    `bun:"user_id,notnull"`
	TokenHash string    `bun:"token_hash,notnull"`
	ExpiresAt time.Time `bun:"expires_at,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull"`
}

type PasswordResetToken struct {
	bun.BaseModel `bun:"table:password_reset_tokens"`
	ID        string    `bun:"id,pk"`
	UserID    string    `bun:"user_id,notnull"`
	TokenHash string    `bun:"token_hash,notnull"`
	ExpiresAt time.Time `bun:"expires_at,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull"`
}
