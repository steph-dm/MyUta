package service

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/validator"
)

// ReviewService records and lists takes.
type ReviewService struct{ d Deps }

// ReviewInput is one take. Date is a calendar day (midnight UTC).
type ReviewInput struct {
	Date        time.Time
	Score       float64
	MachineType domain.MachineType
	KeyChange   int
	Variant     *string
	Issues      []domain.Issue
	Notes       *string
	Details     *domain.ScoreDetails
}

// apply validates the input and copies it onto r.
func (in ReviewInput) apply(r *storage.Review, now time.Time) error {
	if err := validator.PerformedOn(in.Date, now); err != nil {
		return err
	}
	score, err := validator.Score(in.Score)
	if err != nil {
		return err
	}
	if err := validator.MachineType(in.MachineType, "machineType"); err != nil {
		return err
	}
	if err := validator.KeyChange(in.KeyChange); err != nil {
		return err
	}
	variant, err := validator.Variant(in.Variant)
	if err != nil {
		return err
	}
	issues, err := validator.Issues(in.Issues)
	if err != nil {
		return err
	}
	notes, err := validator.Notes(in.Notes)
	if err != nil {
		return err
	}
	details, err := validator.Details(in.Details)
	if err != nil {
		return err
	}
	r.PerformedOn, r.Score, r.MachineType, r.KeyChange = in.Date, score, in.MachineType, in.KeyChange
	r.Variant, r.Issues, r.Notes, r.Details = variant, issues, notes, details
	return nil
}

// SongRef points at an existing song (SongID) or describes one by artist
// name and title. A described song is reused when it exists (genres and link
// are only filled in if they were empty) and created otherwise.
type SongRef struct {
	SongID *string
	Song   *SongInput
}

// LogReview records a take, creating the artist and song when needed, all in
// one transaction: either everything is saved or nothing is.
func (s *ReviewService) LogReview(ctx context.Context, ref SongRef, in ReviewInput) (*storage.Review, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	r := &storage.Review{ID: uuid.NewString(), UserID: id.UserID}
	if err := in.apply(r, s.d.Now()); err != nil {
		return nil, err
	}
	var song *cleanSong
	switch {
	case ref.SongID != nil:
		if err := validID(*ref.SongID, "Song"); err != nil {
			return nil, err
		}
	case ref.Song != nil:
		if song, err = ref.Song.clean(); err != nil {
			return nil, err
		}
	default:
		return nil, apperror.BadInput(apperror.ReasonSongRequired, "song", "Choose a song")
	}

	err = s.d.Store.InTx(ctx, func(tx storage.Store) error {
		if ref.SongID != nil {
			if _, err := tx.GetSong(ctx, id.UserID, *ref.SongID); err != nil {
				return notFound(err, "Song")
			}
			r.SongID = *ref.SongID
		} else {
			songID, err := ensureSong(ctx, tx, id.UserID, song)
			if err != nil {
				return err
			}
			r.SongID = songID
		}
		return tx.CreateReview(ctx, r)
	})
	if err != nil {
		return nil, err
	}
	return r, nil
}

// ensureSong finds the song by artist and normalised title or creates it.
func ensureSong(ctx context.Context, tx storage.Store, userID string, c *cleanSong) (string, error) {
	artist, err := tx.EnsureArtist(ctx, userID, c.artist)
	if err != nil {
		return "", err
	}
	existing, err := tx.FindSong(ctx, userID, artist.ID, c.title)
	switch {
	case err == nil:
		changed := false
		if len(existing.Genres) == 0 && len(c.genres) > 0 {
			existing.Genres, changed = c.genres, true
		}
		if existing.YouTubeURL == nil && c.url != nil {
			existing.YouTubeURL, existing.GeneratedYoutube, changed = c.url, c.generated, true
		}
		if changed {
			if err := tx.UpdateSong(ctx, existing); err != nil {
				return "", err
			}
		}
		return existing.ID, nil
	case errors.Is(err, storage.ErrNotFound):
		song := &storage.Song{
			ID: uuid.NewString(), UserID: userID, ArtistID: artist.ID, Title: c.title,
			Genres: c.genres, YouTubeURL: c.url, GeneratedYoutube: c.generated,
		}
		if err := tx.CreateSong(ctx, song); err != nil {
			if storage.IsConflict(err, storage.ConstraintSongTitle) { // created concurrently
				again, ferr := tx.FindSong(ctx, userID, artist.ID, c.title)
				if ferr != nil {
					return "", ferr
				}
				return again.ID, nil
			}
			return "", err
		}
		return song.ID, nil
	default:
		return "", err
	}
}

// UpdateReview changes a take. The song stays the same.
func (s *ReviewService) UpdateReview(ctx context.Context, reviewID string, in ReviewInput) (*storage.Review, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(reviewID, "Review"); err != nil {
		return nil, err
	}
	r, err := s.d.Store.GetReview(ctx, id.UserID, reviewID)
	if err != nil {
		return nil, notFound(err, "Review")
	}
	if err := in.apply(r, s.d.Now()); err != nil {
		return nil, err
	}
	if err := s.d.Store.UpdateReview(ctx, r); err != nil {
		return nil, notFound(err, "Review")
	}
	return r, nil
}

// GetReview returns nil when it does not exist.
func (s *ReviewService) GetReview(ctx context.Context, reviewID string) (*storage.Review, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if !validator.IsUUID(reviewID) {
		return nil, nil
	}
	r, err := s.d.Store.GetReview(ctx, id.UserID, reviewID)
	if errors.Is(err, storage.ErrNotFound) {
		return nil, nil
	}
	return r, err
}

// DeleteReviews deletes the caller's reviews among ids and returns how many
// were deleted. Ids that do not exist are ignored.
func (s *ReviewService) DeleteReviews(ctx context.Context, ids []string) (int, error) {
	id, err := caller(ctx)
	if err != nil {
		return 0, err
	}
	if err := validator.IDs(ids); err != nil {
		return 0, err
	}
	valid := slices.DeleteFunc(slices.Clone(ids), func(x string) bool { return !validator.IsUUID(x) })
	if len(valid) == 0 {
		return 0, nil
	}
	return s.d.Store.DeleteReviews(ctx, id.UserID, valid)
}

func (s *ReviewService) ListReviews(ctx context.Context, f storage.ReviewFilter, sort storage.ReviewSort, p storage.Page) ([]*storage.Review, int, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, 0, err
	}
	if err := validator.Page(p.Limit, p.Offset); err != nil {
		return nil, 0, err
	}
	for _, ref := range []*string{f.SongID, f.ArtistID} {
		if ref != nil && !validator.IsUUID(*ref) {
			return []*storage.Review{}, 0, nil
		}
	}
	if f.MachineType != nil {
		if err := validator.MachineType(*f.MachineType, "machineType"); err != nil {
			return nil, 0, err
		}
	}
	return s.d.Store.ListReviews(ctx, id.UserID, f, sort, p)
}

func (s *ReviewService) DashboardStats(ctx context.Context) (*storage.DashboardStats, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return s.d.Store.DashboardStats(ctx, id.UserID)
}
