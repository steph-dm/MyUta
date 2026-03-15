package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

type ArtistService struct {
	store storage.Storer
}

func NewArtistService(store storage.Storer) *ArtistService {
	return &ArtistService{store: store}
}

func (s *ArtistService) GetArtist(ctx context.Context, id string) (*storage.Artist, error) {
	artist, err := s.store.GetArtist(ctx, id)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Artist")
		}
		return nil, fmt.Errorf("can't get artist: %w", err)
	}
	return artist, nil
}

func (s *ArtistService) GetArtistWithSongs(ctx context.Context, userID, id string) (*storage.Artist, error) {
	artist, err := s.GetArtist(ctx, id)
	if err != nil {
		return nil, err
	}
	if artist.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to view this artist")
	}

	songs, err := s.store.ListSongsByArtist(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}
	artist.LoadedSongs = songs

	count := len(songs)
	artist.SongCount = &count

	return artist, nil
}

func (s *ArtistService) ListArtists(ctx context.Context, userID string, take, skip *int) ([]*storage.Artist, error) {
	artists, err := s.store.ListArtists(ctx, userID, take, skip)
	if err != nil {
		return nil, fmt.Errorf("can't list artists: %w", err)
	}
	if err := s.attachSongsToArtists(ctx, userID, artists); err != nil {
		return nil, fmt.Errorf("can't attach songs: %w", err)
	}
	return artists, nil
}

func (s *ArtistService) UpsertArtist(ctx context.Context, userID, name string) (*storage.Artist, error) {
	cleanName := strings.TrimSpace(name)
	if err := validator.ArtistName(cleanName); err != nil {
		return nil, err
	}

	existing, err := s.store.GetArtistByName(ctx, userID, cleanName)
	if err != nil {
		return nil, fmt.Errorf("can't find artist by name: %w", err)
	}

	if existing != nil {
		return s.GetArtistWithSongs(ctx, userID, existing.ID)
	}

	artist := &storage.Artist{
		ID:        uuid.NewString(),
		Name:      cleanName,
		UserID:    userID,
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}

	if err := s.store.CreateArtist(ctx, artist); err != nil {
		return nil, fmt.Errorf("can't create artist: %w", err)
	}

	return s.GetArtistWithSongs(ctx, userID, artist.ID)
}

func (s *ArtistService) UpdateArtist(ctx context.Context, userID, id, name string) (*storage.Artist, error) {
	cleanName := strings.TrimSpace(name)
	if err := validator.ArtistName(cleanName); err != nil {
		return nil, err
	}

	artist, err := s.GetArtist(ctx, id)
	if err != nil {
		return nil, err
	}
	if artist.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to update this artist")
	}

	artist.Name = cleanName
	if err := s.store.UpdateArtist(ctx, artist); err != nil {
		return nil, fmt.Errorf("can't update artist: %w", err)
	}

	return s.GetArtistWithSongs(ctx, userID, id)
}

func (s *ArtistService) DeleteArtist(ctx context.Context, userID, id string) (*storage.Artist, error) {
	artist, err := s.GetArtist(ctx, id)
	if err != nil {
		return nil, err
	}
	if artist.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to delete this artist")
	}

	songs, err := s.store.ListSongsByArtist(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}
	if len(songs) > 0 {
		return nil, fmt.Errorf("can't delete artist with %d songs", len(songs))
	}

	if err := s.store.DeleteArtist(ctx, id); err != nil {
		return nil, fmt.Errorf("can't delete artist: %w", err)
	}

	return artist, nil
}

func (s *ArtistService) ToggleFavorite(ctx context.Context, userID, artistID string) (bool, error) {
	if _, err := s.GetArtist(ctx, artistID); err != nil {
		return false, err
	}
	return s.store.ToggleFavoriteArtist(ctx, userID, artistID)
}

func (s *ArtistService) MyFavoriteArtists(ctx context.Context, userID string) ([]*storage.Artist, error) {
	artists, err := s.store.ListFavoriteArtists(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("can't list favorite artists: %w", err)
	}
	if err := s.attachSongsToArtists(ctx, userID, artists); err != nil {
		return nil, fmt.Errorf("can't attach songs: %w", err)
	}
	return artists, nil
}

func (s *ArtistService) attachSongsToArtists(ctx context.Context, userID string, artists []*storage.Artist) error {
	if len(artists) == 0 {
		return nil
	}

	artistIDs := make([]string, len(artists))
	for i, a := range artists {
		artistIDs[i] = a.ID
	}

	songs, err := s.store.ListSongsByArtistIDs(ctx, userID, artistIDs)
	if err != nil {
		return fmt.Errorf("can't list songs by artist ids: %w", err)
	}

	songMap := make(map[string][]*storage.Song)
	for _, song := range songs {
		songMap[song.ArtistID] = append(songMap[song.ArtistID], song)
	}

	for _, artist := range artists {
		artist.LoadedSongs = songMap[artist.ID]
		count := len(artist.LoadedSongs)
		artist.SongCount = &count
	}

	return nil
}
