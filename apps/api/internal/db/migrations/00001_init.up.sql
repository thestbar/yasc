CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE friendships (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, friend_id)
);

CREATE TABLE groups (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name           TEXT NOT NULL,
    image_url      TEXT,
    start_date     DATE,
    end_date       DATE,
    max_members    INT,
    simplify_debts BOOLEAN NOT NULL DEFAULT FALSE,
    default_split  TEXT NOT NULL DEFAULT 'equal' CHECK (default_split IN ('equal', 'percentage', 'exact', 'shares')),
    invite_code    TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    created_by_id  TEXT NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE TABLE expenses (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id      TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description   TEXT NOT NULL,
    amount        BIGINT NOT NULL,
    currency      TEXT NOT NULL DEFAULT 'USD',
    date          DATE NOT NULL,
    category      TEXT NOT NULL DEFAULT 'general',
    paid_by_id    TEXT NOT NULL REFERENCES users(id),
    split_type    TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact', 'shares')),
    receipt_url   TEXT,
    notes         TEXT,
    created_by_id TEXT NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_splits (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    expense_id  TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      BIGINT NOT NULL,
    percentage  DOUBLE PRECISION,
    shares      BIGINT,
    settled     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE settlements (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id     TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id TEXT NOT NULL REFERENCES users(id),
    to_user_id   TEXT NOT NULL REFERENCES users(id),
    amount       BIGINT NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'USD',
    date         DATE NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type          TEXT NOT NULL,
    actor_id      TEXT NOT NULL REFERENCES users(id),
    group_id      TEXT REFERENCES groups(id) ON DELETE CASCADE,
    expense_id    TEXT REFERENCES expenses(id) ON DELETE SET NULL,
    settlement_id TEXT REFERENCES settlements(id) ON DELETE SET NULL,
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exchange_rates (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    base_currency   TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate            DOUBLE PRECISION NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (base_currency, target_currency)
);

CREATE INDEX idx_friendships_user_id   ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_group_members_group   ON group_members(group_id);
CREATE INDEX idx_group_members_user    ON group_members(user_id);
CREATE INDEX idx_expenses_group        ON expenses(group_id);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_settlements_group     ON settlements(group_id);
CREATE INDEX idx_activity_logs_actor   ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_group   ON activity_logs(group_id);
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id);
