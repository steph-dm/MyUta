package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

type mockExportStore struct {
	user            *storage.User
	reviews         []*storage.ExportReview
	favorites       []*storage.ExportFavorite
	favoriteArtists []string

	songs         map[string]*storage.Song
	artists       map[string]*storage.Artist
	artistsByName map[string]*storage.Artist

	songsByTitleArtist map[string]*storage.Song
	createdReviews     []*storage.Review

	songFavMap   map[string]bool
	artistFavMap map[string]bool

	getUserErr error
	createErr  error
}

func newMockExportStore() *mockExportStore {
	return &mockExportStore{
		songs:              make(map[string]*storage.Song),
		artists:            make(map[string]*storage.Artist),
		artistsByName:      make(map[string]*storage.Artist),
		songsByTitleArtist: make(map[string]*storage.Song),
		songFavMap:         make(map[string]bool),
		artistFavMap:       make(map[string]bool),
	}
}

func (m *mockExportStore) ExportReviews(_ context.Context, _ string) ([]*storage.ExportReview, error) {
	return m.reviews, nil
}

func (m *mockExportStore) ExportFavoriteSongs(_ context.Context, _ string) ([]*storage.ExportFavorite, error) {
	return m.favorites, nil
}

func (m *mockExportStore) ExportFavoriteArtistNames(_ context.Context, _ string) ([]string, error) {
	return m.favoriteArtists, nil
}

func (m *mockExportStore) GetUser(_ context.Context, _ string) (*storage.User, error) {
	if m.getUserErr != nil {
		return nil, m.getUserErr
	}
	if m.user != nil {
		return m.user, nil
	}
	return nil, storage.ErrNotFound
}

func (m *mockExportStore) GetUserByEmail(_ context.Context, _ string) (*storage.User, error) {
	return nil, storage.ErrNotFound
}
func (m *mockExportStore) EmailExists(_ context.Context, _ string, _ ...string) (bool, error) {
	return false, nil
}
func (m *mockExportStore) NameExists(_ context.Context, _ string, _ ...string) (bool, error) {
	return false, nil
}
func (m *mockExportStore) CreateUser(_ context.Context, _ *storage.User) error { return nil }
func (m *mockExportStore) UpdateUser(_ context.Context, _ *storage.User, _ ...string) error {
	return nil
}
func (m *mockExportStore) UpdatePassword(_ context.Context, _, _ string) error     { return nil }
func (m *mockExportStore) GetPassword(_ context.Context, _ string) (string, error) { return "", nil }
func (m *mockExportStore) SoftDeleteUser(_ context.Context, _ string) error        { return nil }
func (m *mockExportStore) IsAdmin(_ context.Context, _ string) (bool, error)       { return false, nil }
func (m *mockExportStore) ListActiveUsers(_ context.Context) ([]*storage.User, error) {
	return nil, nil
}
func (m *mockExportStore) IsActiveUser(_ context.Context, _ string, _ time.Time) (bool, error) {
	return true, nil
}

func (m *mockExportStore) GetArtist(_ context.Context, id string) (*storage.Artist, error) {
	a, ok := m.artists[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return a, nil
}

func (m *mockExportStore) GetArtistByName(_ context.Context, _, name string) (*storage.Artist, error) {
	key := strings.ToLower(strings.TrimSpace(name))
	if a, ok := m.artistsByName[key]; ok {
		return a, nil
	}
	return nil, storage.ErrNotFound
}

func (m *mockExportStore) CreateArtist(_ context.Context, a *storage.Artist) error {
	m.artists[a.ID] = a
	m.artistsByName[strings.ToLower(a.Name)] = a
	return nil
}

func (m *mockExportStore) UpdateArtist(_ context.Context, a *storage.Artist) error { return nil }
func (m *mockExportStore) DeleteArtist(_ context.Context, _ string) error          { return nil }
func (m *mockExportStore) ListArtists(_ context.Context, _ string, _, _ *int) ([]*storage.Artist, error) {
	return nil, nil
}
func (m *mockExportStore) MultiGetArtists(_ context.Context, _ []string) ([]*storage.Artist, error) {
	return nil, nil
}

func (m *mockExportStore) GetSong(_ context.Context, id string) (*storage.Song, error) {
	s, ok := m.songs[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return s, nil
}

func (m *mockExportStore) GetSongByTitleAndArtist(_ context.Context, _, title, artistID string) (*storage.Song, error) {
	key := strings.ToLower(strings.TrimSpace(title)) + "|" + artistID
	if s, ok := m.songsByTitleArtist[key]; ok {
		return s, nil
	}
	return nil, nil
}

func (m *mockExportStore) SongExists(_ context.Context, id string) (bool, error) {
	_, ok := m.songs[id]
	return ok, nil
}

func (m *mockExportStore) CreateSong(_ context.Context, s *storage.Song) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.songs[s.ID] = s
	key := strings.ToLower(s.Title) + "|" + s.ArtistID
	m.songsByTitleArtist[key] = s
	return nil
}

func (m *mockExportStore) UpdateSong(_ context.Context, _ *storage.Song) error { return nil }
func (m *mockExportStore) UpdateSongFields(_ context.Context, _ string, _ []string, _ *string, _ bool) error {
	return nil
}
func (m *mockExportStore) DeleteSong(_ context.Context, _ string) error { return nil }
func (m *mockExportStore) GetSongArtistID(_ context.Context, _ string) (string, error) {
	return "", nil
}
func (m *mockExportStore) ListSongsByArtist(_ context.Context, _, _ string) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockExportStore) ListSongsByArtistIDs(_ context.Context, _ string, _ []string) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockExportStore) ListSongs(_ context.Context, _ string, _, _ *int) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockExportStore) CountSongsByArtist(_ context.Context, _, _ string) (int, error) {
	return 0, nil
}
func (m *mockExportStore) BatchReviewCounts(_ context.Context, _ []string) (map[string]int, error) {
	return nil, nil
}

