//go:build integration

package postgres_test

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"testing"
	"time"

	"github.com/google/uuid"
	tcpg "github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/storage/postgres"
	"github.com/steph-dm/MyUta/backend/pkg/database"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

var testStore *postgres.Store

func TestMain(m *testing.M) {
	if runtime.GOOS == "windows" {
		if _, err := exec.LookPath("docker"); err != nil {
			fmt.Println("docker not found, skipping integration tests")
			os.Exit(0)
		}
		if out, err := exec.Command("docker", "info").CombinedOutput(); err != nil {
			fmt.Printf("docker not available: %s\n", out)
			os.Exit(0)
		}
	}

	ctx := context.Background()

	pg, err := tcpg.Run(ctx, "postgres:16-alpine",
		tcpg.WithDatabase("myuta_test"),
		tcpg.WithUsername("test"),
		tcpg.WithPassword("test"),
		tcpg.BasicWaitStrategies(),
		tcpg.WithSQLDriver("pgx"),
	)
	if err != nil {
		fmt.Printf("starting container: %v\n", err)
		os.Exit(1)
	}

	connStr, err := pg.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Printf("connection string: %v\n", err)
		os.Exit(1)
	}

	db, err := database.Connect(ctx, connStr)
	if err != nil {
		fmt.Printf("connect: %v\n", err)
		os.Exit(1)
	}

	if err := database.Migrate(ctx, db); err != nil {
		fmt.Printf("migrate: %v\n", err)
		os.Exit(1)
	}

	testStore = postgres.NewStore(db)

	code := m.Run()

	_ = db.Close()
	_ = pg.Terminate(ctx)
	os.Exit(code)
}

func truncate(t *testing.T) {
	t.Helper()
	tables := []string{"favorite_artists", "favorite_songs", "reviews", "songs", "artists", "users"}
	for _, table := range tables {
		_, err := testStore.DB.NewTruncateTable().TableExpr(table).Cascade().Exec(context.Background())
		if err != nil {
			t.Fatalf("truncate %s: %v", table, err)
		}
	}
}

