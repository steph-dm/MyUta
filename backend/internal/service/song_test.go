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

type mockSongStore struct {
	songs   map[string]*storage.Song
	artists map[string]*storage.Artist

	songsByArtist map[string][]*storage.Song
	favSongs      []*storage.Song

	createErr error
	deleteErr error
}

func newMockSongStore() *mockSongStore {
	return &mockSongStore{
		songs:         make(map[string]*storage.Song),
		artists:       make(map[string]*storage.Artist),
		songsByArtist: make(map[string][]*storage.Song),
	}
}


func (m *mockSongStore) GetSong(_ context.Context, id string) (*storage.Song, error) {
	s, ok := m.songs[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return s, nil
}

func (m *mockSongStore) GetSongByTitleAndArtist(_ context.Context, _, _, _ string) (*storage.Song, error) {
	return nil, nil
}

func (m *mockSongStore) SongExists(_ context.Context, songID string) (bool, error) {
	_, ok := m.songs[songID]
	return ok, nil
}

func (m *mockSongStore) CreateSong(_ context.Context, s *storage.Song) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.songs[s.ID] = s
	m.songsByArtist[s.ArtistID] = append(m.songsByArtist[s.ArtistID], s)
	return nil
}

func (m *mockSongStore) UpdateSong(_ context.Context, s *storage.Song) error {
	m.songs[s.ID] = s
	return nil
}

func (m *mockSongStore) UpdateSongFields(_ context.Context, id string, genres []string, youtubeURL *string, genYT bool) error {
	s, ok := m.songs[id]
	if !ok {
		return storage.ErrNotFound
	}
	g := make([]storage.Genre, len(genres))
	for i, gs := range genres {
		g[i] = storage.Genre(gs)
	}
	s.Genres = g
	s.YouTubeURL = youtubeURL
	s.GeneratedYoutube = genYT
	return nil
}

func (m *mockSongStore) DeleteSong(_ context.Context, id string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	if s, ok := m.songs[id]; ok {
		filtered := make([]*storage.Song, 0)
		for _, existing := range m.songsByArtist[s.ArtistID] {
			if existing.ID != id {
				filtered = append(filtered, existing)
			}
		}
		m.songsByArtist[s.ArtistID] = filtered
	}
	delete(m.songs, id)
	return nil
}

func (m *mockSongStore) GetSongArtistID(_ context.Context, songID string) (string, error) {
	s, ok := m.songs[songID]
	if !ok {
		return "", storage.ErrNotFound
	}
	return s.ArtistID, nil
}

func (m *mockSongStore) ListSongsByArtist(_ context.Context, _, artistID string) ([]*storage.Song, error) {
	return m.songsByArtist[artistID], nil
}

func (m *mockSongStore) ListSongsByArtistIDs(_ context.Context, _ string, ids []string) ([]*storage.Song, error) {
	var result []*storage.Song
	for _, id := range ids {
		result = append(result, m.songsByArtist[id]...)
	}
	return result, nil
}

func (m *mockSongStore) ListSongs(_ context.Context, _ string, _, _ *int) ([]*storage.Song, error) {
	var result []*storage.Song
	for _, s := range m.songs {
		result = append(result, s)
	}
	return result, nil
}

func (m *mockSongStore) CountSongsByArtist(_ context.Context, _, artistID string) (int, error) {
	return len(m.songsByArtist[artistID]), nil
}

func (m *mockSongStore) BatchReviewCounts(_ context.Context, _ []string) (map[string]int, error) {
	return map[string]int{}, nil
}


