package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

// --- artists ------------------------------------------------------------------------------------

func (s *Store) GetArtist(ctx context.Context, userID, id string) (*storage.Artist, error) {
	a := new(storage.Artist)
	err := s.db.NewSelect().Model(a).Where("a.user_id = ? AND a.id = ?", userID, id).Scan(ctx)
	return a, classify(err)
}

// FindArtistByName compares normalised keys (case, width and spacing do not matter).
func (s *Store) FindArtistByName(ctx context.Context, userID, name string) (*storage.Artist, error) {
	a := new(storage.Artist)
	err := s.db.NewSelect().Model(a).
		Where("a.user_id = ? AND a.name_key = myuta_key(?)", userID, name).Scan(ctx)
	return a, classify(err)
}

// EnsureArtist returns the artist with this name, creating it if needed.
// Safe against concurrent calls (the unique index decides).
func (s *Store) EnsureArtist(ctx context.Context, userID, name string) (*storage.Artist, error) {
	a, err := s.FindArtistByName(ctx, userID, name)
	if !errors.Is(err, storage.ErrNotFound) {
		return a, err
	}
	a = &storage.Artist{ID: uuid.NewString(), UserID: userID, Name: name}
	res, err := s.db.NewInsert().Model(a).On("CONFLICT (user_id, name_key) DO NOTHING").Returning("*").Exec(ctx)
	if err != nil {
		return nil, classify(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return s.FindArtistByName(ctx, userID, name) // created concurrently
	}
	return a, nil
}

func (s *Store) RenameArtist(ctx context.Context, userID, id, name string) error {
	return mustAffect(s.db.NewUpdate().Model((*storage.Artist)(nil)).
		Set("name = ?", name).Where("user_id = ? AND id = ?", userID, id).Exec(ctx))
}

// MergeArtists moves everything from source into target and deletes source.
// Songs whose titles exist on both sides are merged too (reviews, favourites
// and goals move to the surviving song). Must run inside InTx.
func (s *Store) MergeArtists(ctx context.Context, userID, sourceID, targetID string) error {
	stmts := []string{
		// pairs of songs with the same title on both artists
		`CREATE TEMP TABLE merge_pairs ON COMMIT DROP AS
		 SELECT src.id AS dup_id, dst.id AS keep_id
		   FROM songs src JOIN songs dst ON dst.title_key = src.title_key
		  WHERE src.user_id = ?0 AND dst.user_id = ?0 AND src.artist_id = ?1 AND dst.artist_id = ?2`,
		`UPDATE songs k SET
		   genres = (SELECT COALESCE(array_agg(DISTINCT g ORDER BY g), '{}') FROM songs x, unnest(x.genres) g
		              WHERE x.id = k.id OR x.id IN (SELECT dup_id FROM merge_pairs WHERE keep_id = k.id)),
		   youtube_url = COALESCE(k.youtube_url, (SELECT d.youtube_url FROM songs d JOIN merge_pairs m ON d.id = m.dup_id
		                                           WHERE m.keep_id = k.id AND d.youtube_url IS NOT NULL LIMIT 1))
		 WHERE k.id IN (SELECT keep_id FROM merge_pairs)`,
		`UPDATE reviews r SET song_id = m.keep_id FROM merge_pairs m WHERE r.song_id = m.dup_id AND r.user_id = ?0`,
		`INSERT INTO favorite_songs (user_id, song_id, created_at)
		 SELECT f.user_id, m.keep_id, f.created_at FROM favorite_songs f JOIN merge_pairs m ON f.song_id = m.dup_id
		 ON CONFLICT DO NOTHING`,
		`INSERT INTO song_goals (song_id, machine_type, user_id, target_score)
		 SELECT m.keep_id, g.machine_type, g.user_id, g.target_score FROM song_goals g JOIN merge_pairs m ON g.song_id = m.dup_id
		 ON CONFLICT DO NOTHING`,
		`DELETE FROM songs s USING merge_pairs m WHERE s.id = m.dup_id`,
		`UPDATE songs SET artist_id = ?2 WHERE user_id = ?0 AND artist_id = ?1`,
		`INSERT INTO favorite_artists (user_id, artist_id, created_at)
		 SELECT user_id, ?2, created_at FROM favorite_artists WHERE user_id = ?0 AND artist_id = ?1
		 ON CONFLICT DO NOTHING`,
		`DELETE FROM artists WHERE user_id = ?0 AND id = ?1`,
	}
	for _, q := range stmts {
		if _, err := s.db.ExecContext(ctx, q, userID, sourceID, targetID); err != nil {
			return classify(err)
		}
	}
	return nil
}

// DeleteArtist deletes the artist with its songs and their reviews (cascade).
func (s *Store) DeleteArtist(ctx context.Context, userID, id string) error {
	return mustAffect(s.db.NewDelete().Model((*storage.Artist)(nil)).Where("user_id = ? AND id = ?", userID, id).Exec(ctx))
}

func (s *Store) ArtistImpact(ctx context.Context, userID, id string) (int, int, error) {
	var songs, reviews int
	err := s.db.NewRaw(`SELECT
		(SELECT count(*) FROM songs WHERE user_id = ?0 AND artist_id = ?1),
		(SELECT count(*) FROM reviews r JOIN songs s ON s.id = r.song_id WHERE r.user_id = ?0 AND s.artist_id = ?1)`,
		userID, id).Scan(ctx, &songs, &reviews)
	return songs, reviews, classify(err)
}

func (s *Store) ReviewCountsByArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]int, error) {
	var rows []struct {
		ArtistID string `bun:"artist_id"`
		N        int    `bun:"n"`
	}
	err := s.db.NewSelect().TableExpr("reviews AS r").
		ColumnExpr("s.artist_id, count(*) AS n").
		Join("JOIN songs AS s ON s.id = r.song_id").
		Where("r.user_id = ? AND s.artist_id IN (?)", userID, bun.List(artistIDs)).
		GroupExpr("s.artist_id").Scan(ctx, &rows)
	out := make(map[string]int, len(rows))
	for _, r := range rows {
		out[r.ArtistID] = r.N
	}
	return out, classify(err)
}

