package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

type mockReviewStore struct {
	reviews   map[string]*storage.Review
	songs     map[string]*storage.Song
	artists   map[string]*storage.Artist
	ownership map[string]string // reviewID -> userID

	dashStats *storage.DashboardStats

	getReviewErr error
	createErr    error
	deleteErr    error
	statsErr     error
}

func newMockReviewStore() *mockReviewStore {
	return &mockReviewStore{
		reviews:   make(map[string]*storage.Review),
		songs:     make(map[string]*storage.Song),
		artists:   make(map[string]*storage.Artist),
		ownership: make(map[string]string),
	}
}

// --- ReviewStorer ---

func (m *mockReviewStore) GetReview(_ context.Context, id string) (*storage.Review, error) {
	if m.getReviewErr != nil {
		return nil, m.getReviewErr
	}
	r, ok := m.reviews[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return r, nil
}

func (m *mockReviewStore) CreateReview(_ context.Context, r *storage.Review) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.reviews[r.ID] = r
	m.ownership[r.ID] = r.UserID
	return nil
}

func (m *mockReviewStore) UpdateReview(_ context.Context, r *storage.Review) error {
	m.reviews[r.ID] = r
	return nil
}

func (m *mockReviewStore) DeleteReview(_ context.Context, id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	delete(m.reviews, id)
	return nil
}

func (m *mockReviewStore) DeleteReviewBatch(_ context.Context, ids []string, _ string) (int, error) {
	for _, id := range ids {
		delete(m.reviews, id)
	}
	return len(ids), nil
}

func (m *mockReviewStore) GetReviewOwnerID(_ context.Context, reviewID string) (string, error) {
	uid, ok := m.ownership[reviewID]
	if !ok {
		return "", storage.ErrNotFound
	}
	return uid, nil
}

func (m *mockReviewStore) VerifyReviewOwnership(_ context.Context, ids []string) (map[string]string, error) {
	result := make(map[string]string)
	for _, id := range ids {
		if uid, ok := m.ownership[id]; ok {
			result[id] = uid
		}
	}
	return result, nil
}

func (m *mockReviewStore) ListReviewsByUser(_ context.Context, _ string) ([]*storage.Review, error) {
	return nil, nil
}

func (m *mockReviewStore) ReviewCount(_ context.Context, _, _ string) (int, error) {
	return 0, nil
}

func (m *mockReviewStore) ListReviewsWithSongByUser(_ context.Context, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}

func (m *mockReviewStore) ListReviewsWithSongBySong(_ context.Context, _, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}

func (m *mockReviewStore) RecentReviewsWithSong(_ context.Context, _ string, _ time.Time) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}

func (m *mockReviewStore) GetDashboardStats(_ context.Context, _ string) (*storage.DashboardStats, error) {
	if m.statsErr != nil {
		return nil, m.statsErr
	}
	if m.dashStats != nil {
		return m.dashStats, nil
	}
	return &storage.DashboardStats{}, nil
}

// --- SongStorer ---

func (m *mockReviewStore) GetSong(_ context.Context, id string) (*storage.Song, error) {
	s, ok := m.songs[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return s, nil
}

func (m *mockReviewStore) GetSongByTitleAndArtist(_ context.Context, _, _, _ string) (*storage.Song, error) {
	return nil, nil
}

func (m *mockReviewStore) SongExists(_ context.Context, songID string) (bool, error) {
	_, ok := m.songs[songID]
	return ok, nil
}

func (m *mockReviewStore) CreateSong(_ context.Context, _ *storage.Song) error { return nil }
func (m *mockReviewStore) UpdateSong(_ context.Context, _ *storage.Song) error { return nil }
func (m *mockReviewStore) UpdateSongFields(_ context.Context, _ string, _ []string, _ *string, _ bool) error {
	return nil
}
func (m *mockReviewStore) DeleteSong(_ context.Context, _ string) error { return nil }
func (m *mockReviewStore) GetSongArtistID(_ context.Context, _ string) (string, error) {
	return "", nil
}
func (m *mockReviewStore) ListSongsByArtist(_ context.Context, _, _ string) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockReviewStore) ListSongsByArtistIDs(_ context.Context, _ string, _ []string) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockReviewStore) ListSongs(_ context.Context, _ string, _, _ *int) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockReviewStore) CountSongsByArtist(_ context.Context, _, _ string) (int, error) {
	return 0, nil
}
func (m *mockReviewStore) BatchReviewCounts(_ context.Context, _ []string) (map[string]int, error) {
	return nil, nil
}

// --- ArtistStorer ---

