package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

type mockArtistStore struct {
	artists       map[string]*storage.Artist
	artistsByName map[string]*storage.Artist // key: userID+name
	songsByArtist map[string][]*storage.Song
	favorites     map[string]bool // key: userID+artistID
}

func newMockArtistStore() *mockArtistStore {
	return &mockArtistStore{
		artists:       make(map[string]*storage.Artist),
		artistsByName: make(map[string]*storage.Artist),
		songsByArtist: make(map[string][]*storage.Song),
		favorites:     make(map[string]bool),
	}
}

func (m *mockArtistStore) GetArtist(_ context.Context, id string) (*storage.Artist, error) {
	a, ok := m.artists[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return a, nil
}

func (m *mockArtistStore) GetArtistByName(_ context.Context, userID, name string) (*storage.Artist, error) {
	a := m.artistsByName[userID+"|"+name]
	return a, nil
}

func (m *mockArtistStore) CreateArtist(_ context.Context, a *storage.Artist) error {
	m.artists[a.ID] = a
	m.artistsByName[a.UserID+"|"+a.Name] = a
	return nil
}

func (m *mockArtistStore) UpdateArtist(_ context.Context, a *storage.Artist) error {
	m.artists[a.ID] = a
	return nil
}

func (m *mockArtistStore) DeleteArtist(_ context.Context, id string) error {
	delete(m.artists, id)
	return nil
}

func (m *mockArtistStore) ListArtists(_ context.Context, _ string, _, _ *int) ([]*storage.Artist, error) {
	var result []*storage.Artist
	for _, a := range m.artists {
		result = append(result, a)
	}
	return result, nil
}

func (m *mockArtistStore) MultiGetArtists(_ context.Context, ids []string) ([]*storage.Artist, error) {
	var result []*storage.Artist
	for _, id := range ids {
		if a, ok := m.artists[id]; ok {
			result = append(result, a)
		}
	}
	return result, nil
}

func (m *mockArtistStore) ListSongsByArtist(_ context.Context, _, artistID string) ([]*storage.Song, error) {
	return m.songsByArtist[artistID], nil
}

func (m *mockArtistStore) ListSongsByArtistIDs(_ context.Context, _ string, artistIDs []string) ([]*storage.Song, error) {
	var result []*storage.Song
	for _, id := range artistIDs {
		result = append(result, m.songsByArtist[id]...)
	}
	return result, nil
}

func (m *mockArtistStore) ToggleFavoriteArtist(_ context.Context, userID, artistID string) (bool, error) {
	key := userID + "|" + artistID
	m.favorites[key] = !m.favorites[key]
	return m.favorites[key], nil
}

func (m *mockArtistStore) ListFavoriteArtists(_ context.Context, _ string) ([]*storage.Artist, error) {
	return nil, nil
}


func (m *mockArtistStore) GetUser(context.Context, string) (*storage.User, error)            { return nil, nil }
func (m *mockArtistStore) GetUserByEmail(context.Context, string) (*storage.User, error)     { return nil, nil }
func (m *mockArtistStore) EmailExists(context.Context, string, ...string) (bool, error)      { return false, nil }
func (m *mockArtistStore) NameExists(context.Context, string, ...string) (bool, error)       { return false, nil }
func (m *mockArtistStore) CreateUser(context.Context, *storage.User) error                   { return nil }
func (m *mockArtistStore) UpdateUser(context.Context, *storage.User, ...string) error        { return nil }
func (m *mockArtistStore) UpdatePassword(context.Context, string, string) error              { return nil }
func (m *mockArtistStore) GetPassword(context.Context, string) (string, error)               { return "", nil }
func (m *mockArtistStore) SoftDeleteUser(context.Context, string) error                      { return nil }
func (m *mockArtistStore) IsAdmin(context.Context, string) (bool, error)                     { return false, nil }
func (m *mockArtistStore) ListActiveUsers(context.Context) ([]*storage.User, error)          { return nil, nil }
func (m *mockArtistStore) IsActiveUser(context.Context, string, time.Time) (bool, error)     { return true, nil }
func (m *mockArtistStore) GetSong(context.Context, string) (*storage.Song, error)            { return nil, nil }
func (m *mockArtistStore) GetSongByTitleAndArtist(context.Context, string, string, string) (*storage.Song, error) {
	return nil, nil
}
func (m *mockArtistStore) SongExists(context.Context, string) (bool, error)        { return false, nil }
func (m *mockArtistStore) CreateSong(context.Context, *storage.Song) error         { return nil }
func (m *mockArtistStore) UpdateSong(context.Context, *storage.Song) error         { return nil }
func (m *mockArtistStore) UpdateSongFields(context.Context, string, []string, *string, bool) error {
	return nil
}
func (m *mockArtistStore) DeleteSong(context.Context, string) error                       { return nil }
func (m *mockArtistStore) GetSongArtistID(context.Context, string) (string, error)        { return "", nil }
func (m *mockArtistStore) ListSongs(context.Context, string, *int, *int) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockArtistStore) CountSongsByArtist(context.Context, string, string) (int, error) { return 0, nil }
func (m *mockArtistStore) BatchReviewCounts(context.Context, []string) (map[string]int, error) {
	return nil, nil
}
func (m *mockArtistStore) GetReview(context.Context, string) (*storage.Review, error) { return nil, nil }
func (m *mockArtistStore) CreateReview(context.Context, *storage.Review) error        { return nil }
func (m *mockArtistStore) UpdateReview(context.Context, *storage.Review) error        { return nil }
func (m *mockArtistStore) DeleteReview(context.Context, string) error                 { return nil }
func (m *mockArtistStore) DeleteReviewBatch(context.Context, []string, string) (int, error) {
	return 0, nil
}
func (m *mockArtistStore) GetReviewOwnerID(context.Context, string) (string, error) { return "", nil }
func (m *mockArtistStore) VerifyReviewOwnership(context.Context, []string) (map[string]string, error) {
	return nil, nil
}
func (m *mockArtistStore) ListReviewsByUser(context.Context, string) ([]*storage.Review, error) {
	return nil, nil
}
func (m *mockArtistStore) ReviewCount(context.Context, string, string) (int, error) { return 0, nil }
func (m *mockArtistStore) ListReviewsWithSongByUser(context.Context, string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockArtistStore) ListReviewsWithSongBySong(context.Context, string, string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockArtistStore) RecentReviewsWithSong(context.Context, string, time.Time) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockArtistStore) GetDashboardStats(context.Context, string) (*storage.DashboardStats, error) {
	return nil, nil
}
func (m *mockArtistStore) ToggleFavoriteSong(context.Context, string, string) (bool, error) {
	return false, nil
}
func (m *mockArtistStore) ListFavoriteSongs(context.Context, string) ([]*storage.Song, error) {
	return nil, nil
}
func (m *mockArtistStore) BatchIsSongFavorited(context.Context, string, []string) (map[string]bool, error) {
	return nil, nil
}
func (m *mockArtistStore) BatchIsArtistFavorited(context.Context, string, []string) (map[string]bool, error) {
	return nil, nil
}
func (m *mockArtistStore) ExportReviews(context.Context, string) ([]*storage.ExportReview, error) {
	return nil, nil
}
func (m *mockArtistStore) ExportFavoriteSongs(context.Context, string) ([]*storage.ExportFavorite, error) {
	return nil, nil
}
func (m *mockArtistStore) ExportFavoriteArtistNames(context.Context, string) ([]string, error) {
	return nil, nil
}

