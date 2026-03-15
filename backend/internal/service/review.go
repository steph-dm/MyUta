package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

type reviewStore interface {
	storage.ReviewStorer
	storage.SongStorer
	storage.ArtistStorer
}

type ReviewService struct {
	store reviewStore
}

func NewReviewService(store reviewStore) *ReviewService {
	return &ReviewService{store: store}
}

func (s *ReviewService) ReviewCount(ctx context.Context, userID, songID string) (int, error) {
	return s.store.ReviewCount(ctx, userID, songID)
}

func (s *ReviewService) ReviewsByUser(ctx context.Context, userID string) ([]*storage.Review, error) {
	return s.store.ListReviewsByUser(ctx, userID)
}

func (s *ReviewService) GetReview(ctx context.Context, userID, reviewID string) (*storage.Review, error) {
	review, err := s.store.GetReview(ctx, reviewID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Review")
		}
		return nil, fmt.Errorf("can't get review: %w", err)
	}
	if review.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to view this review")
	}
	return review, nil
}

func (s *ReviewService) ListReviews(ctx context.Context, userID string) ([]*storage.Review, error) {
	return s.store.ListReviewsByUser(ctx, userID)
}

func (s *ReviewService) MyReviews(ctx context.Context, callerID, targetUserID string) ([]*storage.ReviewWithSong, error) {
	if targetUserID != callerID {
		return nil, apperror.Forbidden("Not authorized to view these reviews")
	}
	return s.store.ListReviewsWithSongByUser(ctx, targetUserID)
}

func (s *ReviewService) ReviewsBySong(ctx context.Context, userID, songID string) ([]*storage.ReviewWithSong, error) {
	return s.store.ListReviewsWithSongBySong(ctx, songID, userID)
}

func (s *ReviewService) RecentReviews(ctx context.Context, userID string, days *int) ([]*storage.ReviewWithSong, error) {
	d := 7
	if days != nil {
		d = *days
	}
	cutoff := time.Now().AddDate(0, 0, -d)
	return s.store.RecentReviewsWithSong(ctx, userID, cutoff)
}

func (s *ReviewService) SongWithReviews(ctx context.Context, userID, songID string) (*storage.Song, error) {
	song, err := s.store.GetSong(ctx, songID)
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

	reviews, err := s.store.ListReviewsWithSongBySong(ctx, songID, userID)
	if err != nil {
		return nil, fmt.Errorf("can't list reviews: %w", err)
	}
	song.LoadedReviews = reviews

	return song, nil
}

func (s *ReviewService) UpsertReview(ctx context.Context, userID string, id *string, songID string, date scalar.DateTime, score float64, machineType storage.MachineType, issues []storage.Issue, notes *string) (*storage.Review, error) {
	if err := validator.ReviewScore(score); err != nil {
		return nil, err
	}
	if _, err := validator.ReviewDate(date.Time.Format(time.RFC3339)); err != nil {
		return nil, err
	}
	if err := validator.MachineType(machineType); err != nil {
		return nil, err
	}
	if err := validator.Issues(issues); err != nil {
		return nil, err
	}
	if err := validator.Notes(notes); err != nil {
		return nil, err
	}

	notes = normalizeOptionalString(notes)
	issues = uniqueIssues(issues)

	exists, err := s.store.SongExists(ctx, songID)
	if err != nil {
		return nil, fmt.Errorf("can't check song: %w", err)
	}
	if !exists {
		return nil, apperror.NotFound("Song")
	}

	if id != nil && *id != "" {
		ownerID, err := s.store.GetReviewOwnerID(ctx, *id)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				return nil, apperror.NotFound("Review")
			}
			return nil, fmt.Errorf("can't get review owner: %w", err)
		}
		if ownerID != userID {
			return nil, apperror.Forbidden("Not authorized to update this review")
		}

		review := &storage.Review{
			ID:          *id,
			SongID:      songID,
			Date:        date,
			Score:       score,
			MachineType: machineType,
			Issues:      issues,
			Notes:       notes,
		}
		if err := s.store.UpdateReview(ctx, review); err != nil {
			return nil, fmt.Errorf("can't update review: %w", err)
		}

		return s.store.GetReview(ctx, *id)
	}

	now := scalar.Now()
	review := &storage.Review{
		ID:          uuid.NewString(),
		UserID:      userID,
		SongID:      songID,
		Date:        date,
		Score:       score,
		MachineType: machineType,
		Issues:      issues,
		Notes:       notes,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.store.CreateReview(ctx, review); err != nil {
		return nil, fmt.Errorf("can't create review: %w", err)
	}

	return s.store.GetReview(ctx, review.ID)
}

func (s *ReviewService) DeleteReview(ctx context.Context, userID, reviewID string) (*storage.Review, error) {
	review, err := s.store.GetReview(ctx, reviewID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.NotFound("Review")
		}
		return nil, fmt.Errorf("can't get review: %w", err)
	}
	if review.UserID != userID {
		return nil, apperror.Forbidden("Not authorized to delete this review")
	}

	if err := s.store.DeleteReview(ctx, reviewID); err != nil {
		return nil, fmt.Errorf("can't delete review: %w", err)
	}
	return review, nil
}

func (s *ReviewService) DeleteReviews(ctx context.Context, userID string, ids []string) (int, error) {
	found, err := s.store.VerifyReviewOwnership(ctx, ids)
	if err != nil {
		return 0, fmt.Errorf("can't verify review ownership: %w", err)
	}

	for _, id := range ids {
		uid, ok := found[id]
		if !ok {
			return 0, apperror.NotFound("Some reviews")
		}
		if uid != userID {
			return 0, apperror.Forbidden("Not authorized to delete some of these reviews")
		}
	}

	return s.store.DeleteReviewBatch(ctx, ids, userID)
}

func (s *ReviewService) DashboardStats(ctx context.Context, userID string) (*storage.DashboardStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	stats, err := s.store.GetDashboardStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("can't get dashboard stats: %w", err)
	}
	return stats, nil
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func uniqueIssues(issues []storage.Issue) []storage.Issue {
	if len(issues) == 0 {
		return []storage.Issue{}
	}

	seen := make(map[storage.Issue]struct{}, len(issues))
	result := make([]storage.Issue, 0, len(issues))
	for _, issue := range issues {
		if _, ok := seen[issue]; ok {
			continue
		}
		seen[issue] = struct{}{}
		result = append(result, issue)
	}

	return result
}