func (m *mockSongStore) GetArtist(_ context.Context, id string) (*storage.Artist, error) {
	a, ok := m.artists[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return a, nil
}

func (m *mockSongStore) GetArtistByName(_ context.Context, _, _ string) (*storage.Artist, error) {
	return nil, nil
}

func (m *mockSongStore) CreateArtist(_ context.Context, a *storage.Artist) error {
	m.artists[a.ID] = a
	return nil
}

func (m *mockSongStore) UpdateArtist(_ context.Context, a *storage.Artist) error {
	m.artists[a.ID] = a
	return nil
}

func (m *mockSongStore) DeleteArtist(_ context.Context, id string) error {
	delete(m.artists, id)
	return nil
}

func (m *mockSongStore) ListArtists(_ context.Context, _ string, _, _ *int) ([]*storage.Artist, error) {
	return nil, nil
}

func (m *mockSongStore) MultiGetArtists(_ context.Context, ids []string) ([]*storage.Artist, error) {
	var result []*storage.Artist
	for _, id := range ids {
		if a, ok := m.artists[id]; ok {
			result = append(result, a)
		}
	}
	return result, nil
}


func (m *mockSongStore) GetReview(_ context.Context, _ string) (*storage.Review, error) {
	return nil, storage.ErrNotFound
}
func (m *mockSongStore) CreateReview(_ context.Context, _ *storage.Review) error { return nil }
func (m *mockSongStore) UpdateReview(_ context.Context, _ *storage.Review) error { return nil }
func (m *mockSongStore) DeleteReview(_ context.Context, _ string) error          { return nil }
func (m *mockSongStore) DeleteReviewBatch(_ context.Context, _ []string, _ string) (int, error) {
	return 0, nil
}
func (m *mockSongStore) GetReviewOwnerID(_ context.Context, _ string) (string, error) {
	return "", storage.ErrNotFound
}
func (m *mockSongStore) VerifyReviewOwnership(_ context.Context, _ []string) (map[string]string, error) {
	return nil, nil
}
func (m *mockSongStore) ListReviewsByUser(_ context.Context, _ string) ([]*storage.Review, error) {
	return nil, nil
}
func (m *mockSongStore) ReviewCount(_ context.Context, _, _ string) (int, error) { return 0, nil }
func (m *mockSongStore) ListReviewsWithSongByUser(_ context.Context, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockSongStore) ListReviewsWithSongBySong(_ context.Context, _, _ string) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockSongStore) RecentReviewsWithSong(_ context.Context, _ string, _ time.Time) ([]*storage.ReviewWithSong, error) {
	return nil, nil
}
func (m *mockSongStore) GetDashboardStats(_ context.Context, _ string) (*storage.DashboardStats, error) {
	return &storage.DashboardStats{}, nil
}


func (m *mockSongStore) ToggleFavoriteSong(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}
func (m *mockSongStore) ListFavoriteSongs(_ context.Context, _ string) ([]*storage.Song, error) {
	if m.favSongs != nil {
		return m.favSongs, nil
	}
	return []*storage.Song{}, nil
}
func (m *mockSongStore) BatchIsSongFavorited(_ context.Context, _ string, _ []string) (map[string]bool, error) {
	return nil, nil
}
func (m *mockSongStore) ToggleFavoriteArtist(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}
func (m *mockSongStore) ListFavoriteArtists(_ context.Context, _ string) ([]*storage.Artist, error) {
	return nil, nil
}
func (m *mockSongStore) BatchIsArtistFavorited(_ context.Context, _ string, _ []string) (map[string]bool, error) {
	return nil, nil
}


func (m *mockSongStore) ExportReviews(_ context.Context, _ string) ([]*storage.ExportReview, error) {
	return nil, nil
}
func (m *mockSongStore) ExportFavoriteSongs(_ context.Context, _ string) ([]*storage.ExportFavorite, error) {
	return nil, nil
}
func (m *mockSongStore) ExportFavoriteArtistNames(_ context.Context, _ string) ([]string, error) {
	return nil, nil
}