func (m *mockReviewStore) GetArtist(_ context.Context, id string) (*storage.Artist, error) {
	a, ok := m.artists[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return a, nil
}

func (m *mockReviewStore) GetArtistByName(_ context.Context, _, _ string) (*storage.Artist, error) {
	return nil, nil
}
func (m *mockReviewStore) CreateArtist(_ context.Context, _ *storage.Artist) error { return nil }
func (m *mockReviewStore) UpdateArtist(_ context.Context, _ *storage.Artist) error { return nil }
func (m *mockReviewStore) DeleteArtist(_ context.Context, _ string) error          { return nil }
func (m *mockReviewStore) ListArtists(_ context.Context, _ string, _, _ *int) ([]*storage.Artist, error) {
	return nil, nil
}
func (m *mockReviewStore) MultiGetArtists(_ context.Context, _ []string) ([]*storage.Artist, error) {
	return nil, nil
}

// --- Helpers ---

func seedReview(store *mockReviewStore, id, userID, songID string, score float64) *storage.Review {
	r := &storage.Review{
		ID:          id,
		UserID:      userID,
		SongID:      songID,
		Date:        scalar.Now(),
		Score:       score,
		MachineType: storage.MachineTypeDAM,
		Issues:      []storage.Issue{},
		CreatedAt:   scalar.Now(),
		UpdatedAt:   scalar.Now(),
	}
	store.reviews[id] = r
	store.ownership[id] = userID
	return r
}

// --- Tests ---

func TestGetReview(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		revID   string
		setup   func(*mockReviewStore)
		wantErr bool
	}{
		{
			name:   "own review",
			userID: "u1",
			revID:  "r1",
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 85.5)
			},
		},
		{
			name:   "other user's review",
			userID: "u2",
			revID:  "r1",
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 85.5)
			},
			wantErr: true,
		},
		{
			name:    "nonexistent review",
			userID:  "u1",
			revID:   "nope",
			setup:   func(_ *mockReviewStore) {},
			wantErr: true,
		},
		{
			name:   "store error",
			userID: "u1",
			revID:  "r1",
			setup: func(s *mockReviewStore) {
				s.getReviewErr = errors.New("db down")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockReviewStore()
			tt.setup(store)
			svc := service.NewReviewService(store)

			got, err := svc.GetReview(context.Background(), tt.userID, tt.revID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.ID != tt.revID {
				t.Errorf("got review ID %q, want %q", got.ID, tt.revID)
			}
		})
	}
}

func TestDeleteReview(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		revID   string
		setup   func(*mockReviewStore)
		wantErr bool
	}{
		{
			name:   "delete own review",
			userID: "u1",
			revID:  "r1",
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 90)
			},
		},
		{
			name:   "can't delete other user's review",
			userID: "u2",
			revID:  "r1",
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 90)
			},
			wantErr: true,
		},
		{
			name:    "nonexistent review",
			userID:  "u1",
			revID:   "nope",
			setup:   func(_ *mockReviewStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockReviewStore()
			tt.setup(store)
			svc := service.NewReviewService(store)

			deleted, err := svc.DeleteReview(context.Background(), tt.userID, tt.revID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if deleted.ID != tt.revID {
				t.Errorf("deleted review ID %q, want %q", deleted.ID, tt.revID)
			}
		})
	}
}

func TestDeleteReviews_Batch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		ids     []string
		setup   func(*mockReviewStore)
		wantN   int
		wantErr bool
	}{
		{
			name:   "delete own reviews",
			userID: "u1",
			ids:    []string{"r1", "r2"},
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 80)
				seedReview(s, "r2", "u1", "s1", 85)
			},
			wantN: 2,
		},
		{
			name:   "mixed ownership",
			userID: "u1",
			ids:    []string{"r1", "r2"},
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 80)
				seedReview(s, "r2", "u2", "s1", 85)
			},
			wantErr: true,
		},
		{
			name:   "unknown review in batch",
			userID: "u1",
			ids:    []string{"r1", "missing"},
			setup: func(s *mockReviewStore) {
				seedReview(s, "r1", "u1", "s1", 80)
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockReviewStore()
			tt.setup(store)
			svc := service.NewReviewService(store)

			n, err := svc.DeleteReviews(context.Background(), tt.userID, tt.ids)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if n != tt.wantN {
				t.Errorf("deleted %d reviews, want %d", n, tt.wantN)
			}
		})
	}
}

func TestMyReviews(t *testing.T) {
	t.Parallel()

	t.Run("own reviews", func(t *testing.T) {
		t.Parallel()
		store := newMockReviewStore()
		svc := service.NewReviewService(store)

		_, err := svc.MyReviews(context.Background(), "u1", "u1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("other user's reviews", func(t *testing.T) {
		t.Parallel()
		store := newMockReviewStore()
		svc := service.NewReviewService(store)

		_, err := svc.MyReviews(context.Background(), "u1", "u2")
		if err == nil {
			t.Fatal("expected error when requesting another user's reviews")
		}
	})
}

func TestDashboardStats(t *testing.T) {
	t.Parallel()

	t.Run("returns stats", func(t *testing.T) {
		t.Parallel()
		store := newMockReviewStore()
		avg := 88.5
		store.dashStats = &storage.DashboardStats{
			TotalReviews: 42,
			DAMAvgScore:  &avg,
		}
		svc := service.NewReviewService(store)

		stats, err := svc.DashboardStats(context.Background(), "u1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if stats.TotalReviews != 42 {
			t.Errorf("got %d total reviews, want 42", stats.TotalReviews)
		}
	})

	t.Run("store error", func(t *testing.T) {
		t.Parallel()
		store := newMockReviewStore()
		store.statsErr = errors.New("timeout")
		svc := service.NewReviewService(store)

		_, err := svc.DashboardStats(context.Background(), "u1")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestRecentReviews_DefaultDays(t *testing.T) {
	t.Parallel()

	store := newMockReviewStore()
	svc := service.NewReviewService(store)

	_, err := svc.RecentReviews(context.Background(), "u1", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