func seedArtist(store *mockArtistStore, id, userID, name string) *storage.Artist {
	artist := &storage.Artist{
		ID:        id,
		Name:      name,
		UserID:    userID,
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}
	store.artists[id] = artist
	store.artistsByName[userID+"|"+name] = artist
	return artist
}

func TestGetArtist(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		id      string
		setup   func(*mockArtistStore)
		wantErr bool
	}{
		{
			name:  "found",
			id:    "a-1",
			setup: func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "YOASOBI") },
		},
		{
			name:    "not found",
			id:      "nonexistent",
			setup:   func(_ *mockArtistStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockArtistStore()
			tt.setup(store)
			svc := service.NewArtistService(store)

			artist, err := svc.GetArtist(context.Background(), tt.id)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if artist.ID != tt.id {
				t.Errorf("got id %q, want %q", artist.ID, tt.id)
			}
		})
	}
}

func TestUpsertArtist(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		userID   string
		input    string
		setup    func(*mockArtistStore)
		wantNew  bool
		wantErr  bool
	}{
		{
			name:    "creates new artist",
			userID:  "u-1",
			input:   "Ado",
			setup:   func(_ *mockArtistStore) {},
			wantNew: true,
		},
		{
			name:   "returns existing on duplicate name",
			userID: "u-1",
			input:  "YOASOBI",
			setup:  func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "YOASOBI") },
		},
		{
			name:    "rejects empty name",
			userID:  "u-1",
			input:   "   ",
			setup:   func(_ *mockArtistStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockArtistStore()
			tt.setup(store)
			svc := service.NewArtistService(store)

			artist, err := svc.UpsertArtist(context.Background(), tt.userID, tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if artist == nil {
				t.Fatal("expected artist, got nil")
			}
			if tt.wantNew && len(store.artists) != 1 {
				t.Errorf("expected 1 artist in store, got %d", len(store.artists))
			}
		})
	}
}