func (m *mockSongStore) GetUser(_ context.Context, _ string) (*storage.User, error) {
	return nil, storage.ErrNotFound
}
func (m *mockSongStore) GetUserByEmail(_ context.Context, _ string) (*storage.User, error) {
	return nil, storage.ErrNotFound
}
func (m *mockSongStore) EmailExists(_ context.Context, _ string, _ ...string) (bool, error) {
	return false, nil
}
func (m *mockSongStore) NameExists(_ context.Context, _ string, _ ...string) (bool, error) {
	return false, nil
}
func (m *mockSongStore) CreateUser(_ context.Context, _ *storage.User) error               { return nil }
func (m *mockSongStore) UpdateUser(_ context.Context, _ *storage.User, _ ...string) error  { return nil }
func (m *mockSongStore) UpdatePassword(_ context.Context, _, _ string) error               { return nil }
func (m *mockSongStore) GetPassword(_ context.Context, _ string) (string, error)           { return "", nil }
func (m *mockSongStore) SoftDeleteUser(_ context.Context, _ string) error                  { return nil }
func (m *mockSongStore) IsAdmin(_ context.Context, _ string) (bool, error)                 { return false, nil }
func (m *mockSongStore) ListActiveUsers(_ context.Context) ([]*storage.User, error)        { return nil, nil }
func (m *mockSongStore) IsActiveUser(_ context.Context, _ string, _ time.Time) (bool, error) {
	return true, nil
}

// --- Helpers ---

func addSong(store *mockSongStore, id, userID, artistID, title string) *storage.Song {
	s := &storage.Song{
		ID:        id,
		Title:     title,
		ArtistID:  artistID,
		UserID:    userID,
		Genres:    []storage.Genre{storage.GenrePop},
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}
	store.songs[id] = s
	store.songsByArtist[artistID] = append(store.songsByArtist[artistID], s)
	return s
}

func addArtist(store *mockSongStore, id, name string) {
	store.artists[id] = &storage.Artist{
		ID:        id,
		Name:      name,
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}
}

// --- Tests ---

func TestGetSong(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		songID  string
		setup   func(*mockSongStore)
		wantErr bool
	}{
		{
			name:   "own song",
			userID: "u1",
			songID: "s1",
			setup: func(s *mockSongStore) {
				addArtist(s, "a1", "YOASOBI")
				addSong(s, "s1", "u1", "a1", "Idol")
			},
		},
		{
			name:   "other user's song",
			userID: "u2",
			songID: "s1",
			setup: func(s *mockSongStore) {
				addArtist(s, "a1", "YOASOBI")
				addSong(s, "s1", "u1", "a1", "Idol")
			},
			wantErr: true,
		},
		{
			name:    "nonexistent song",
			userID:  "u1",
			songID:  "nope",
			setup:   func(_ *mockSongStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockSongStore()
			tt.setup(store)
			svc := service.NewSongService(store)

			got, err := svc.GetSong(context.Background(), tt.userID, tt.songID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.ID != tt.songID {
				t.Errorf("got song ID %q, want %q", got.ID, tt.songID)
			}
		})
	}
}

func TestDeleteSong(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		songID  string
		setup   func(*mockSongStore)
		wantErr bool
	}{
		{
			name:   "delete own song",
			userID: "u1",
			songID: "s1",
			setup: func(s *mockSongStore) {
				addArtist(s, "a1", "米津玄師")
				addSong(s, "s1", "u1", "a1", "Lemon")
			},
		},
		{
			name:   "can't delete other user's song",
			userID: "u2",
			songID: "s1",
			setup: func(s *mockSongStore) {
				addArtist(s, "a1", "米津玄師")
				addSong(s, "s1", "u1", "a1", "Lemon")
			},
			wantErr: true,
		},
		{
			name:    "nonexistent song",
			userID:  "u1",
			songID:  "nope",
			setup:   func(_ *mockSongStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockSongStore()
			tt.setup(store)
			svc := service.NewSongService(store)

			deleted, err := svc.DeleteSong(context.Background(), tt.userID, tt.songID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if deleted.ID != tt.songID {
				t.Errorf("deleted song ID %q, want %q", deleted.ID, tt.songID)
			}
		})
	}
}

