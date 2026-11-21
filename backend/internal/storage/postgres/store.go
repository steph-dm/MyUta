// Package postgres implements storage.Store on PostgreSQL with bun.
package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/driver/pgdriver"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

// Store implements storage.Store. It works on the database or on a transaction.
type Store struct {
	db   bun.IDB
	root *bun.DB
}

var _ storage.Store = (*Store)(nil)

func New(db *bun.DB) *Store { return &Store{db: db, root: db} }

// InTx runs fn inside a transaction. Nested calls reuse the outer transaction.
func (s *Store) InTx(ctx context.Context, fn func(tx storage.Store) error) error {
	if _, ok := s.db.(bun.Tx); ok {
		return fn(s)
	}
	err := s.root.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		return fn(&Store{db: tx, root: s.root})
	})
	return classify(err)
}

func (s *Store) Ping(ctx context.Context) error {
	return classify(s.root.PingContext(ctx))
}

// classify converts driver errors into storage errors. Errors that already are
// storage or application errors pass through unchanged.
func classify(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return storage.ErrNotFound
	}
	var pgErr pgdriver.Error
	if errors.As(err, &pgErr) {
		code := pgErr.Field('C')
		switch {
		case code == "23505": // unique_violation
			return &storage.ConflictError{Constraint: pgErr.Field('n')}
		case code == "22P02", code == "23503": // invalid uuid text, FK to a row the user does not own
			return storage.ErrNotFound
		case strings.HasPrefix(code, "08"), code == "57P01", code == "57P02", code == "57P03":
			return fmt.Errorf("%w: %w", storage.ErrUnavailable, err)
		}
		return err
	}
	var netErr net.Error
	if errors.As(err, &netErr) || errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return fmt.Errorf("%w: %w", storage.ErrUnavailable, err)
	}
	return err
}

// likePattern turns user search text into an ILIKE pattern on normalised keys.
func likePattern(key string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(key) + "%"
}
