package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

func (s *Store) GetSong(ctx context.Context, id string) (*storage.Song, error) {
	song := new(storage.Song)
	err := s.DB.NewSelect().Model(song).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, storage.WrapNotFound(err, "song")
	}
	return song, nil
}

func (s *Store) GetSongByTitleAndArtist(ctx context.Context, userID, title, artistID string) (*storage.Song, error) {
	song := new(storage.Song)
	err := s.DB.NewSelect().Model(song).
		Where(`"userId" = ?`, userID).
		Where("LOWER(title) = LOWER(?)", title).
		Where(`"artistId" = ?`, artistID).
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("can't get song by title and artist: %w", err)
	}
	return song, nil
}

func (s *Store) CreateSong(ctx context.Context, song *storage.Song) error {
	if _, err := s.DB.NewInsert().Model(song).Exec(ctx); err != nil {
		return fmt.Errorf("can't create song: %w", err)
	}
	return nil
}

func (s *Store) UpdateSong(ctx context.Context, song *storage.Song) error {
	if _, err := s.DB.NewUpdate().Model((*storage.Song)(nil)).
		Set("title = ?", song.Title).
		Set(`"artistId" = ?`, song.ArtistID).
		Set("genres = ?::text[]", pgdialect.Array(song.Genres)).
		Set(`"youtubeUrl" = ?`, song.YouTubeURL).
		Set(`"generatedYoutube" = ?`, song.GeneratedYoutube).
		Set(`"updatedAt" = NOW()`).
		Where("id = ?", song.ID).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update song: %w", err)
	}
	return nil
}

func (s *Store) UpdateSongFields(ctx context.Context, id string, genres []string, youtubeURL *string, generatedYT bool) error {
	if _, err := s.DB.NewUpdate().Model((*storage.Song)(nil)).
		Set("genres = ?::text[]", pgdialect.Array(genres)).
		Set(`"youtubeUrl" = ?`, youtubeURL).
		Set(`"generatedYoutube" = ?`, generatedYT).
		Set(`"updatedAt" = NOW()`).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update song fields: %w", err)
	}
	return nil
}

func (s *Store) DeleteSong(ctx context.Context, id string) error {
	if _, err := s.DB.NewDelete().Model((*storage.Song)(nil)).Where("id = ?", id).Exec(ctx); err != nil {
		return fmt.Errorf("can't delete song: %w", err)
	}
	return nil
}

func (s *Store) GetSongArtistID(ctx context.Context, songID string) (string, error) {
	var artistID string
	err := s.DB.NewSelect().Model((*storage.Song)(nil)).
		ColumnExpr(`"artistId"`).
		Where("id = ?", songID).
		Scan(ctx, &artistID)
	if err != nil {
		return "", fmt.Errorf("can't get song artist id: %w", err)
	}
	return artistID, nil
}

func (s *Store) ListSongsByArtist(ctx context.Context, userID, artistID string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.DB.NewSelect().Model(&songs).
		Where(`"userId" = ?`, userID).
		Where(`"artistId" = ?`, artistID).
		OrderExpr("title ASC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list songs by artist: %w", err)
	}
	return songs, nil
}

func (s *Store) ListSongsByArtistIDs(ctx context.Context, userID string, artistIDs []string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.DB.NewSelect().Model(&songs).
		Where(`"userId" = ?`, userID).
		Where(`"artistId" IN (?)`, bun.List(artistIDs)).
		OrderExpr("title ASC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list songs by artist ids: %w", err)
	}
	return songs, nil
}

func (s *Store) ListSongs(ctx context.Context, userID string, take, skip *int) ([]*storage.Song, error) {
	var songs []*storage.Song
	q := s.DB.NewSelect().Model(&songs).
		Where(`id IN (SELECT DISTINCT "songId" FROM reviews WHERE "userId" = ?)`, userID).
		OrderExpr("title ASC")
	if take != nil {
		q = q.Limit(*take)
	}
	if skip != nil {
		q = q.Offset(*skip)
	}
	if err := q.Scan(ctx); err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}
	return songs, nil
}

func (s *Store) CountSongsByArtist(ctx context.Context, userID, artistID string) (int, error) {
	n, err := s.DB.NewSelect().Model((*storage.Song)(nil)).
		Where(`"artistId" = ?`, artistID).
		Where(`"userId" = ?`, userID).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("can't count songs by artist: %w", err)
	}
	return n, nil
}

func (s *Store) SongExists(ctx context.Context, songID string) (bool, error) {
	ok, err := s.DB.NewSelect().Model((*storage.Song)(nil)).
		Where("id = ?", songID).
		Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("can't check song exists: %w", err)
	}
	return ok, nil
}

func (s *Store) BatchReviewCounts(ctx context.Context, songIDs []string) (map[string]int, error) {
	type countRow struct {
		SongID string `bun:"songId"`
		Count  int    `bun:"count"`
	}
	var rows []countRow
	err := s.DB.NewSelect().
		TableExpr("reviews").
		ColumnExpr(`"songId"`).
		ColumnExpr("COUNT(*) AS count").
		Where(`"songId" IN (?)`, bun.List(songIDs)).
		GroupExpr(`"songId"`).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("can't batch review counts: %w", err)
	}
	result := make(map[string]int, len(rows))
	for _, row := range rows {
		result[row.SongID] = row.Count
	}
	return result, nil
}
