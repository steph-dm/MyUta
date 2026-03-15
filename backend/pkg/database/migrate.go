package database

import (
	"context"
	"embed"
	"fmt"
	"log/slog"

	"github.com/pressly/goose/v3"
	"github.com/uptrace/bun"
)

//go:embed migrations/*.sql
var migrations embed.FS

func Migrate(ctx context.Context, db *bun.DB) error {
	goose.SetBaseFS(migrations)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("can't set goose dialect: %w", err)
	}

	if err := goose.UpContext(ctx, db.DB, "migrations"); err != nil {
		return fmt.Errorf("can't run migrations: %w", err)
	}

	version, err := goose.GetDBVersionContext(ctx, db.DB)
	if err != nil {
		return fmt.Errorf("can't get migration version: %w", err)
	}

	slog.Info("database migration complete", "version", version)
	return nil
}