func TestDeleteSong_CleansUpOrphanedArtist(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "One-song Artist")
	addSong(store, "s1", "u1", "a1", "Only Song")

	svc := service.NewSongService(store)

	_, err := svc.DeleteSong(context.Background(), "u1", "s1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := store.artists["a1"]; ok {
		t.Error("expected orphaned artist to be cleaned up")
	}
}

func TestToggleFavorite(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		songID  string
		setup   func(*mockSongStore)
		wantErr bool
	}{
		{
			name:   "existing song",
			songID: "s1",
			setup: func(s *mockSongStore) {
				addArtist(s, "a1", "Ado")
				addSong(s, "s1", "u1", "a1", "Usseewa")
			},
		},
		{
			name:    "nonexistent song",
			songID:  "nope",
			setup:   func(_ *mockSongStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockSongStore()
			tt.setup(store)
			svc := service.NewSongService(store)

			_, err := svc.ToggleFavorite(context.Background(), "u1", tt.songID)
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

func TestListSongs(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "LiSA")
	addSong(store, "s1", "u1", "a1", "Gurenge")
	addSong(store, "s2", "u1", "a1", "Homura")

	svc := service.NewSongService(store)

	songs, err := svc.ListSongs(context.Background(), "u1", nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(songs) != 2 {
		t.Errorf("got %d songs, want 2", len(songs))
	}
}

func TestUpsertSong_CreateNew(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "Ado")
	svc := service.NewSongService(store)

	genres := []storage.Genre{storage.GenreAnime}
	got, err := svc.UpsertSong(context.Background(), "u1", nil, "New Song", "a1", genres, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Title != "New Song" {
		t.Errorf("got title %q, want %q", got.Title, "New Song")
	}
}

func TestUpsertSong_ArtistNotFound(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	svc := service.NewSongService(store)

	_, err := svc.UpsertSong(context.Background(), "u1", nil, "Song", "missing", []storage.Genre{storage.GenrePop}, nil, nil)
	if err == nil {
		t.Fatal("expected error for missing artist")
	}
}

func TestUpsertSong_EmptyTitle(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "Ado")
	svc := service.NewSongService(store)

	_, err := svc.UpsertSong(context.Background(), "u1", nil, "  ", "a1", []storage.Genre{storage.GenrePop}, nil, nil)
	if err == nil {
		t.Fatal("expected validation error for blank title")
	}
}

func TestUpsertSong_UpdateExisting(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "YOASOBI")
	addSong(store, "s1", "u1", "a1", "Idol")
	svc := service.NewSongService(store)

	songID := "s1"
	got, err := svc.UpsertSong(context.Background(), "u1", &songID, "Racing Into The Night", "a1", []storage.Genre{storage.GenrePop}, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Title != "Racing Into The Night" {
		t.Errorf("got title %q, want %q", got.Title, "Racing Into The Night")
	}
}

func TestUpsertSong_CantUpdateOtherUsers(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	addArtist(store, "a1", "YOASOBI")
	addSong(store, "s1", "u1", "a1", "Idol")
	svc := service.NewSongService(store)

	songID := "s1"
	_, err := svc.UpsertSong(context.Background(), "u2", &songID, "Stolen Song", "a1", []storage.Genre{storage.GenrePop}, nil, nil)
	if err == nil {
		t.Fatal("expected forbidden error when updating another user's song")
	}
}

func TestUpsertSong_StoreCreateError(t *testing.T) {
	t.Parallel()

	store := newMockSongStore()
	store.createErr = errors.New("disk full")
	addArtist(store, "a1", "Ado")
	svc := service.NewSongService(store)

	_, err := svc.UpsertSong(context.Background(), "u1", nil, "New Song", "a1", []storage.Genre{storage.GenrePop}, nil, nil)
	if err == nil {
		t.Fatal("expected error from store")
	}
}
