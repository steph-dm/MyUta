package postgres

import (
	"context"
	"database/sql"

	"github.com/uptrace/bun"
)

type Store struct {
	DB *bun.DB
}

func NewStore(db *bun.DB) *Store {
	return &Store{DB: db}
}

func (s *Store) RunInTx(ctx context.Context, fn func(ctx context.Context, tx bun.Tx) error) error {
	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}

	var done bool
	defer func() {
		if !done {
			_ = tx.Rollback()
		}
	}()

	if err := fn(ctx, tx); err != nil {
		return err
	}

	done = true
	return tx.Commit()
}
