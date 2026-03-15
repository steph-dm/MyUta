package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/uptrace/bun"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

func (s *Store) GetArtist(ctx context.Context, id string) (*storage.Artist, error) {
	artist := new(storage.Artist)
	err := s.DB.NewSelect().Model(artist).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, storage.WrapNotFound(err, "artist")
	}
	return artist, nil
}

func (s *Store) GetArtistByName(ctx context.Context, userID, name string) (*storage.Artist, error) {
	artist := new(storage.Artist)
	err := s.DB.NewSelect().
		Model(artist).
		Where("LOWER(name) = LOWER(?)", name).
		Where(`"userId" = ?`, userID).
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, storage.WrapNotFound(err, "artist")
	}
	return artist, nil
}

func (s *Store) CreateArtist(ctx context.Context, artist *storage.Artist) error {
	if _, err := s.DB.NewInsert().Model(artist).Exec(ctx); err != nil {
		return fmt.Errorf("can't create artist: %w", err)
	}
	return nil
}

func (s *Store) UpdateArtist(ctx context.Context, artist *storage.Artist) error {
	if _, err := s.DB.NewUpdate().Model((*storage.Artist)(nil)).
		Set("name = ?", artist.Name).
		Set(`"updatedAt" = NOW()`).
		Where("id = ?", artist.ID).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update artist: %w", err)
	}
	return nil
}

func (s *Store) DeleteArtist(ctx context.Context, id string) error {
	if _, err := s.DB.NewDelete().Model((*storage.Artist)(nil)).Where("id = ?", id).Exec(ctx); err != nil {
		return fmt.Errorf("can't delete artist: %w", err)
	}
	return nil
}

func (s *Store) ListArtists(ctx context.Context, userID string, take, skip *int) ([]*storage.Artist, error) {
	var artists []*storage.Artist
	q := s.DB.NewSelect().Model(&artists).
		Where(`id IN (SELECT DISTINCT a.id FROM artists a JOIN songs s ON s."artistId" = a.id JOIN reviews r ON r."songId" = s.id WHERE r."userId" = ?)`, userID).
		OrderExpr("name ASC")
	if take != nil {
		q = q.Limit(*take)
	}
	if skip != nil {
		q = q.Offset(*skip)
	}
	if err := q.Scan(ctx); err != nil {
		return nil, fmt.Errorf("can't list artists: %w", err)
	}
	return artists, nil
}

func (s *Store) MultiGetArtists(ctx context.Context, ids []string) ([]*storage.Artist, error) {
	var artists []*storage.Artist
	err := s.DB.NewSelect().Model(&artists).
		Where("id IN (?)", bun.List(ids)).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't get artists: %w", err)
	}
	return artists, nil
}
