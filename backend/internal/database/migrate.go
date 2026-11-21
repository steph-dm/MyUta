package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/lock"
)

//go:embed migrations/*.sql
var embedded embed.FS

// Migrations returns the embedded migration files.
func Migrations() fs.FS {
	sub, err := fs.Sub(embedded, "migrations")
	if err != nil {
		panic(err)
	}
	return sub
}

// newProvider builds a goose provider that takes a Postgres advisory lock, so
// several instances starting at the same time cannot run migrations twice.
func newProvider(db *sql.DB) (*goose.Provider, error) {
	locker, err := lock.NewPostgresSessionLocker()
	if err != nil {
		return nil, fmt.Errorf("migration lock: %w", err)
	}
	return goose.NewProvider(goose.DialectPostgres, db, Migrations(), goose.WithSessionLocker(locker))
}

// Migrate applies all pending migrations.
func Migrate(ctx context.Context, db *sql.DB) error {
	p, err := newProvider(db)
	if err != nil {
		return err
	}
	results, err := p.Up(ctx)
	for _, r := range results {
		slog.Info("migration applied", "version", r.Source.Version, "file", r.Source.Path, "duration", r.Duration.String())
	}
	if err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	version, err := p.GetDBVersion(ctx)
	if err != nil {
		return fmt.Errorf("read migration version: %w", err)
	}
	slog.Info("database schema up to date", "version", version)
	return nil
}

// Status lists every migration and whether it is applied.
func Status(ctx context.Context, db *sql.DB) ([]*goose.MigrationStatus, error) {
	p, err := newProvider(db)
	if err != nil {
		return nil, err
	}
	return p.Status(ctx)
}

// MigrateTo applies migrations up to and including version (used by tests
// that check data conversions).
func MigrateTo(ctx context.Context, db *sql.DB, version int64) error {
	p, err := newProvider(db)
	if err != nil {
		return err
	}
	_, err = p.UpTo(ctx, version)
	return err
}
