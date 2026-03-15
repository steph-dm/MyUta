package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

func (s *Store) ExportReviews(ctx context.Context, userID string) ([]*storage.ExportReview, error) {
	type row struct {
		Date        time.Time `bun:"date"`
		Score       float64   `bun:"score"`
		MachineType string    `bun:"machineType"`
		Issues      []string  `bun:"issues,array"`
		Notes       *string   `bun:"notes"`
		Song        string    `bun:"title"`
		Genres      []string  `bun:"genres,array"`
		YouTubeURL  *string   `bun:"youtubeUrl"`
		Artist      string    `bun:"name"`
	}

	var rows []row
	err := s.DB.NewSelect().
		TableExpr("reviews AS r").
		ColumnExpr("r.date").
		ColumnExpr("r.score").
		ColumnExpr(`r."machineType"::text`).
		ColumnExpr("r.issues::text[]").
		ColumnExpr("r.notes").
		ColumnExpr("s.title").
		ColumnExpr("s.genres::text[]").
		ColumnExpr(`s."youtubeUrl"`).
		ColumnExpr("a.name").
		Join(`JOIN songs AS s ON r."songId" = s.id`).
		Join(`JOIN artists AS a ON s."artistId" = a.id`).
		Where(`r."userId" = ?`, userID).
		OrderExpr("r.date DESC").
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("can't export reviews: %w", err)
	}

	reviews := make([]*storage.ExportReview, len(rows))
	for i, row := range rows {
		reviews[i] = &storage.ExportReview{
			Date:        row.Date.Format(time.RFC3339),
			Score:       row.Score,
			MachineType: row.MachineType,
			Issues:      row.Issues,
			Notes:       row.Notes,
			Song:        row.Song,
			Artist:      row.Artist,
			Genres:      row.Genres,
			YouTubeURL:  row.YouTubeURL,
		}
	}
	return reviews, nil
}

func (s *Store) ExportFavoriteSongs(ctx context.Context, userID string) ([]*storage.ExportFavorite, error) {
	type row struct {
		Song       string   `bun:"title"`
		Artist     string   `bun:"name"`
		Genres     []string `bun:"genres,array"`
		YouTubeURL *string  `bun:"youtubeUrl"`
	}

	var rows []row
	err := s.DB.NewSelect().
		TableExpr("favorite_songs AS fs").
		ColumnExpr("s.title").
		ColumnExpr("a.name").
		ColumnExpr("s.genres::text[]").
		ColumnExpr(`s."youtubeUrl"`).
		Join(`JOIN songs AS s ON fs."songId" = s.id`).
		Join(`JOIN artists AS a ON s."artistId" = a.id`).
		Where(`fs."userId" = ?`, userID).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("can't export favorite songs: %w", err)
	}

	favorites := make([]*storage.ExportFavorite, len(rows))
	for i, row := range rows {
		favorites[i] = &storage.ExportFavorite{
			Song:       row.Song,
			Artist:     row.Artist,
			Genres:     row.Genres,
			YouTubeURL: row.YouTubeURL,
		}
	}
	return favorites, nil
}

func (s *Store) ExportFavoriteArtistNames(ctx context.Context, userID string) ([]string, error) {
	var names []string
	err := s.DB.NewSelect().
		TableExpr("favorite_artists AS fa").
		ColumnExpr("a.name").
		Join(`JOIN artists AS a ON fa."artistId" = a.id`).
		Where(`fa."userId" = ?`, userID).
		Scan(ctx, &names)
	if err != nil {
		return nil, fmt.Errorf("can't export favorite artist names: %w", err)
	}
	return names, nil
}