func (m *mockExportStore) GetReview(_ context.Context, _ string) (*storage.Review, error) {
	return nil, storage.ErrNotFound
}

func (m *mockExportStore) CreateReview(_ context.Context, r *storage.Review) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.createdReviews = append(m.createdReviews, r)
	return nil
}

func (m *mockExportStore) UpdateReview(_ context.Context, _ *storage.Review) error { return nil }
func (m *mockExportStore) DeleteReview(_ context.Context, _ string) error          { return nil }
func (m *mockExportStore) DeleteReviewBatch(_ context.Context, _ []string, _ string) (int, error) {
	return 0, nil
}
func (m *mockExportStore) GetReviewOwnerID(_ context.Context, _ string) (string, error) {
	return "", storage.ErrNotFound
}
func (m *mockExportStore) VerifyReviewOwnership(_ context.Context, _ []string) (map[string]string, error) {
	return nil, nil
}
func (m *mockExportStore) ListReviewsByUser(_ context.Context, _ string) ([]*storage.Review, error) {
	return nil, nil
}
func (m *mockExportStore) ReviewCount(_ context.Context, _, _ string) (int, error) { return 0, nil }
func (m *mockExportStore) ListReviewsWithSongByUser(_ context.Context, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockExportStore) ListReviewsWithSongBySong(_ context.Context, _, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockExportStore) RecentReviewsWithSong(_ context.Context, _ string, _ time.Time) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockExportStore) GetDashboardStats(_ context.Context, _ string) (*storage.DashboardStats, error) {
	return &storage.DashboardStats{}, nil
}

func (m *mockExportStore) ToggleFavoriteSong(_ context.Context, _, songID string) (bool, error) {
	m.songFavMap[songID] = true
	return true, nil
}

func (m *mockExportStore) ListFavoriteSongs(_ context.Context, _ string) ([]*storage.Song, error) {
	return nil, nil
}

func (m *mockExportStore) BatchIsSongFavorited(_ context.Context, _ string, ids []string) (map[string]bool, error) {
	result := make(map[string]bool)
	for _, id := range ids {
		result[id] = m.songFavMap[id]
	}
	return result, nil
}

func (m *mockExportStore) ToggleFavoriteArtist(_ context.Context, _, artistID string) (bool, error) {
	m.artistFavMap[artistID] = true
	return true, nil
}

func (m *mockExportStore) ListFavoriteArtists(_ context.Context, _ string) ([]*storage.Artist, error) {
	return nil, nil
}

func (m *mockExportStore) BatchIsArtistFavorited(_ context.Context, _ string, ids []string) (map[string]bool, error) {
	result := make(map[string]bool)
	for _, id := range ids {
		result[id] = m.artistFavMap[id]
	}
	return result, nil
}

