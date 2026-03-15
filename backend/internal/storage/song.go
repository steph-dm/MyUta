package storage

import (
	"context"

	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/uptrace/bun"
)

type Song struct {
	bun.BaseModel `bun:"table:songs"`

	ID               string          `bun:"id,pk"                   json:"id"`
	Title            string          `bun:"title"                   json:"title"`
	ArtistID         string          `bun:"\"artistId\""            json:"artistId"`
	UserID           string          `bun:"\"userId\""              json:"-"`
	Genres           []Genre         `bun:"genres,array"            json:"genres"`
	YouTubeURL       *string         `bun:"\"youtubeUrl\""          json:"youtubeUrl"`
	GeneratedYoutube bool            `bun:"\"generatedYoutube\""    json:"generatedYoutube"`
	CreatedAt        scalar.DateTime `bun:"\"createdAt\""           json:"createdAt"`
	UpdatedAt        scalar.DateTime `bun:"\"updatedAt\""           json:"updatedAt"`

	// Pre-loaded relations.
	LoadedArtist  *Artist           `bun:"-" json:"-"`
	LoadedReviews []*ReviewWithSong `bun:"-" json:"-"`
	ReviewCount   *int              `bun:"-" json:"-"`
}

var _ bun.AfterScanRowHook = (*Song)(nil)

func (s *Song) AfterScanRow(_ context.Context) error {
	if s.Genres == nil {
		s.Genres = []Genre{}
	}
	return nil
}