func seedUser(t *testing.T, id, email string) *storage.User {
	t.Helper()
	now := scalar.Now()
	name := "user-" + id[:8]
	u := &storage.User{
		ID:        id,
		Email:     email,
		Name:      &name,
		Password:  "$2a$10$placeholder",
		Birthdate: now,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := testStore.CreateUser(context.Background(), u); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return u
}

func seedArtist(t *testing.T, userID, name string) *storage.Artist {
	t.Helper()
	now := scalar.Now()
	a := &storage.Artist{
		ID:        uuid.NewString(),
		Name:      name,
		UserID:    userID,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := testStore.CreateArtist(context.Background(), a); err != nil {
		t.Fatalf("seed artist: %v", err)
	}
	return a
}

func seedSong(t *testing.T, userID, artistID, title string) *storage.Song {
	t.Helper()
	now := scalar.Now()
	s := &storage.Song{
		ID:        uuid.NewString(),
		Title:     title,
		ArtistID:  artistID,
		UserID:    userID,
		Genres:    []storage.Genre{storage.GenrePop},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := testStore.CreateSong(context.Background(), s); err != nil {
		t.Fatalf("seed song: %v", err)
	}
	return s
}

func seedReview(t *testing.T, userID, songID string, score float64) *storage.Review {
	t.Helper()
	now := scalar.Now()
	r := &storage.Review{
		ID:          uuid.NewString(),
		Date:        now,
		UserID:      userID,
		SongID:      songID,
		Score:       score,
		MachineType: storage.MachineTypeDAM,
		Issues:      []storage.Issue{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := testStore.CreateReview(context.Background(), r); err != nil {
		t.Fatalf("seed review: %v", err)
	}
	return r
}

func TestUserCRUD(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	u := seedUser(t, userID, "test@example.com")

	got, err := testStore.GetUser(ctx, userID)
	if err != nil {
		t.Fatalf("GetUser: %v", err)
	}
	if got.Email != u.Email {
		t.Errorf("email = %q, want %q", got.Email, u.Email)
	}

	got, err = testStore.GetUserByEmail(ctx, "test@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail: %v", err)
	}
	if got.ID != userID {
		t.Errorf("id = %q, want %q", got.ID, userID)
	}

	exists, err := testStore.EmailExists(ctx, "test@example.com")
	if err != nil {
		t.Fatalf("EmailExists: %v", err)
	}
	if !exists {
		t.Error("expected email to exist")
	}

	exists, err = testStore.EmailExists(ctx, "test@example.com", userID)
	if err != nil {
		t.Fatalf("EmailExists (exclude): %v", err)
	}
	if exists {
		t.Error("expected false when excluding own ID")
	}
}

func TestSoftDelete(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "delete@example.com")

	if err := testStore.SoftDeleteUser(ctx, userID); err != nil {
		t.Fatalf("SoftDeleteUser: %v", err)
	}

	_, err := testStore.GetUser(ctx, userID)
	if err == nil {
		t.Fatal("expected error after soft delete")
	}

	active, err := testStore.IsActiveUser(ctx, userID, time.Now())
	if err == nil && active {
		t.Error("expected inactive after soft delete")
	}
}

func TestArtistCRUD(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "artist-test@example.com")
	a := seedArtist(t, userID, "YOASOBI")

	got, err := testStore.GetArtist(ctx, a.ID)
	if err != nil {
		t.Fatalf("GetArtist: %v", err)
	}
	if got.Name != "YOASOBI" {
		t.Errorf("name = %q, want %q", got.Name, "YOASOBI")
	}

	got, err = testStore.GetArtistByName(ctx, userID, "yoasobi")
	if err != nil {
		t.Fatalf("GetArtistByName: %v", err)
	}
	if got == nil || got.ID != a.ID {
		t.Error("case-insensitive lookup failed")
	}

	a.Name = "Ado"
	if err := testStore.UpdateArtist(ctx, a); err != nil {
		t.Fatalf("UpdateArtist: %v", err)
	}
	got, err = testStore.GetArtist(ctx, a.ID)
	if err != nil {
		t.Fatalf("GetArtist after update: %v", err)
	}
	if got.Name != "Ado" {
		t.Errorf("name = %q, want %q", got.Name, "Ado")
	}

	if err := testStore.DeleteArtist(ctx, a.ID); err != nil {
		t.Fatalf("DeleteArtist: %v", err)
	}
	_, err = testStore.GetArtist(ctx, a.ID)
	if err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestSongCRUD(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "song-test@example.com")
	artist := seedArtist(t, userID, "LiSA")
	song := seedSong(t, userID, artist.ID, "Gurenge")

	got, err := testStore.GetSong(ctx, song.ID)
	if err != nil {
		t.Fatalf("GetSong: %v", err)
	}
	if got.Title != "Gurenge" {
		t.Errorf("title = %q, want %q", got.Title, "Gurenge")
	}

	got, err = testStore.GetSongByTitleAndArtist(ctx, userID, "gurenge", artist.ID)
	if err != nil {
		t.Fatalf("GetSongByTitleAndArtist: %v", err)
	}
	if got == nil || got.ID != song.ID {
		t.Error("case-insensitive lookup failed")
	}

	count, err := testStore.CountSongsByArtist(ctx, userID, artist.ID)
	if err != nil {
		t.Fatalf("CountSongsByArtist: %v", err)
	}
	if count != 1 {
		t.Errorf("count = %d, want 1", count)
	}

	if err := testStore.DeleteArtist(ctx, artist.ID); err != nil {
		t.Fatalf("DeleteArtist: %v", err)
	}
	exists, err := testStore.SongExists(ctx, song.ID)
	if err != nil {
		t.Fatalf("SongExists: %v", err)
	}
	if exists {
		t.Error("expected song deleted by cascade")
	}
}

func TestReviewAndBatchCounts(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "review-test@example.com")
	artist := seedArtist(t, userID, "Ado")
	song := seedSong(t, userID, artist.ID, "Odo")

	r := seedReview(t, userID, song.ID, 88.5)

	got, err := testStore.GetReview(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetReview: %v", err)
	}
	if got.Score != 88.5 {
		t.Errorf("score = %f, want 88.5", got.Score)
	}

	now := scalar.Now()
	r2 := &storage.Review{
		ID:          uuid.NewString(),
		Date:        scalar.DateTime{Time: now.Time.Add(-24 * time.Hour)},
		UserID:      userID,
		SongID:      song.ID,
		Score:       92.0,
		MachineType: storage.MachineTypeDAM,
		Issues:      []storage.Issue{storage.IssueMelody},
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := testStore.CreateReview(ctx, r2); err != nil {
		t.Fatalf("create second review: %v", err)
	}

	counts, err := testStore.BatchReviewCounts(ctx, []string{song.ID})
	if err != nil {
		t.Fatalf("BatchReviewCounts: %v", err)
	}
	if counts[song.ID] != 2 {
		t.Errorf("review count = %d, want 2", counts[song.ID])
	}

	if err := testStore.DeleteReview(ctx, r.ID); err != nil {
		t.Fatalf("DeleteReview: %v", err)
	}
	_, err = testStore.GetReview(ctx, r.ID)
	if err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestFavoriteToggle(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "fav-test@example.com")
	artist := seedArtist(t, userID, "米津玄師")
	song := seedSong(t, userID, artist.ID, "Lemon")

	faved, err := testStore.ToggleFavoriteSong(ctx, userID, song.ID)
	if err != nil {
		t.Fatalf("ToggleFavoriteSong: %v", err)
	}
	if !faved {
		t.Error("expected favorited after first toggle")
	}

	favMap, err := testStore.BatchIsSongFavorited(ctx, userID, []string{song.ID})
	if err != nil {
		t.Fatalf("BatchIsSongFavorited: %v", err)
	}
	if !favMap[song.ID] {
		t.Error("expected song in favorites")
	}

	faved, err = testStore.ToggleFavoriteSong(ctx, userID, song.ID)
	if err != nil {
		t.Fatalf("ToggleFavoriteSong (off): %v", err)
	}
	if faved {
		t.Error("expected unfavorited after second toggle")
	}

	faved, err = testStore.ToggleFavoriteArtist(ctx, userID, artist.ID)
	if err != nil {
		t.Fatalf("ToggleFavoriteArtist: %v", err)
	}
	if !faved {
		t.Error("expected artist favorited")
	}

	artists, err := testStore.ListFavoriteArtists(ctx, userID)
	if err != nil {
		t.Fatalf("ListFavoriteArtists: %v", err)
	}
	if len(artists) != 1 || artists[0].ID != artist.ID {
		t.Errorf("favorite artists = %d, want 1", len(artists))
	}
}

func TestDashboardStats(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "stats-test@example.com")
	artist := seedArtist(t, userID, "King Gnu")
	song := seedSong(t, userID, artist.ID, "Ichizu")
	seedReview(t, userID, song.ID, 85.0)

	stats, err := testStore.GetDashboardStats(ctx, userID)
	if err != nil {
		t.Fatalf("GetDashboardStats: %v", err)
	}
	if stats.TotalReviews != 1 {
		t.Errorf("TotalReviews = %d, want 1", stats.TotalReviews)
	}
	if stats.DAMAvgScore == nil || *stats.DAMAvgScore != 85.0 {
		t.Errorf("DAMAvgScore = %v, want 85.0", stats.DAMAvgScore)
	}
}

func TestCascadeDelete(t *testing.T) {
	truncate(t)
	ctx := context.Background()

	userID := uuid.NewString()
	seedUser(t, userID, "cascade-test@example.com")
	artist := seedArtist(t, userID, "Kenshi Yonezu")
	song := seedSong(t, userID, artist.ID, "Lemon")
	review := seedReview(t, userID, song.ID, 90.0)

	_, _ = testStore.ToggleFavoriteSong(ctx, userID, song.ID)

	if err := testStore.DeleteSong(ctx, song.ID); err != nil {
		t.Fatalf("DeleteSong: %v", err)
	}

	_, err := testStore.GetReview(ctx, review.ID)
	if err == nil {
		t.Fatal("expected review cascade-deleted")
	}

	favs, err := testStore.ListFavoriteSongs(ctx, userID)
	if err != nil {
		t.Fatalf("ListFavoriteSongs: %v", err)
	}
	if len(favs) != 0 {
		t.Errorf("favorite songs = %d, want 0", len(favs))
	}
}
