//go:build integration

package database_test

import (
	"context"
	"strings"
	"testing"

	"github.com/steph-dm/MyUta/backend/internal/database"
	"github.com/steph-dm/MyUta/backend/internal/testutil"
)

// TestMigration005ConvertsVersion4Data loads data shaped like the old schema
// (including the problems the review found) and checks the conversion.
func TestMigration005ConvertsVersion4Data(t *testing.T) {
	ctx := context.Background()
	db, err := database.Connect(ctx, testutil.FreshDB(t))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()
	if err := database.MigrateTo(ctx, db.DB, 4); err != nil {
		t.Fatal(err)
	}
	const u1 = "11111111-1111-4111-8111-111111111111"
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := db.ExecContext(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	exec(`INSERT INTO users (id, email, name, password, "defaultMachineType") VALUES (?, 'Taro@Example.COM', '  taro ', 'x', 'DAM')`, u1)
	artists := map[string]string{
		"aaaaaaaa-0000-4000-8000-000000000001": "YOASOBI",
		"aaaaaaaa-0000-4000-8000-000000000002": "yoasobi",
		"aaaaaaaa-0000-4000-8000-000000000003": "ＹＯＡＳＯＢＩ",
	}
	i := 0
	for id, name := range artists {
		i++
		exec(`INSERT INTO artists (id, name, "userId", "createdAt") VALUES (?, ?, ?, now() - (? * interval '1 hour'))`, id, name, u1, 10-i)
	}
	// the oldest artist must survive
	exec(`UPDATE artists SET "createdAt" = now() - interval '1 day' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'`)
	// same song under two artist spellings (merged into one song) with one review each
	exec(`INSERT INTO songs (id, title, "artistId", "userId", genres, "youtubeUrl") VALUES
	  ('bbbbbbbb-0000-4000-8000-000000000001', 'アイドル', 'aaaaaaaa-0000-4000-8000-000000000001', ?, '{ANIME}', NULL),
	  ('bbbbbbbb-0000-4000-8000-000000000002', 'アイドル ', 'aaaaaaaa-0000-4000-8000-000000000002', ?, '{POP}', 'https://youtu.be/abcdefghijk')`, u1, u1)
	exec(`INSERT INTO reviews (id, date, "userId", "songId", score, "machineType", issues, notes) VALUES
	  ('cccccccc-0000-4000-8000-000000000001', '2026-03-22T20:45:00Z', ?, 'bbbbbbbb-0000-4000-8000-000000000001', 88.12345, 'DAM', '{RHYTHM,RHYTHM}', '   '),
	  ('cccccccc-0000-4000-8000-000000000002', '2026-03-23T00:00:00Z', ?, 'bbbbbbbb-0000-4000-8000-000000000002', 90, 'JOYSOUND', '{}', 'ok')`, u1, u1)
	exec(`INSERT INTO favorite_songs (id, "userId", "songId") VALUES ('f1', ?, 'bbbbbbbb-0000-4000-8000-000000000001'), ('f2', ?, 'bbbbbbbb-0000-4000-8000-000000000002')`, u1, u1)
	exec(`INSERT INTO favorite_artists (id, "userId", "artistId") VALUES ('g1', ?, 'aaaaaaaa-0000-4000-8000-000000000003')`, u1)

	if err := database.Migrate(ctx, db.DB); err != nil {
		t.Fatal(err)
	}

	var email, name string
	if err := db.QueryRowContext(ctx, `SELECT email, name FROM users`).Scan(&email, &name); err != nil || email != "taro@example.com" || name != "taro" {
		t.Errorf("user: %q %q %v", email, name, err)
	}
	var artistCount int
	var keptName string
	_ = db.QueryRowContext(ctx, `SELECT count(*), min(name) FROM artists`).Scan(&artistCount, &keptName)
	if artistCount != 1 || keptName != "YOASOBI" {
		t.Errorf("artists after merge: %d %q", artistCount, keptName)
	}
	var songCount int
	var genres, url string
	_ = db.QueryRowContext(ctx, `SELECT count(*), max(array_to_string(genres, ',')), max(youtube_url) FROM songs`).Scan(&songCount, &genres, &url)
	if songCount != 1 || genres != "ANIME,POP" || !strings.Contains(url, "youtu.be") {
		t.Errorf("songs after merge: %d %q %q", songCount, genres, url)
	}
	rows, err := db.QueryContext(ctx, `SELECT performed_on::text, score::text, array_to_string(issues, ','), coalesce(notes, '<null>') FROM reviews ORDER BY performed_on`)
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for rows.Next() {
		var d, s, is, n string
		_ = rows.Scan(&d, &s, &is, &n)
		got = append(got, strings.Join([]string{d, s, is, n}, "|"))
	}
	want := []string{"2026-03-22|88.123|RHYTHM|<null>", "2026-03-23|90.000||ok"}
	if strings.Join(got, ";") != strings.Join(want, ";") {
		t.Errorf("reviews:\n got %v\nwant %v", got, want)
	}
	var favSongs, favArtists int
	_ = db.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM favorite_songs), (SELECT count(*) FROM favorite_artists)`).Scan(&favSongs, &favArtists)
	if favSongs != 1 || favArtists != 1 {
		t.Errorf("favourites: %d songs %d artists", favSongs, favArtists)
	}
}

// TestMigration005RefusesCaseDuplicateEmails checks the guard and that nothing
// is half-applied.
func TestMigration005RefusesCaseDuplicateEmails(t *testing.T) {
	ctx := context.Background()
	db, err := database.Connect(ctx, testutil.FreshDB(t))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()
	if err := database.MigrateTo(ctx, db.DB, 4); err != nil {
		t.Fatal(err)
	}
	_, _ = db.ExecContext(ctx, `INSERT INTO users (id, email, name, password) VALUES
	  ('11111111-1111-4111-8111-111111111111', 'a@example.com', 'a', 'x'),
	  ('22222222-2222-4222-8222-222222222222', 'A@example.com', 'b', 'x')`)
	err = database.Migrate(ctx, db.DB)
	if err == nil || !strings.Contains(err.Error(), "different letter case") {
		t.Fatalf("expected the e-mail guard, got %v", err)
	}
	var col string
	if err := db.QueryRowContext(ctx, `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='isAdmin'`).Scan(&col); err != nil {
		t.Fatalf("schema was partially migrated: %v", err)
	}
}
