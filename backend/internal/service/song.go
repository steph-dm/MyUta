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

type SongService struct {
	store storage.Storer
}

func NewSongService(store storage.Storer) *SongService {
	return &SongService{store: store}
}

func (s *SongService) GetSong(ctx context.Context, userID, id string) (*storage.Song, error) {
	song, err := s.store.GetSong(ctx, id)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Song")
		}
		return nil, fmt.Errorf("can't get song: %w", err)
	}
	if song.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to view this song")
	}

	artist, err := s.store.GetArtist(ctx, song.ArtistID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Artist")
		}
		return nil, fmt.Errorf("can't get artist: %w", err)
	}
	song.LoadedArtist = artist

	reviews, err := s.store.ListReviewsWithSongBySong(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("can't list reviews: %w", err)
	}
	song.LoadedReviews = reviews

	count, err := s.store.ReviewCount(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("can't count reviews: %w", err)
	}
	song.ReviewCount = &count

	return song, nil
}

func (s *SongService) ListSongs(ctx context.Context, userID string, take, skip *int) ([]*storage.Song, error) {
	songs, err := s.store.ListSongs(ctx, userID, take, skip)
	if err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}
	if err := s.attachArtistsToSongs(ctx, songs); err != nil {
		return nil, fmt.Errorf("can't attach artists: %w", err)
	}
	return songs, nil
}

func (s *SongService) ListByArtist(ctx context.Context, userID, artistID string) ([]*storage.Song, error) {
	songs, err := s.store.ListSongsByArtist(ctx, userID, artistID)
	if err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}
	if err := s.attachArtistsToSongs(ctx, songs); err != nil {
		return nil, fmt.Errorf("can't attach artists: %w", err)
	}
	return songs, nil
}

func (s *SongService) CountByArtist(ctx context.Context, userID, artistID string) (int, error) {
	return s.store.CountSongsByArtist(ctx, userID, artistID)
}

func (s *SongService) UpsertSong(ctx context.Context, userID string, id *string, title, artistID string, genres []storage.Genre, youtubeURL *string, generatedYoutube *bool) (*storage.Song, error) {
	cleanTitle := strings.TrimSpace(title)
	if err := validator.SongTitle(cleanTitle); err != nil {
		return nil, err
	}
	if err := validator.Genres(genres); err != nil {
		return nil, err
	}
	if err := validator.YouTubeURL(youtubeURL); err != nil {
		return nil, err
	}
	if _, err := s.store.GetArtist(ctx, artistID); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Artist")
		}
		return nil, fmt.Errorf("can't get artist: %w", err)
	}
	if youtubeURL != nil {
		trimmedURL := strings.TrimSpace(*youtubeURL)
		if trimmedURL == "" {
			youtubeURL = nil
		} else {
			youtubeURL = &trimmedURL
		}
	}

	genreStrings := make([]string, len(genres))
	for i, g := range genres {
		genreStrings[i] = string(g)
	}

	genYT := false
	if generatedYoutube != nil {
		genYT = *generatedYoutube
	}

	if id != nil {
		existing, err := s.store.GetSong(ctx, *id)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, apperror.NotFound("Song")
			}
			return nil, fmt.Errorf("can't get song: %w", err)
		}
		if existing.UserID != userID {
			return nil, apperror.Forbidden("Not authorized to update this song")
		}

		oldArtistID := existing.ArtistID

		existing.Title = cleanTitle
		existing.ArtistID = artistID
		existing.Genres = genres
		existing.YouTubeURL = youtubeURL
		existing.GeneratedYoutube = genYT

		if err := s.store.UpdateSong(ctx, existing); err != nil {
			return nil, fmt.Errorf("can't update song: %w", err)
		}

		if oldArtistID != artistID {
			songs, err := s.store.ListSongsByArtist(ctx, userID, oldArtistID)
			if err == nil && len(songs) == 0 {
				_ = s.store.DeleteArtist(ctx, oldArtistID)
			}
		}

		return s.GetSong(ctx, userID, *id)
	}

	// Check for existing match by title.
	existingSong, err := s.findExistingSong(ctx, userID, artistID, cleanTitle)
	if err != nil {
		return nil, fmt.Errorf("can't find existing song: %w", err)
	}

	if existingSong != nil {
		updateYT := youtubeURL
		updateGenYT := genYT
		if existingSong.YouTubeURL != nil && youtubeURL == nil {
			updateYT = existingSong.YouTubeURL
			updateGenYT = existingSong.GeneratedYoutube
		}

		existingGenres := make([]string, len(existingSong.Genres))
		for i, g := range existingSong.Genres {
			existingGenres[i] = string(g)
		}
		mergedGenres := mergeStringSlice(existingGenres, genreStrings)

		if err := s.store.UpdateSongFields(ctx, existingSong.ID, mergedGenres, updateYT, updateGenYT); err != nil {
			return nil, fmt.Errorf("can't update song fields: %w", err)
		}

		return s.GetSong(ctx, userID, existingSong.ID)
	}

	song := &storage.Song{
		ID:               uuid.NewString(),
		Title:            cleanTitle,
		ArtistID:         artistID,
		UserID:           userID,
		Genres:           genres,
		YouTubeURL:       youtubeURL,
		GeneratedYoutube: genYT,
		CreatedAt:        scalar.Now(),
		UpdatedAt:        scalar.Now(),
	}

	if err := s.store.CreateSong(ctx, song); err != nil {
		return nil, fmt.Errorf("can't create song: %w", err)
	}

	return s.GetSong(ctx, userID, song.ID)
}

