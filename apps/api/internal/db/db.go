package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"github.com/thestbar/yasc/api/internal/config"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bundebug"
	"github.com/uptrace/bun/migrate"
)

func Connect(cfg *config.Config) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(cfg.DatabaseURL)))

	db := bun.NewDB(sqldb, pgdialect.New())

	if cfg.Env == "development" {
		db.AddQueryHook(bundebug.NewQueryHook(bundebug.WithVerbose(false)))
	}

	if err := db.PingContext(context.Background()); err != nil {
		return nil, fmt.Errorf("db ping: %w", err)
	}

	return db, nil
}

func RunMigrations(ctx context.Context, db *bun.DB) error {
	migrator := migrate.NewMigrator(db, Migrations)

	if err := migrator.Init(ctx); err != nil {
		return fmt.Errorf("migrator init: %w", err)
	}

	group, err := migrator.Migrate(ctx)
	if err != nil {
		return fmt.Errorf("migration run: %w", err)
	}

	if group.IsZero() {
		log.Println("db: no new migrations")
	} else {
		log.Printf("db: migrated to %s", group)
	}

	return nil
}