func TestExportData(t *testing.T) {
	t.Parallel()

	t.Run("successful export", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		name := "TestUser"
		store.user = &storage.User{
			ID:        "u1",
			Email:     "test@example.com",
			Name:      &name,
			Birthdate: scalar.Now(),
			CreatedAt: scalar.Now(),
			UpdatedAt: scalar.Now(),
		}
		store.reviews = []*storage.ExportReview{
			{Date: "2026-01-15", Score: 88.5, MachineType: "DAM", Song: "Idol", Artist: "YOASOBI"},
		}
		store.favorites = []*storage.ExportFavorite{
			{Song: "Lemon", Artist: "米津玄師"},
		}
		store.favoriteArtists = []string{"Ado"}

		svc := service.NewExportService(store)
		result, err := svc.ExportData(context.Background(), "u1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		var parsed map[string]json.RawMessage
		if err := json.Unmarshal([]byte(result), &parsed); err != nil {
			t.Fatalf("export produced invalid JSON: %v", err)
		}

		for _, key := range []string{"exportedAt", "profile", "reviews", "favorites", "favoriteArtists"} {
			if _, ok := parsed[key]; !ok {
				t.Errorf("missing key %q in export", key)
			}
		}
	})

	t.Run("user not found", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		store.getUserErr = errors.New("not found")

		svc := service.NewExportService(store)
		_, err := svc.ExportData(context.Background(), "missing")
		if err == nil {
			t.Fatal("expected error for missing user")
		}
	})
}

func TestImportData(t *testing.T) {
	t.Parallel()

	t.Run("valid review import", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		data := `{
			"reviews": [
				{
					"date": "2026-01-15",
					"score": 85.5,
					"machineType": "DAM",
					"issues": ["MELODY", "RHYTHM"],
					"song": "Gurenge",
					"artist": "LiSA",
					"genres": ["ANIME"]
				}
			],
			"favorites": [],
			"favoriteArtists": []
		}`

		result, err := svc.ImportData(context.Background(), "u1", data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ReviewsImported != 1 {
			t.Errorf("imported %d reviews, want 1", result.ReviewsImported)
		}
		if result.ReviewsSkipped != 0 {
			t.Errorf("skipped %d reviews, want 0", result.ReviewsSkipped)
		}
	})

	t.Run("invalid score skipped", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		data := `{
			"reviews": [
				{
					"date": "2026-01-15",
					"score": 150,
					"machineType": "DAM",
					"issues": [],
					"song": "Test",
					"artist": "Test Artist",
					"genres": ["POP"]
				}
			],
			"favorites": [],
			"favoriteArtists": []
		}`

		result, err := svc.ImportData(context.Background(), "u1", data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ReviewsSkipped != 1 {
			t.Errorf("skipped %d reviews, want 1", result.ReviewsSkipped)
		}
	})

	t.Run("invalid machine type skipped", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		data := `{
			"reviews": [
				{
					"date": "2026-01-15",
					"score": 80,
					"machineType": "KARAOKE_KING",
					"issues": [],
					"song": "Test",
					"artist": "Test Artist",
					"genres": ["POP"]
				}
			],
			"favorites": [],
			"favoriteArtists": []
		}`

		result, err := svc.ImportData(context.Background(), "u1", data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ReviewsSkipped != 1 {
			t.Errorf("skipped %d reviews, want 1", result.ReviewsSkipped)
		}
	})

	t.Run("invalid JSON", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		_, err := svc.ImportData(context.Background(), "u1", "not json")
		if err == nil {
			t.Fatal("expected error for invalid JSON")
		}
	})

	t.Run("deduplicates artists", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		data := `{
			"reviews": [
				{
					"date": "2026-01-15",
					"score": 80,
					"machineType": "DAM",
					"issues": [],
					"song": "Song A",
					"artist": "Same Artist",
					"genres": ["POP"]
				},
				{
					"date": "2026-01-16",
					"score": 85,
					"machineType": "DAM",
					"issues": [],
					"song": "Song B",
					"artist": "Same Artist",
					"genres": ["POP"]
				}
			],
			"favorites": [],
			"favoriteArtists": []
		}`

		result, err := svc.ImportData(context.Background(), "u1", data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ReviewsImported != 2 {
			t.Errorf("imported %d reviews, want 2", result.ReviewsImported)
		}

		// Only one artist should have been created
		if len(store.artists) != 1 {
			t.Errorf("created %d artists, want 1 (dedup)", len(store.artists))
		}
	})

	t.Run("empty title skipped", func(t *testing.T) {
		t.Parallel()
		store := newMockExportStore()
		svc := service.NewExportService(store)

		data := `{
			"reviews": [
				{
					"date": "2026-01-15",
					"score": 80,
					"machineType": "DAM",
					"issues": [],
					"song": "  ",
					"artist": "Some Artist",
					"genres": ["POP"]
				}
			],
			"favorites": [],
			"favoriteArtists": []
		}`

		result, err := svc.ImportData(context.Background(), "u1", data)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ReviewsSkipped != 1 {
			t.Errorf("skipped %d reviews, want 1", result.ReviewsSkipped)
		}
	})
}
