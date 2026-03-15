package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/uptrace/bun"
	"golang.org/x/sync/errgroup"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

func (s *Store) GetReview(ctx context.Context, id string) (*storage.Review, error) {
	review := new(storage.Review)
	err := s.DB.NewSelect().Model(review).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, storage.WrapNotFound(err, "review")
	}
	return review, nil
}

func (s *Store) CreateReview(ctx context.Context, review *storage.Review) error {
	if _, err := s.DB.NewInsert().Model(review).Exec(ctx); err != nil {
		return fmt.Errorf("can't create review: %w", err)
	}
	return nil
}

func (s *Store) UpdateReview(ctx context.Context, review *storage.Review) error {
	review.UpdatedAt = scalar.Now()
	if _, err := s.DB.NewUpdate().Model(review).
		Column("songId", "date", "score", "machineType", "issues", "notes", "updatedAt").
		Where("id = ?", review.ID).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update review: %w", err)
	}
	return nil
}

func (s *Store) DeleteReview(ctx context.Context, id string) error {
	if _, err := s.DB.NewDelete().Model((*storage.Review)(nil)).Where("id = ?", id).Exec(ctx); err != nil {
		return fmt.Errorf("can't delete review: %w", err)
	}
	return nil
}

func (s *Store) DeleteReviewBatch(ctx context.Context, ids []string, userID string) (int, error) {
	res, err := s.DB.NewDelete().Model((*storage.Review)(nil)).
		Where("id IN (?)", bun.List(ids)).
		Where(`"userId" = ?`, userID).
		Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("can't delete reviews: %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func (s *Store) GetReviewOwnerID(ctx context.Context, reviewID string) (string, error) {
	var ownerID string
	err := s.DB.NewSelect().Model((*storage.Review)(nil)).
		ColumnExpr(`"userId"`).
		Where("id = ?", reviewID).
		Scan(ctx, &ownerID)
	if err != nil {
		return "", storage.WrapNotFound(err, "review")
	}
	return ownerID, nil
}

func (s *Store) VerifyReviewOwnership(ctx context.Context, ids []string) (map[string]string, error) {
	type row struct {
		ID     string `bun:"id"`
		UserID string `bun:"userId"`
	}
	var rows []row
	err := s.DB.NewSelect().Model((*storage.Review)(nil)).
		ColumnExpr(`"id", "userId"`).
		Where("id IN (?)", bun.List(ids)).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("can't verify review ownership: %w", err)
	}
	result := make(map[string]string, len(rows))
	for _, r := range rows {
		result[r.ID] = r.UserID
	}
	return result, nil
}

func (s *Store) ListReviewsByUser(ctx context.Context, userID string) ([]*storage.Review, error) {
	var reviews []*storage.Review
	err := s.DB.NewSelect().Model(&reviews).
		Where(`"userId" = ?`, userID).
		OrderExpr("date DESC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list reviews: %w", err)
	}
	return reviews, nil
}

func (s *Store) ReviewCount(ctx context.Context, userID, songID string) (int, error) {
	n, err := s.DB.NewSelect().Model((*storage.Review)(nil)).
		Where(`"songId" = ?`, songID).
		Where(`"userId" = ?`, userID).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("can't count reviews: %w", err)
	}
	return n, nil
}

const reviewWithSongJoinQuery = `
	SELECT
		r.id, r.date, r."userId", r."songId", r.score,
		r."machineType", r.issues, r.notes, r."createdAt", r."updatedAt",
		s.id, s.title, s."artistId", s.genres,
		s."youtubeUrl", s."generatedYoutube", s."createdAt", s."updatedAt",
		a.id, a.name, a."createdAt", a."updatedAt",
		u.id, u.email, u.name, u.birthdate,
		u."isAdmin", u."defaultMachineType", u."deletedAt",
		u."createdAt", u."updatedAt"
	FROM reviews r
	JOIN songs s ON r."songId" = s.id
	JOIN artists a ON s."artistId" = a.id
	JOIN users u ON r."userId" = u.id`

