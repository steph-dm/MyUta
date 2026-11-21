package postgres

import (
	"context"
	"encoding/json"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

func (s *Store) CreateReview(ctx context.Context, r *storage.Review) error {
	if r.Issues == nil {
		r.Issues = []domain.Issue{}
	}
	_, err := s.db.NewInsert().Model(r).Returning("*").Exec(ctx)
	return classify(err)
}

// UpdateReview changes the review's own fields. The song cannot be changed
// here, so a review cannot be moved to another song by accident.
func (s *Store) UpdateReview(ctx context.Context, r *storage.Review) error {
	if r.Issues == nil {
		r.Issues = []domain.Issue{}
	}
	return mustAffect(s.db.NewUpdate().Model(r).
		Column("performed_on", "score", "machine_type", "key_change", "variant", "issues", "notes", "details").
		Where("r.user_id = ? AND r.id = ?", r.UserID, r.ID).
		Returning("*").Exec(ctx))
}

func (s *Store) GetReview(ctx context.Context, userID, id string) (*storage.Review, error) {
	r := new(storage.Review)
	err := s.db.NewSelect().Model(r).Where("r.user_id = ? AND r.id = ?", userID, id).Scan(ctx)
	return r, classify(err)
}

func (s *Store) DeleteReviews(ctx context.Context, userID string, ids []string) (int, error) {
	res, err := s.db.NewDelete().Model((*storage.Review)(nil)).
		Where("user_id = ? AND id IN (?)", userID, bun.List(ids)).Exec(ctx)
	if err != nil {
		return 0, classify(err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func (s *Store) ListReviews(ctx context.Context, userID string, f storage.ReviewFilter, sort storage.ReviewSort, p storage.Page) ([]*storage.Review, int, error) {
	var reviews []*storage.Review
	q := s.db.NewSelect().Model(&reviews).Where("r.user_id = ?", userID)
	if f.MachineType != nil {
		q = q.Where("r.machine_type = ?", *f.MachineType)
	}
	if f.SongID != nil {
		q = q.Where("r.song_id = ?", *f.SongID)
	}
	if f.ArtistID != nil {
		q = q.Where("r.song_id IN (SELECT id FROM songs WHERE user_id = ? AND artist_id = ?)", userID, *f.ArtistID)
	}
	if f.Search != "" {
		pattern := likePattern(domain.SearchKey(f.Search))
		q = q.Where(`r.song_id IN (SELECT s.id FROM songs s JOIN artists a ON a.id = s.artist_id
			WHERE s.user_id = ? AND (myuta_search_key(s.title) LIKE ? OR myuta_search_key(a.name) LIKE ?))`, userID, pattern, pattern)
	}
	if len(f.Genres) > 0 {
		q = q.Where("r.song_id IN (SELECT id FROM songs WHERE user_id = ? AND genres && ?)", userID, pgdialect.Array(pgArray(f.Genres)))
	}
	if f.DateFrom != nil {
		q = q.Where("r.performed_on >= ?", f.DateFrom.Format("2006-01-02"))
	}
	if f.DateTo != nil {
		q = q.Where("r.performed_on <= ?", f.DateTo.Format("2006-01-02"))
	}
	switch sort {
	case storage.ReviewSortDateAsc:
		q = q.OrderExpr("r.performed_on ASC, r.created_at ASC, r.id ASC")
	case storage.ReviewSortScoreDesc:
		q = q.OrderExpr("r.score DESC, r.performed_on DESC, r.created_at DESC, r.id DESC")
	case storage.ReviewSortScoreAsc:
		q = q.OrderExpr("r.score ASC, r.performed_on DESC, r.created_at DESC, r.id DESC")
	default:
		q = q.OrderExpr("r.performed_on DESC, r.created_at DESC, r.id DESC")
	}
	total, err := q.Limit(p.Limit).Offset(p.Offset).ScanAndCount(ctx)
	return reviews, total, classify(err)
}

func (s *Store) ReviewsBySongIDs(ctx context.Context, userID string, songIDs []string) ([]*storage.Review, error) {
	var reviews []*storage.Review
	err := s.db.NewSelect().Model(&reviews).
		Where("r.user_id = ? AND r.song_id IN (?)", userID, bun.List(songIDs)).
		OrderExpr("r.performed_on DESC, r.created_at DESC").Scan(ctx)
	return reviews, classify(err)
}

func (s *Store) ReviewCountsBySongIDs(ctx context.Context, userID string, songIDs []string) (map[string]int, error) {
	var rows []struct {
		SongID string `bun:"song_id"`
		N      int    `bun:"n"`
	}
	err := s.db.NewSelect().Model((*storage.Review)(nil)).
		ColumnExpr("r.song_id, count(*) AS n").
		Where("r.user_id = ? AND r.song_id IN (?)", userID, bun.List(songIDs)).
		GroupExpr("r.song_id").Scan(ctx, &rows)
	out := make(map[string]int, len(rows))
	for _, r := range rows {
		out[r.SongID] = r.N
	}
	return out, classify(err)
}

func (s *Store) BestScores(ctx context.Context, userID string, songIDs []string) (map[storage.SongMachine]float64, error) {
	var rows []struct {
		SongID      string             `bun:"song_id"`
		MachineType domain.MachineType `bun:"machine_type"`
		Best        float64            `bun:"best"`
	}
	err := s.db.NewSelect().Model((*storage.Review)(nil)).
		ColumnExpr("r.song_id, r.machine_type, max(r.score) AS best").
		Where("r.user_id = ? AND r.song_id IN (?)", userID, bun.List(songIDs)).
		GroupExpr("r.song_id, r.machine_type").Scan(ctx, &rows)
	out := make(map[storage.SongMachine]float64, len(rows))
	for _, r := range rows {
		out[storage.SongMachine{SongID: r.SongID, MachineType: r.MachineType}] = r.Best
	}
	return out, classify(err)
}

// ReviewExists reports whether the same take was already recorded (used by
// import to skip duplicates).
func (s *Store) ReviewExists(ctx context.Context, r *storage.Review) (bool, error) {
	ok, err := s.db.NewSelect().Model((*storage.Review)(nil)).
		Where("user_id = ? AND song_id = ? AND performed_on = ? AND machine_type = ? AND score = ? AND key_change = ?",
			r.UserID, r.SongID, r.PerformedOn.Format("2006-01-02"), r.MachineType, r.Score, r.KeyChange).
		Exists(ctx)
	return ok, classify(err)
}

// DashboardStats computes every dashboard number in one round trip.
// Day windows use the review's calendar day (DATE), never a time zone.
func (s *Store) DashboardStats(ctx context.Context, userID string) (*storage.DashboardStats, error) {
	var raw []byte
	err := s.db.NewRaw(`
WITH r AS (SELECT * FROM reviews WHERE user_id = ?0),
machines AS (
  SELECT machine_type, count(*) AS n, round(avg(score), 3) AS avg, max(score) AS best
    FROM r GROUP BY machine_type
),
latest AS (  -- issues of the latest take of each song
  SELECT DISTINCT ON (song_id) issues FROM r ORDER BY song_id, performed_on DESC, created_at DESC
),
issues AS (
  SELECT i AS issue, count(*) AS n FROM latest, unnest(issues) i GROUP BY i
),
practiced AS (
  SELECT r.song_id, s.title, a.name, count(*) AS n, max(r.performed_on) AS last
    FROM r JOIN songs s ON s.id = r.song_id JOIN artists a ON a.id = s.artist_id
   GROUP BY r.song_id, s.title, s.title_key, a.name
   ORDER BY n DESC, last DESC, s.title_key
   LIMIT 1
)
SELECT json_build_object(
  'totalReviews', (SELECT count(*) FROM r),
  'totalSongs', (SELECT count(*) FROM songs WHERE user_id = ?0),
  'totalArtists', (SELECT count(*) FROM artists WHERE user_id = ?0),
  'sessionsLast30Days', (SELECT count(DISTINCT performed_on) FROM r WHERE performed_on > current_date - 30),
  'sessionsPrev30Days', (SELECT count(DISTINCT performed_on) FROM r
                          WHERE performed_on <= current_date - 30 AND performed_on > current_date - 60),
  'mostPracticed', (SELECT json_build_object('songId', song_id, 'title', title, 'artistName', name, 'count', n) FROM practiced),
  'commonIssues', COALESCE((SELECT json_agg(json_build_object('issue', issue, 'count', n) ORDER BY n DESC, issue) FROM issues), '[]'),
  'machineStats', COALESCE((SELECT json_agg(json_build_object('machineType', m.machine_type, 'reviewCount', m.n,
                                             'averageScore', m.avg, 'bestScore', m.best) ORDER BY mt.sort_order)
                              FROM machines m JOIN machine_types mt ON mt.code = m.machine_type), '[]')
)`, userID).Scan(ctx, &raw)
	if err != nil {
		return nil, classify(err)
	}
	stats := &storage.DashboardStats{}
	if err := json.Unmarshal(raw, stats); err != nil {
		return nil, err
	}
	return stats, nil
}

func (s *Store) ExportData(ctx context.Context, userID string) (*storage.ExportData, error) {
	user, err := s.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := &storage.ExportData{User: user}

	var rows []struct {
		storage.Review `bun:"extend"`
		SongTitle      string         `bun:"song_title"`
		ArtistName     string         `bun:"artist_name"`
		Genres         []domain.Genre `bun:"genres,array"`
		YouTubeURL     *string        `bun:"youtube_url"`
	}
	err = s.db.NewSelect().TableExpr("reviews AS r").
		ColumnExpr("r.*, s.title AS song_title, a.name AS artist_name, s.genres, s.youtube_url").
		Join("JOIN songs AS s ON s.id = r.song_id").
		Join("JOIN artists AS a ON a.id = s.artist_id").
		Where("r.user_id = ?", userID).
		OrderExpr("r.performed_on DESC, r.created_at DESC").Scan(ctx, &rows)
	if err != nil {
		return nil, classify(err)
	}
	for i := range rows {
		row := rows[i]
		rev := row.Review
		out.Reviews = append(out.Reviews, &storage.ExportReview{
			Review: &rev, SongTitle: row.SongTitle, ArtistName: row.ArtistName, Genres: row.Genres, YouTubeURL: row.YouTubeURL,
		})
	}

	var favs []struct {
		Title      string         `bun:"title"`
		ArtistName string         `bun:"artist_name"`
		Genres     []domain.Genre `bun:"genres,array"`
		YouTubeURL *string        `bun:"youtube_url"`
	}
	err = s.db.NewSelect().TableExpr("favorite_songs AS f").
		ColumnExpr("s.title, a.name AS artist_name, s.genres, s.youtube_url").
		Join("JOIN songs AS s ON s.id = f.song_id").Join("JOIN artists AS a ON a.id = s.artist_id").
		Where("f.user_id = ?", userID).OrderExpr("f.created_at").Scan(ctx, &favs)
	if err != nil {
		return nil, classify(err)
	}
	for _, f := range favs {
		out.FavoriteSongs = append(out.FavoriteSongs, &storage.ExportSong{SongTitle: f.Title, ArtistName: f.ArtistName, Genres: f.Genres, YouTubeURL: f.YouTubeURL})
	}

	err = s.db.NewSelect().TableExpr("favorite_artists AS f").ColumnExpr("a.name").
		Join("JOIN artists AS a ON a.id = f.artist_id").
		Where("f.user_id = ?", userID).OrderExpr("f.created_at").Scan(ctx, &out.FavoriteArtists)
	if err != nil {
		return nil, classify(err)
	}

	var goals []struct {
		Title       string             `bun:"title"`
		ArtistName  string             `bun:"artist_name"`
		MachineType domain.MachineType `bun:"machine_type"`
		TargetScore float64            `bun:"target_score"`
	}
	err = s.db.NewSelect().TableExpr("song_goals AS g").
		ColumnExpr("s.title, a.name AS artist_name, g.machine_type, g.target_score").
		Join("JOIN songs AS s ON s.id = g.song_id").Join("JOIN artists AS a ON a.id = s.artist_id").
		Where("g.user_id = ?", userID).OrderExpr("s.title_key, g.machine_type").Scan(ctx, &goals)
	if err != nil {
		return nil, classify(err)
	}
	for _, g := range goals {
		out.Goals = append(out.Goals, &storage.ExportGoal{SongTitle: g.Title, ArtistName: g.ArtistName, MachineType: g.MachineType, TargetScore: g.TargetScore})
	}
	return out, nil
}
