package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

func Connect(ctx context.Context, databaseURL string) (*bun.DB, error) {
	connector := pgdriver.NewConnector(pgdriver.WithDSN(databaseURL))
	sqldb := sql.OpenDB(connector)

	sqldb.SetMaxOpenConns(20)
	sqldb.SetMaxIdleConns(5)
	sqldb.SetConnMaxIdleTime(5 * time.Minute)
	sqldb.SetConnMaxLifetime(time.Hour)

	db := bun.NewDB(sqldb, pgdialect.New())

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("can't connect to database: %w", err)
	}

	slog.Info("database connected",
		"max_open_conns", 20,
		"max_idle_conns", 5,
	)

	return db, nil
}