func (s *Store) ListArtists(ctx context.Context, userID string, f storage.ArtistFilter, sort storage.ArtistSort, p storage.Page) ([]*storage.Artist, int, error) {
	var artists []*storage.Artist
	q := s.db.NewSelect().Model(&artists).Where("a.user_id = ?", userID)
	if f.Search != "" {
		q = q.Where("myuta_search_key(a.name) LIKE ?", likePattern(domain.SearchKey(f.Search)))
	}
	if f.FavoritesOnly {
		q = q.Where("EXISTS (SELECT 1 FROM favorite_artists f WHERE f.user_id = a.user_id AND f.artist_id = a.id)")
	}
	if sort == storage.ArtistSortNameDesc {
		q = q.OrderExpr("a.name_key DESC, a.id")
	} else {
		q = q.OrderExpr("a.name_key ASC, a.id")
	}
	total, err := q.Limit(p.Limit).Offset(p.Offset).ScanAndCount(ctx)
	return artists, total, classify(err)
}

func (s *Store) ArtistsByIDs(ctx context.Context, userID string, ids []string) ([]*storage.Artist, error) {
	var artists []*storage.Artist
	err := s.db.NewSelect().Model(&artists).Where("a.user_id = ? AND a.id IN (?)", userID, bun.List(ids)).Scan(ctx)
	return artists, classify(err)
}

func (s *Store) ListFavoriteArtists(ctx context.Context, userID string) ([]*storage.Artist, error) {
	var artists []*storage.Artist
	err := s.db.NewSelect().Model(&artists).
		Join("JOIN favorite_artists AS f ON f.artist_id = a.id AND f.user_id = a.user_id").
		Where("a.user_id = ?", userID).OrderExpr("f.created_at DESC").Scan(ctx)
	return artists, classify(err)
}

// --- songs ------------------------------------------------------------------------------------------

func (s *Store) GetSong(ctx context.Context, userID, id string) (*storage.Song, error) {
	song := new(storage.Song)
	err := s.db.NewSelect().Model(song).Where("s.user_id = ? AND s.id = ?", userID, id).Scan(ctx)
	return song, classify(err)
}