func TestUpdateArtist(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		id      string
		newName string
		setup   func(*mockArtistStore)
		wantErr bool
	}{
		{
			name:    "valid update",
			userID:  "u-1",
			id:      "a-1",
			newName: "Updated Name",
			setup:   func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "Old Name") },
		},
		{
			name:    "wrong owner",
			userID:  "u-2",
			id:      "a-1",
			newName: "Stolen",
			setup:   func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "Old Name") },
			wantErr: true,
		},
		{
			name:    "not found",
			userID:  "u-1",
			id:      "nonexistent",
			newName: "Anything",
			setup:   func(_ *mockArtistStore) {},
			wantErr: true,
		},
		{
			name:    "empty name",
			userID:  "u-1",
			id:      "a-1",
			newName: "",
			setup:   func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "Old Name") },
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockArtistStore()
			tt.setup(store)
			svc := service.NewArtistService(store)

			_, err := svc.UpdateArtist(context.Background(), tt.userID, tt.id, tt.newName)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestDeleteArtist(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		id      string
		setup   func(*mockArtistStore)
		wantErr bool
	}{
		{
			name:   "valid deletion",
			userID: "u-1",
			id:     "a-1",
			setup:  func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "YOASOBI") },
		},
		{
			name:    "wrong owner",
			userID:  "u-2",
			id:      "a-1",
			setup:   func(s *mockArtistStore) { seedArtist(s, "a-1", "u-1", "YOASOBI") },
			wantErr: true,
		},
		{
			name:   "has songs",
			userID: "u-1",
			id:     "a-1",
			setup: func(s *mockArtistStore) {
				seedArtist(s, "a-1", "u-1", "YOASOBI")
				s.songsByArtist["a-1"] = []*storage.Song{{ID: "s-1"}}
			},
			wantErr: true,
		},
		{
			name:    "not found",
			userID:  "u-1",
			id:      "nonexistent",
			setup:   func(_ *mockArtistStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockArtistStore()
			tt.setup(store)
			svc := service.NewArtistService(store)

			deleted, err := svc.DeleteArtist(context.Background(), tt.userID, tt.id)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if deleted == nil {
				t.Fatal("expected deleted artist, got nil")
			}
		})
	}
}

func TestToggleFavoriteArtist(t *testing.T) {
	t.Parallel()
	store := newMockArtistStore()
	seedArtist(store, "a-1", "u-1", "YOASOBI")
	svc := service.NewArtistService(store)

	favorited, err := svc.ToggleFavorite(context.Background(), "u-1", "a-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !favorited {
		t.Error("expected favorited=true after first toggle")
	}

	unfavorited, err := svc.ToggleFavorite(context.Background(), "u-1", "a-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if unfavorited {
		t.Error("expected favorited=false after second toggle")
	}
}

func TestToggleFavoriteArtist_NotFound(t *testing.T) {
	t.Parallel()
	store := newMockArtistStore()
	svc := service.NewArtistService(store)

	_, err := svc.ToggleFavorite(context.Background(), "u-1", "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent artist")
	}
}
