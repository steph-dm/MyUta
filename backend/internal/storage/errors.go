package storage

import (
	"database/sql"
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func NotFoundError(entity string) error {
	return fmt.Errorf("%s: %w", entity, ErrNotFound)
}

func WrapNotFound(err error, entity string) error {
	if errors.Is(err, sql.ErrNoRows) {
		return NotFoundError(entity)
	}
	return fmt.Errorf("can't get %s: %w", entity, err)
}