func (s *Store) FindSong(ctx context.Context, userID, artistID, title string) (*storage.Song, error) {
	song := new(storage.Song)
	err := s.db.NewSelect().Model(song).
		Where("s.user_id = ? AND s.artist_id = ? AND s.title_key = myuta_key(?)", userID, artistID, title).Scan(ctx)
	return song, classify(err)
}

func (s *Store) CreateSong(ctx context.Context, song *storage.Song) error {
	if song.Genres == nil {
		song.Genres = []domain.Genre{}
	}
	_, err := s.db.NewInsert().Model(song).Returning("*").Exec(ctx)
	return classify(err)
}

func (s *Store) UpdateSong(ctx context.Context, song *storage.Song) error {
	if song.Genres == nil {
		song.Genres = []domain.Genre{}
	}
	return mustAffect(s.db.NewUpdate().Model(song).
		Column("artist_id", "title", "genres", "youtube_url", "generated_youtube").
		Where("s.user_id = ? AND s.id = ?", song.UserID, song.ID).Exec(ctx))
}

func (s *Store) DeleteSong(ctx context.Context, userID, id string) error {
	return mustAffect(s.db.NewDelete().Model((*storage.Song)(nil)).Where("user_id = ? AND id = ?", userID, id).Exec(ctx))
}

func (s *Store) SongImpact(ctx context.Context, userID, id string) (int, error) {
	n, err := s.db.NewSelect().Model((*storage.Review)(nil)).Where("user_id = ? AND song_id = ?", userID, id).Count(ctx)
	return n, classify(err)
}

func (s *Store) ListSongs(ctx context.Context, userID string, f storage.SongFilter, sort storage.SongSort, p storage.Page) ([]*storage.Song, int, error) {
	var songs []*storage.Song
	q := s.db.NewSelect().Model(&songs).Where("s.user_id = ?", userID)
	if f.Search != "" {
		pattern := likePattern(domain.SearchKey(f.Search))
		q = q.Where("(myuta_search_key(s.title) LIKE ? OR EXISTS (SELECT 1 FROM artists a WHERE a.id = s.artist_id AND myuta_search_key(a.name) LIKE ?))", pattern, pattern)
	}
	if len(f.Genres) > 0 {
		q = q.Where("s.genres && ?", pgdialect.Array(pgArray(f.Genres)))
	}
	if f.FavoritesOnly {
		q = q.Where("EXISTS (SELECT 1 FROM favorite_songs f WHERE f.user_id = s.user_id AND f.song_id = s.id)")
	}
	if f.ArtistID != nil {
		q = q.Where("s.artist_id = ?", *f.ArtistID)
	}
	switch sort {
	case storage.SongSortTitleDesc:
		q = q.OrderExpr("s.title_key DESC, s.id")
	case storage.SongSortRecent:
		q = q.OrderExpr("(SELECT max(r.performed_on) FROM reviews r WHERE r.song_id = s.id) DESC NULLS LAST, s.created_at DESC")
	default:
		q = q.OrderExpr("s.title_key ASC, s.id")
	}
	total, err := q.Limit(p.Limit).Offset(p.Offset).ScanAndCount(ctx)
	return songs, total, classify(err)
}

func (s *Store) SongsByIDs(ctx context.Context, userID string, ids []string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.db.NewSelect().Model(&songs).Where("s.user_id = ? AND s.id IN (?)", userID, bun.List(ids)).Scan(ctx)
	return songs, classify(err)
}

func (s *Store) SongsByArtistIDs(ctx context.Context, userID string, artistIDs []string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.db.NewSelect().Model(&songs).
		Where("s.user_id = ? AND s.artist_id IN (?)", userID, bun.List(artistIDs)).
		OrderExpr("s.title_key, s.id").Scan(ctx)
	return songs, classify(err)
}

func (s *Store) SongCountsByArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]int, error) {
	var rows []struct {
		ArtistID string `bun:"artist_id"`
		N        int    `bun:"n"`
	}
	err := s.db.NewSelect().Model((*storage.Song)(nil)).
		ColumnExpr("s.artist_id, count(*) AS n").
		Where("s.user_id = ? AND s.artist_id IN (?)", userID, bun.List(artistIDs)).
		GroupExpr("s.artist_id").Scan(ctx, &rows)
	out := make(map[string]int, len(rows))
	for _, r := range rows {
		out[r.ArtistID] = r.N
	}
	return out, classify(err)
}

