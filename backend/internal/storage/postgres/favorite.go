package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

func (s *Store) ToggleFavoriteSong(ctx context.Context, userID, songID string) (bool, error) {
	fav := new(storage.FavoriteSong)
	err := s.DB.NewSelect().Model(fav).
		Where(`"userId" = ?`, userID).
		Where(`"songId" = ?`, songID).
		Scan(ctx)

	if err == nil {
		if _, err = s.DB.NewDelete().Model((*storage.FavoriteSong)(nil)).Where("id = ?", fav.ID).Exec(ctx); err != nil {
			return false, fmt.Errorf("can't delete favorite song: %w", err)
		}
		return false, nil
	}

	newFav := &storage.FavoriteSong{
		ID:        uuid.NewString(),
		UserID:    userID,
		SongID:    songID,
		CreatedAt: scalar.Now(),
	}
	if _, err = s.DB.NewInsert().Model(newFav).Exec(ctx); err != nil {
		return false, fmt.Errorf("can't create favorite song: %w", err)
	}
	return true, nil
}

func (s *Store) ListFavoriteSongs(ctx context.Context, userID string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.DB.NewSelect().Model(&songs).
		Join(`JOIN favorite_songs AS fs ON fs."songId" = song.id`).
		Where(`fs."userId" = ?`, userID).
		OrderExpr(`fs."createdAt" DESC`).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list favorite songs: %w", err)
	}
	return songs, nil
}

func (s *Store) ToggleFavoriteArtist(ctx context.Context, userID, artistID string) (bool, error) {
	fav := new(storage.FavoriteArtist)
	err := s.DB.NewSelect().Model(fav).
		Where(`"userId" = ?`, userID).
		Where(`"artistId" = ?`, artistID).
		Scan(ctx)

	if err == nil {
		if _, err = s.DB.NewDelete().Model((*storage.FavoriteArtist)(nil)).Where("id = ?", fav.ID).Exec(ctx); err != nil {
			return false, fmt.Errorf("can't delete favorite artist: %w", err)
		}
		return false, nil
	}

	newFav := &storage.FavoriteArtist{
		ID:        uuid.NewString(),
		UserID:    userID,
		ArtistID:  artistID,
		CreatedAt: scalar.Now(),
	}
	if _, err = s.DB.NewInsert().Model(newFav).Exec(ctx); err != nil {
		return false, fmt.Errorf("can't create favorite artist: %w", err)
	}
	return true, nil
}

func (s *Store) ListFavoriteArtists(ctx context.Context, userID string) ([]*storage.Artist, error) {
	var artists []*storage.Artist
	err := s.DB.NewSelect().Model(&artists).
		Join(`JOIN favorite_artists AS fa ON fa."artistId" = artist.id`).
		Where(`fa."userId" = ?`, userID).
		OrderExpr(`fa."createdAt" DESC`).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list favorite artists: %w", err)
	}
	return artists, nil
}

func (s *Store) BatchIsSongFavorited(ctx context.Context, userID string, songIDs []string) (map[string]bool, error) {
	var favSongIDs []string
	err := s.DB.NewSelect().Model((*storage.FavoriteSong)(nil)).
		ColumnExpr(`"songId"`).
		Where(`"userId" = ?`, userID).
		Where(`"songId" IN (?)`, bun.List(songIDs)).
		Scan(ctx, &favSongIDs)
	if err != nil {
		return nil, fmt.Errorf("can't check song favorites: %w", err)
	}
	result := make(map[string]bool, len(favSongIDs))
	for _, id := range favSongIDs {
		result[id] = true
	}
	return result, nil
}

func (s *Store) BatchIsArtistFavorited(ctx context.Context, userID string, artistIDs []string) (map[string]bool, error) {
	var favArtistIDs []string
	err := s.DB.NewSelect().Model((*storage.FavoriteArtist)(nil)).
		ColumnExpr(`"artistId"`).
		Where(`"userId" = ?`, userID).
		Where(`"artistId" IN (?)`, bun.List(artistIDs)).
		Scan(ctx, &favArtistIDs)
	if err != nil {
		return nil, fmt.Errorf("can't check artist favorites: %w", err)
	}
	result := make(map[string]bool, len(favArtistIDs))
	for _, id := range favArtistIDs {
		result[id] = true
	}
	return result, nil
}
