package storage

import (
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/uptrace/bun"
)

type Artist struct {
	bun.BaseModel `bun:"table:artists"`

	ID        string          `bun:"id,pk"         json:"id"`
	Name      string          `bun:"name"          json:"name"`
	UserID    string          `bun:"\"userId\""     json:"-"`
	CreatedAt scalar.DateTime `bun:"\"createdAt\"" json:"createdAt"`
	UpdatedAt scalar.DateTime `bun:"\"updatedAt\"" json:"updatedAt"`

	// Loaded by service layer.
	LoadedSongs []*Song `bun:"-" json:"-"`
	SongCount   *int    `bun:"-" json:"-"`
}