func (s *Store) ListFavoriteSongs(ctx context.Context, userID string) ([]*storage.Song, error) {
	var songs []*storage.Song
	err := s.db.NewSelect().Model(&songs).
		Join("JOIN favorite_songs AS f ON f.song_id = s.id AND f.user_id = s.user_id").
		Where("s.user_id = ?", userID).OrderExpr("f.created_at DESC").Scan(ctx)
	return songs, classify(err)
}

// --- favourites (idempotent) -------------------------------------------------------------------------

func (s *Store) SetSongFavorite(ctx context.Context, userID, songID string, favorite bool) error {
	if favorite {
		_, err := s.db.NewInsert().Model(&storage.FavoriteSong{UserID: userID, SongID: songID}).
			On("CONFLICT DO NOTHING").Exec(ctx)
		return classify(err) // a song of another user violates the composite FK -> ErrNotFound
	}
	_, err := s.db.NewDelete().Model((*storage.FavoriteSong)(nil)).Where("user_id = ? AND song_id = ?", userID, songID).Exec(ctx)
	return classify(err)
}

func (s *Store) SetArtistFavorite(ctx context.Context, userID, artistID string, favorite bool) error {
	if favorite {
		_, err := s.db.NewInsert().Model(&storage.FavoriteArtist{UserID: userID, ArtistID: artistID}).
			On("CONFLICT DO NOTHING").Exec(ctx)
		return classify(err)
	}
	_, err := s.db.NewDelete().Model((*storage.FavoriteArtist)(nil)).Where("user_id = ? AND artist_id = ?", userID, artistID).Exec(ctx)
	return classify(err)
}

func (s *Store) FavoriteSongIDs(ctx context.Context, userID string, songIDs []string) (map[string]bool, error) {
	var ids []string
	err := s.db.NewSelect().Model((*storage.FavoriteSong)(nil)).Column("song_id").
		Where("user_id = ? AND song_id IN (?)", userID, bun.List(songIDs)).Scan(ctx, &ids)
	return toSet(ids), classify(err)
}

func (s *Store) FavoriteArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]bool, error) {
	var ids []string
	err := s.db.NewSelect().Model((*storage.FavoriteArtist)(nil)).Column("artist_id").
		Where("user_id = ? AND artist_id IN (?)", userID, bun.List(artistIDs)).Scan(ctx, &ids)
	return toSet(ids), classify(err)
}

// --- goals -------------------------------------------------------------------------------------------------

// SetGoal sets or (target nil) removes the goal for a song on a machine.
func (s *Store) SetGoal(ctx context.Context, userID, songID string, machine domain.MachineType, target *float64) error {
	if target == nil {
		_, err := s.db.NewDelete().Model((*storage.SongGoal)(nil)).
			Where("user_id = ? AND song_id = ? AND machine_type = ?", userID, songID, machine).Exec(ctx)
		return classify(err)
	}
	g := &storage.SongGoal{SongID: songID, MachineType: machine, UserID: userID, TargetScore: *target}
	_, err := s.db.NewInsert().Model(g).
		On("CONFLICT (song_id, machine_type) DO UPDATE").Set("target_score = EXCLUDED.target_score").Exec(ctx)
	return classify(err)
}

func (s *Store) GoalsBySongIDs(ctx context.Context, userID string, songIDs []string) ([]*storage.SongGoal, error) {
	var goals []*storage.SongGoal
	err := s.db.NewSelect().Model(&goals).
		Where("g.user_id = ? AND g.song_id IN (?)", userID, bun.List(songIDs)).
		OrderExpr("g.song_id").Scan(ctx)
	return goals, classify(err)
}

func toSet(ids []string) map[string]bool {
	out := make(map[string]bool, len(ids))
	for _, id := range ids {
		out[id] = true
	}
	return out
}

func pgArray[T ~string](vals []T) []string {
	out := make([]string, len(vals))
	for i, v := range vals {
		out[i] = string(v)
	}
	return out
}