func (s *SongService) findExistingSong(ctx context.Context, userID, artistID, title string) (*storage.Song, error) {
	artistSongs, err := s.store.ListSongsByArtist(ctx, userID, artistID)
	if err != nil {
		return nil, fmt.Errorf("can't list songs: %w", err)
	}

	lowerTitle := strings.ToLower(title)

	for _, song := range artistSongs {
		if strings.ToLower(song.Title) == lowerTitle {
			return song, nil
		}
	}

	return nil, nil
}

func (s *SongService) DeleteSong(ctx context.Context, userID, id string) (*storage.Song, error) {
	song, err := s.store.GetSong(ctx, id)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Song")
		}
		return nil, fmt.Errorf("can't get song: %w", err)
	}
	if song.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to delete this song")
	}

	artistID := song.ArtistID

	if err := s.store.DeleteSong(ctx, id); err != nil {
		return nil, fmt.Errorf("can't delete song: %w", err)
	}

	remaining, err := s.store.ListSongsByArtist(ctx, userID, artistID)
	if err == nil && len(remaining) == 0 {
		_ = s.store.DeleteArtist(ctx, artistID)
	}

	return song, nil
}

func (s *SongService) ToggleFavorite(ctx context.Context, userID, songID string) (bool, error) {
	exists, err := s.store.SongExists(ctx, songID)
	if err != nil {
		return false, fmt.Errorf("can't check song: %w", err)
	}
	if !exists {
		return false, apperror.NotFound("Song")
	}
	return s.store.ToggleFavoriteSong(ctx, userID, songID)
}

func (s *SongService) MyFavorites(ctx context.Context, userID string) ([]*storage.Song, error) {
	songs, err := s.store.ListFavoriteSongs(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("can't list favorite songs: %w", err)
	}
	if err := s.attachArtistsToSongs(ctx, songs); err != nil {
		return nil, fmt.Errorf("can't attach artists: %w", err)
	}
	return songs, nil
}

func (s *SongService) attachArtistsToSongs(ctx context.Context, songs []*storage.Song) error {
	if len(songs) == 0 {
		return nil
	}

	artistIDs := make([]string, 0, len(songs))
	seen := make(map[string]bool)
	for _, song := range songs {
		if !seen[song.ArtistID] {
			artistIDs = append(artistIDs, song.ArtistID)
			seen[song.ArtistID] = true
		}
	}

	artists, err := s.store.MultiGetArtists(ctx, artistIDs)
	if err != nil {
		return fmt.Errorf("can't get artists: %w", err)
	}

	artistMap := make(map[string]*storage.Artist, len(artists))
	for _, a := range artists {
		artistMap[a.ID] = a
	}

	for _, song := range songs {
		song.LoadedArtist = artistMap[song.ArtistID]
	}

	return nil
}

func mergeStringSlice(existing, incoming []string) []string {
	set := make(map[string]bool)
	for _, s := range existing {
		set[s] = true
	}
	merged := make([]string, len(existing))
	copy(merged, existing)
	for _, s := range incoming {
		if !set[s] {
			merged = append(merged, s)
			set[s] = true
		}
	}
	return merged
}
