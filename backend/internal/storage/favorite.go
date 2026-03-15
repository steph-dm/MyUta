package storage

import (
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/uptrace/bun"
)

type FavoriteSong struct {
	bun.BaseModel `bun:"table:favorite_songs"`

	ID        string          `bun:"id,pk"          json:"id"`
	UserID    string          `bun:"\"userId\""     json:"userId"`
	SongID    string          `bun:"\"songId\""     json:"songId"`
	CreatedAt scalar.DateTime `bun:"\"createdAt\""  json:"createdAt"`
}

type FavoriteArtist struct {
	bun.BaseModel `bun:"table:favorite_artists"`

	ID        string          `bun:"id,pk"           json:"id"`
	UserID    string          `bun:"\"userId\""      json:"userId"`
	ArtistID  string          `bun:"\"artistId\""    json:"artistId"`
	CreatedAt scalar.DateTime `bun:"\"createdAt\""   json:"createdAt"`
}
