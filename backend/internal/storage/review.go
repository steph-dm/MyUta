package storage

import (
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/uptrace/bun"
)

type Review struct {
	bun.BaseModel `bun:"table:reviews"`

	ID          string          `bun:"id,pk"                json:"id"`
	Date        scalar.DateTime `bun:"date"                 json:"date"`
	UserID      string          `bun:"\"userId\""           json:"userId"`
	SongID      string          `bun:"\"songId\""           json:"songId"`
	Score       float64         `bun:"score"                json:"score"`
	MachineType MachineType     `bun:"\"machineType\""      json:"machineType"`
	Issues      []Issue         `bun:"issues,array"         json:"issues"`
	Notes       *string         `bun:"notes"                json:"notes"`
	CreatedAt   scalar.DateTime `bun:"\"createdAt\""        json:"createdAt"`
	UpdatedAt   scalar.DateTime `bun:"\"updatedAt\""        json:"updatedAt"`

	// Pre-loaded relation.
	LoadedUser *User `bun:"-" json:"-"`
}

type ReviewWithSong struct {
	bun.BaseModel `bun:"table:reviews"`

	ID          string          `bun:"id,pk"                json:"id"`
	Date        scalar.DateTime `bun:"date"                 json:"date"`
	UserID      string          `bun:"\"userId\""           json:"-"`
	SongID      string          `bun:"\"songId\""           json:"-"`
	Score       float64         `bun:"score"                json:"score"`
	MachineType MachineType     `bun:"\"machineType\""      json:"machineType"`
	Issues      []Issue         `bun:"issues,array"         json:"issues"`
	Notes       *string         `bun:"notes"                json:"notes"`
	CreatedAt   scalar.DateTime `bun:"\"createdAt\""        json:"createdAt"`
	UpdatedAt   scalar.DateTime `bun:"\"updatedAt\""        json:"updatedAt"`

	// Pre-loaded relations.
	LoadedUser *User `bun:"-" json:"-"`
	LoadedSong *Song `bun:"-" json:"-"`
}