func (s *Store) scanReviewsWithSong(ctx context.Context, query string, args ...any) ([]*storage.ReviewWithSong, error) {
	rows, err := s.DB.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("can't query reviews with song: %w", err)
	}
	defer rows.Close()

	var results []*storage.ReviewWithSong
	for rows.Next() {
		var rw storage.ReviewWithSong
		var song storage.Song
		var a storage.Artist
		var u storage.User

		var machineType string
		var issueStrs []string
		var genreStrs []string
		var userMachineType *string
		var userDeletedAt *time.Time

		err := rows.Scan(
			&rw.ID, &rw.Date, &rw.UserID, &rw.SongID, &rw.Score,
			&machineType, pqStringArray(&issueStrs), &rw.Notes, &rw.CreatedAt, &rw.UpdatedAt,
			&song.ID, &song.Title, &song.ArtistID, pqStringArray(&genreStrs),
			&song.YouTubeURL, &song.GeneratedYoutube, &song.CreatedAt, &song.UpdatedAt,
			&a.ID, &a.Name, &a.CreatedAt, &a.UpdatedAt,
			&u.ID, &u.Email, &u.Name, &u.Birthdate,
			&u.IsAdmin, &userMachineType, &userDeletedAt,
			&u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("can't scan review with song: %w", err)
		}

		rw.MachineType = storage.MachineType(machineType)
		rw.Issues = make([]storage.Issue, len(issueStrs))
		for i, iss := range issueStrs {
			rw.Issues[i] = storage.Issue(iss)
		}

		song.Genres = make([]storage.Genre, len(genreStrs))
		for i, g := range genreStrs {
			song.Genres[i] = storage.Genre(g)
		}

		if userMachineType != nil {
			machineType := storage.MachineType(*userMachineType)
			u.DefaultMachineType = &machineType
		}
		if userDeletedAt != nil {
			deletedAt := scalar.FromTime(*userDeletedAt)
			u.DeletedAt = &deletedAt
		}

		song.LoadedArtist = &a
		rw.LoadedSong = &song
		rw.LoadedUser = &u
		results = append(results, &rw)
	}
	return results, rows.Err()
}

func (s *Store) ListReviewsWithSongByUser(ctx context.Context, userID string) ([]*storage.ReviewWithSong, error) {
	query := reviewWithSongJoinQuery + ` WHERE r."userId" = $1 ORDER BY r.date DESC`
	return s.scanReviewsWithSong(ctx, query, userID)
}

func (s *Store) ListReviewsWithSongBySong(ctx context.Context, songID, userID string) ([]*storage.ReviewWithSong, error) {
	query := reviewWithSongJoinQuery + ` WHERE r."songId" = $1 AND r."userId" = $2 ORDER BY r.date DESC`
	return s.scanReviewsWithSong(ctx, query, songID, userID)
}


func (s *Store) RecentReviewsWithSong(ctx context.Context, userID string, cutoff time.Time) ([]*storage.ReviewWithSong, error) {
	query := reviewWithSongJoinQuery + ` WHERE r."userId" = $1 AND r.date >= $2 ORDER BY r.date DESC`
	return s.scanReviewsWithSong(ctx, query, userID, cutoff)
}

