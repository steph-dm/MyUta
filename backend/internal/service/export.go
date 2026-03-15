package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

type exportStore interface {
	storage.ExportStorer
	storage.UserStorer
	storage.ArtistStorer
	storage.SongStorer
	storage.ReviewStorer
	storage.FavoriteStorer
}

type ExportService struct {
	store exportStore
}

func NewExportService(store exportStore) *ExportService {
	return &ExportService{store: store}
}

func (s *ExportService) ExportData(ctx context.Context, userID string) (string, error) {
	g, gCtx := errgroup.WithContext(ctx)

	type userProfile struct {
		Name        *string `json:"name"`
		Birthdate   string  `json:"birthdate"`
		MachineType any     `json:"defaultMachineType"`
		CreatedAt   string  `json:"createdAt"`
	}

	var profile userProfile
	var reviews []*storage.ExportReview
	var favorites []*storage.ExportFavorite
	var favoriteArtistNames []string

	g.Go(func() error {
		user, err := s.store.GetUser(gCtx, userID)
		if err != nil {
			return fmt.Errorf("can't get user: %w", err)
		}
		profile = userProfile{
			Name:        user.Name,
			Birthdate:   user.Birthdate.Format(time.RFC3339),
			MachineType: user.DefaultMachineType,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		}
		return nil
	})

	g.Go(func() error {
		var err error
		reviews, err = s.store.ExportReviews(gCtx, userID)
		if err != nil {
			return fmt.Errorf("can't export reviews: %w", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		favorites, err = s.store.ExportFavoriteSongs(gCtx, userID)
		if err != nil {
			return fmt.Errorf("can't export favorite songs: %w", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		favoriteArtistNames, err = s.store.ExportFavoriteArtistNames(gCtx, userID)
		if err != nil {
			return fmt.Errorf("can't export favorite artists: %w", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return "", err
	}

	export := map[string]any{
		"exportedAt":      time.Now().Format(time.RFC3339),
		"profile":         profile,
		"reviews":         reviews,
		"favorites":       favorites,
		"favoriteArtists": favoriteArtistNames,
	}

	data, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", fmt.Errorf("can't marshal export data: %w", err)
	}
	return string(data), nil
}

func (s *ExportService) ImportData(ctx context.Context, userID, jsonData string) (*storage.ImportResult, error) {
	var raw struct {
		Reviews         []*storage.ExportReview   `json:"reviews"`
		Favorites       []*storage.ExportFavorite `json:"favorites"`
		FavoriteArtists []string                  `json:"favoriteArtists"`
	}
	if err := json.Unmarshal([]byte(jsonData), &raw); err != nil {
		return nil, fmt.Errorf("can't parse import data: %w", err)
	}

	result := &storage.ImportResult{}

	artistCache := map[string]string{}
	songCache := map[string]string{}

	resolveArtist := func(name string) (string, error) {
		trimmedName := strings.TrimSpace(name)
		if err := validator.ArtistName(trimmedName); err != nil {
			return "", err
		}

		key := strings.ToLower(trimmedName)
		if id, ok := artistCache[key]; ok {
			return id, nil
		}

		artist, err := s.store.GetArtistByName(ctx, userID, trimmedName)
		if err != nil && !errors.Is(err, storage.ErrNotFound) {
			return "", fmt.Errorf("can't get artist %q: %w", trimmedName, err)
		}
		if artist != nil {
			artistCache[key] = artist.ID
			return artist.ID, nil
		}

		now := scalar.Now()
		newArtist := &storage.Artist{
			ID:        uuid.NewString(),
			Name:      trimmedName,
			UserID:    userID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := s.store.CreateArtist(ctx, newArtist); err != nil {
			return "", fmt.Errorf("can't create artist %q: %w", trimmedName, err)
		}
		artistCache[key] = newArtist.ID
		return newArtist.ID, nil
	}

	resolveSong := func(title, artistName string, genres []string, youtubeURL *string) (string, error) {
		trimmedTitle := strings.TrimSpace(title)
		if err := validator.SongTitle(trimmedTitle); err != nil {
			return "", err
		}

		artistID, err := resolveArtist(artistName)
		if err != nil {
			return "", err
		}

		cacheKey := strings.ToLower(trimmedTitle) + "|" + artistID
		if id, ok := songCache[cacheKey]; ok {
			return id, nil
		}

		existing, err := s.store.GetSongByTitleAndArtist(ctx, userID, trimmedTitle, artistID)
		if err != nil {
			return "", fmt.Errorf("can't get song %q: %w", trimmedTitle, err)
		}
		if existing != nil {
			songCache[cacheKey] = existing.ID
			return existing.ID, nil
		}

		genreTypes := make([]storage.Genre, len(genres))
		for i, g := range genres {
			genreTypes[i] = storage.Genre(g)
		}
		if err := validator.Genres(genreTypes); err != nil {
			return "", err
		}

		now := scalar.Now()
		newSong := &storage.Song{
			ID:        uuid.NewString(),
			Title:     trimmedTitle,
			ArtistID:  artistID,
			UserID:    userID,
			Genres:    genreTypes,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if youtubeURL != nil {
			trimmedURL := strings.TrimSpace(*youtubeURL)
			if trimmedURL != "" {
				newSong.YouTubeURL = &trimmedURL
			}
		}
		if err := s.store.CreateSong(ctx, newSong); err != nil {
			return "", fmt.Errorf("can't create song %q: %w", trimmedTitle, err)
		}
		songCache[cacheKey] = newSong.ID
		return newSong.ID, nil
	}

	for i, r := range raw.Reviews {
		songID, err := resolveSong(r.Song, r.Artist, r.Genres, r.YouTubeURL)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}

		date, err := validator.ReviewDate(r.Date)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}

		mt := storage.MachineType(r.MachineType)
		if err := validator.ReviewScore(r.Score); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}
		if err := validator.MachineType(mt); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}

		issues := make([]storage.Issue, 0, len(r.Issues))
		for _, is := range r.Issues {
			issues = append(issues, storage.Issue(is))
		}
		if err := validator.Issues(issues); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}
		if err := validator.Notes(r.Notes); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}

		now := scalar.Now()

		review := &storage.Review{
			ID:          uuid.NewString(),
			SongID:      songID,
			UserID:      userID,
			Score:       r.Score,
			Date:        scalar.FromTime(date),
			MachineType: mt,
			Issues:      issues,
			Notes:       r.Notes,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if err := s.store.CreateReview(ctx, review); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("review %d: %s", i+1, err))
			result.ReviewsSkipped++
			continue
		}
		result.ReviewsImported++
	}

	for _, f := range raw.Favorites {
		songID, err := resolveSong(f.Song, f.Artist, f.Genres, f.YouTubeURL)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("favorite %q: %s", f.Song, err))
			continue
		}

		favMap, err := s.store.BatchIsSongFavorited(ctx, userID, []string{songID})
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("favorite %q: %s", f.Song, err))
			continue
		}
		if !favMap[songID] {
			if _, err := s.store.ToggleFavoriteSong(ctx, userID, songID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("favorite %q: %s", f.Song, err))
			}
		}
	}

	for _, artistName := range raw.FavoriteArtists {
		artistID, err := resolveArtist(artistName)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("favorite artist %q: %s", artistName, err))
			continue
		}

		favMap, err := s.store.BatchIsArtistFavorited(ctx, userID, []string{artistID})
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("favorite artist %q: %s", artistName, err))
			continue
		}
		if !favMap[artistID] {
			if _, err := s.store.ToggleFavoriteArtist(ctx, userID, artistID); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("favorite artist %q: %s", artistName, err))
			}
		}
	}

	return result, nil
}
