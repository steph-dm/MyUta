// Package database opens the PostgreSQL connection pool and runs migrations.
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

const (
	maxOpenConns = 20
	maxIdleConns = 5
)

// Connect opens the pool and checks the connection.
func Connect(ctx context.Context, databaseURL string) (*bun.DB, error) {
	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(databaseURL)))
	sqldb.SetMaxOpenConns(maxOpenConns)
	sqldb.SetMaxIdleConns(maxIdleConns)
	// Short idle/lifetime limits so that connections killed by a database
	// restart or failover are dropped quickly instead of being handed out.
	sqldb.SetConnMaxIdleTime(30 * time.Second)
	sqldb.SetConnMaxLifetime(30 * time.Minute)

	db := bun.NewDB(sqldb, pgdialect.New())
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	slog.Info("database connected", "max_open_conns", maxOpenConns, "max_idle_conns", maxIdleConns)
	return db, nil
}