func (s *Store) GetDashboardStats(ctx context.Context, userID string) (*storage.DashboardStats, error) {
	stats := &storage.DashboardStats{}
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		row := s.DB.DB.QueryRowContext(ctx, `
			SELECT
				COUNT(*),
				AVG(CASE WHEN "machineType" = 'DAM' THEN score END),
				AVG(CASE WHEN "machineType" = 'JOYSOUND' THEN score END)
			FROM reviews
			WHERE "userId" = $1`, userID)

		return row.Scan(&stats.TotalReviews, &stats.DAMAvgScore, &stats.JoysoundAvgScore)
	})

	g.Go(func() error {
		now := time.Now()
		thisStart := now.AddDate(0, 0, -30)
		prevStart := now.AddDate(0, 0, -60)

		row := s.DB.DB.QueryRowContext(ctx, `
			SELECT
				COUNT(DISTINCT CASE WHEN date >= $2 THEN date::date END),
				COUNT(DISTINCT CASE WHEN date >= $3 AND date < $2 THEN date::date END)
			FROM reviews
			WHERE "userId" = $1`, userID, thisStart, prevStart)

		return row.Scan(&stats.SessionsThisMonth, &stats.SessionsPrevMonth)
	})

	g.Go(func() error {
		var mp storage.MostPracticedSong
		row := s.DB.DB.QueryRowContext(ctx, `
			SELECT r."songId", s.title, a.name, COUNT(*)
			FROM reviews r
			JOIN songs s ON s.id = r."songId"
			JOIN artists a ON a.id = s."artistId"
			WHERE r."userId" = $1
			GROUP BY r."songId", s.title, a.name
			ORDER BY COUNT(*) DESC
			LIMIT 1`, userID)

		err := row.Scan(&mp.SongID, &mp.Title, &mp.ArtistName, &mp.Count)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil
			}
			return fmt.Errorf("can't get most practiced song: %w", err)
		}
		stats.MostPracticed = &mp
		return nil
	})

	g.Go(func() error {
		rows, err := s.DB.DB.QueryContext(ctx, `
			WITH latest AS (
				SELECT DISTINCT ON ("songId") issues
				FROM reviews
				WHERE "userId" = $1
				ORDER BY "songId", date DESC
			)
			SELECT issue, COUNT(*) as cnt
			FROM latest, unnest(issues) AS issue
			GROUP BY issue
			ORDER BY cnt DESC`, userID)
		if err != nil {
			return fmt.Errorf("can't get common issues: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var is storage.IssueStat
			var issueStr string
			if err := rows.Scan(&issueStr, &is.Count); err != nil {
				return fmt.Errorf("can't scan issue stat: %w", err)
			}
			is.Issue = storage.Issue(issueStr)
			stats.CommonIssues = append(stats.CommonIssues, &is)
		}
		return rows.Err()
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("can't get dashboard stats: %w", err)
	}

	if stats.CommonIssues == nil {
		stats.CommonIssues = []*storage.IssueStat{}
	}

	return stats, nil
}

type stringArrayScanner struct {
	dest *[]string
}

func pqStringArray(dest *[]string) *stringArrayScanner {
	return &stringArrayScanner{dest: dest}
}

func (sc *stringArrayScanner) Scan(src any) error {
	if src == nil {
		*sc.dest = nil
		return nil
	}

	var raw string
	switch v := src.(type) {
	case []byte:
		raw = string(v)
	case string:
		raw = v
	default:
		*sc.dest = nil
		return nil
	}

	raw = strings.TrimPrefix(raw, "{")
	raw = strings.TrimSuffix(raw, "}")
	if raw == "" {
		*sc.dest = []string{}
		return nil
	}

	*sc.dest = parsePgArray(raw)
	return nil
}

// parsePgArray handles quoted PostgreSQL array elements (e.g. {"foo,bar",baz}).
func parsePgArray(raw string) []string {
	var result []string
	var current strings.Builder
	inQuote := false

	for i := 0; i < len(raw); i++ {
		ch := raw[i]
		switch {
		case ch == '"' && !inQuote:
			inQuote = true
		case ch == '"' && inQuote:
			if i+1 < len(raw) && raw[i+1] == '"' {
				current.WriteByte('"')
				i++
			} else {
				inQuote = false
			}
		case ch == '\\' && inQuote:
			if i+1 < len(raw) {
				i++
				current.WriteByte(raw[i])
			}
		case ch == ',' && !inQuote:
			result = append(result, current.String())
			current.Reset()
		default:
			current.WriteByte(ch)
		}
	}
	result = append(result, current.String())
	return result
}
