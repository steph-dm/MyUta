package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/ratelimit"
	"github.com/steph-dm/MyUta/backend/internal/scalar"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/validator"
)

// ExportFormatVersion is written into every JSON export. Version 1 files
// (written before the field existed) are still accepted by Import.
const ExportFormatVersion = 2

// DataService exports and imports a user's data.
type DataService struct{ d Deps }

// --- export ---------------------------------------------------------------------------------------

type exportReview struct {
	Date        string               `json:"date"`
	Score       float64              `json:"score"`
	MachineType domain.MachineType   `json:"machineType"`
	KeyChange   int                  `json:"keyChange"`
	Variant     *string              `json:"variant"`
	Issues      []domain.Issue       `json:"issues"`
	Notes       *string              `json:"notes"`
	Details     *domain.ScoreDetails `json:"details,omitempty"`
	Song        string               `json:"song"`
	Artist      string               `json:"artist"`
	Genres      []domain.Genre       `json:"genres"`
	YouTubeURL  *string              `json:"youtubeUrl"`
}

type exportFavorite struct {
	Song       string         `json:"song"`
	Artist     string         `json:"artist"`
	Genres     []domain.Genre `json:"genres"`
	YouTubeURL *string        `json:"youtubeUrl"`
}

type exportGoal struct {
	Song        string             `json:"song"`
	Artist      string             `json:"artist"`
	MachineType domain.MachineType `json:"machineType"`
	TargetScore float64            `json:"targetScore"`
}

type exportDoc struct {
	Format          string           `json:"format"`
	Version         int              `json:"version"`
	ExportedAt      string           `json:"exportedAt"`
	Profile         map[string]any   `json:"profile"`
	Reviews         []exportReview   `json:"reviews"`
	Favorites       []exportFavorite `json:"favorites"`
	FavoriteArtists []string         `json:"favoriteArtists"`
	Goals           []exportGoal     `json:"goals"`
}

// ExportFile is a ready-to-download file.
type ExportFile struct {
	Filename    string
	ContentType string
	Body        []byte
}

// csvColumns is the CSV layout, used for export and recognised on import.
var csvColumns = []string{"date", "song", "artist", "score", "machine_type", "key_change", "variant", "genres", "issues", "notes", "youtube_url"}

func (s *DataService) Export(ctx context.Context, format string) (*ExportFile, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	data, err := s.d.Store.ExportData(ctx, id.UserID)
	if err != nil {
		return nil, err
	}
	now := s.d.Now()
	base := "myuta-export-" + now.Format("2006-01-02")

	reviews := make([]exportReview, 0, len(data.Reviews))
	for _, r := range data.Reviews {
		reviews = append(reviews, exportReview{
			Date: scalar.FormatDate(r.Review.PerformedOn), Score: r.Review.Score, MachineType: r.Review.MachineType,
			KeyChange: r.Review.KeyChange, Variant: r.Review.Variant, Issues: nonNil(r.Review.Issues), Notes: r.Review.Notes,
			Details: r.Review.Details, Song: r.SongTitle, Artist: r.ArtistName, Genres: nonNil(r.Genres), YouTubeURL: r.YouTubeURL,
		})
	}

	switch format {
	case "csv":
		var buf bytes.Buffer
		buf.WriteString("\uFEFF") // byte-order mark: Excel then reads the file as UTF-8
		w := csv.NewWriter(&buf)
		_ = w.Write(csvColumns)
		for _, r := range reviews {
			_ = w.Write([]string{
				r.Date, csvSafe(r.Song), csvSafe(r.Artist), strconv.FormatFloat(r.Score, 'f', -1, 64),
				string(r.MachineType), strconv.Itoa(r.KeyChange), csvSafe(deref(r.Variant)),
				joinEnum(r.Genres), joinEnum(r.Issues), csvSafe(deref(r.Notes)), csvSafe(deref(r.YouTubeURL)),
			})
		}
		w.Flush()
		return &ExportFile{Filename: base + ".csv", ContentType: "text/csv; charset=utf-8", Body: buf.Bytes()}, w.Error()
	case "json", "":
		doc := exportDoc{
			Format: "myuta-export", Version: ExportFormatVersion, ExportedAt: now.UTC().Format(time.RFC3339),
			Profile: map[string]any{
				"name": data.User.Name, "defaultMachineType": data.User.DefaultMachineType,
				"language": data.User.Language, "createdAt": data.User.CreatedAt.UTC().Format(time.RFC3339),
			},
			Reviews: reviews, Favorites: []exportFavorite{}, FavoriteArtists: nonNil(data.FavoriteArtists), Goals: []exportGoal{},
		}
		for _, f := range data.FavoriteSongs {
			doc.Favorites = append(doc.Favorites, exportFavorite{Song: f.SongTitle, Artist: f.ArtistName, Genres: nonNil(f.Genres), YouTubeURL: f.YouTubeURL})
		}
		for _, g := range data.Goals {
			doc.Goals = append(doc.Goals, exportGoal{Song: g.SongTitle, Artist: g.ArtistName, MachineType: g.MachineType, TargetScore: g.TargetScore})
		}
		body, err := json.MarshalIndent(doc, "", "  ")
		return &ExportFile{Filename: base + ".json", ContentType: "application/json; charset=utf-8", Body: body}, err
	default:
		return nil, apperror.BadInput(apperror.ReasonInvalidImport, "format", "Format must be json or csv")
	}
}

// csvSafe stops spreadsheet programs from running cell contents as formulas.
func csvSafe(s string) string {
	if s != "" && strings.ContainsRune("=+-@\t\r", rune(s[0])) {
		return "'" + s
	}
	return s
}

// csvUnsafe reverses csvSafe on import.
func csvUnsafe(s string) string {
	if len(s) > 1 && s[0] == '\'' && strings.ContainsRune("=+-@\t\r", rune(s[1])) {
		return s[1:]
	}
	return s
}

// --- import ----------------------------------------------------------------------------------------

// RowError explains why one entry of an import file was skipped.
type RowError struct {
	Section string // reviews, favorites, favoriteArtists, goals
	Row     int    // 1-based entry number (for CSV: the line number)
	Field   string
	Code    string
	Message string
}

type ImportResult struct {
	ReviewsImported   int
	ReviewsDuplicate  int
	ReviewsSkipped    int
	FavoritesImported int
	GoalsImported     int
	Errors            []RowError
}

// importReview accepts version 1 (RFC 3339 dates, no keyChange) and version 2.
type importReview struct {
	Date        string               `json:"date"`
	Score       json.Number          `json:"score"`
	MachineType string               `json:"machineType"`
	KeyChange   int                  `json:"keyChange"`
	Variant     *string              `json:"variant"`
	Issues      []string             `json:"issues"`
	Notes       *string              `json:"notes"`
	Details     *domain.ScoreDetails `json:"details"`
	Song        string               `json:"song"`
	Artist      string               `json:"artist"`
	Genres      []string             `json:"genres"`
	YouTubeURL  *string              `json:"youtubeUrl"`
	row         int
	keyErr      *RowError
}

type importDoc struct {
	Version         int              `json:"version"`
	Reviews         []importReview   `json:"reviews"`
	Favorites       []exportFavorite `json:"favorites"`
	FavoriteArtists []string         `json:"favoriteArtists"`
	Goals           []exportGoal     `json:"goals"`
}

func invalidImport(msg string) error {
	return apperror.BadInput(apperror.ReasonInvalidImport, "file", msg)
}

func (s *DataService) Import(ctx context.Context, filename string, file io.Reader) (*ImportResult, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := s.d.Limiter.Take(ratelimit.Import, id.UserID); err != nil {
		return nil, err
	}
	data, err := io.ReadAll(io.LimitReader(file, config.MaxUploadBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > config.MaxUploadBytes {
		return nil, apperror.TooLarge(config.MaxUploadBytes)
	}
	doc, err := parseImport(filename, data)
	if err != nil {
		return nil, err
	}
	if len(doc.Reviews) > config.MaxImportRows {
		return nil, apperror.BadInput(apperror.ReasonImportTooManyRows, "file",
			fmt.Sprintf("A file can contain at most %d reviews", config.MaxImportRows))
	}

	res := &ImportResult{Errors: []RowError{}}
	type validRow struct {
		song   *cleanSong
		review ReviewInput
	}
	var rows []validRow
	for i, r := range doc.Reviews {
		row := r.row
		if row == 0 {
			row = i + 1
		}
		song, in, rowErr := validateImportRow(r, s.d.Now())
		if rowErr != nil {
			rowErr.Section, rowErr.Row = "reviews", row
			res.Errors = append(res.Errors, *rowErr)
			res.ReviewsSkipped++
			continue
		}
		rows = append(rows, validRow{song: song, review: in})
	}

	err = s.d.Store.InTx(ctx, func(tx storage.Store) error {
		songIDs := map[string]string{}
		songID := func(c *cleanSong) (string, error) {
			k := domain.NormalizeKey(c.artist) + "\x00" + domain.NormalizeKey(c.title)
			if v, ok := songIDs[k]; ok {
				return v, nil
			}
			v, err := ensureSong(ctx, tx, id.UserID, c)
			if err == nil {
				songIDs[k] = v
			}
			return v, err
		}
		for _, row := range rows {
			sid, err := songID(row.song)
			if err != nil {
				return err
			}
			rev := &storage.Review{ID: uuid.NewString(), UserID: id.UserID, SongID: sid}
			if err := row.review.apply(rev, s.d.Now()); err != nil {
				return err // already validated; cannot happen
			}
			dup, err := tx.ReviewExists(ctx, rev)
			if err != nil {
				return err
			}
			if dup {
				res.ReviewsDuplicate++
				continue
			}
			if err := tx.CreateReview(ctx, rev); err != nil {
				return err
			}
			res.ReviewsImported++
		}
		for i, f := range doc.Favorites {
			c, err := SongInput{Title: csvUnsafe(f.Song), ArtistName: csvUnsafe(f.Artist), Genres: f.Genres, YouTubeURL: f.YouTubeURL}.clean()
			if err != nil {
				res.Errors = append(res.Errors, rowError("favorites", i+1, err))
				continue
			}
			sid, err := songID(c)
			if err != nil {
				return err
			}
			if err := tx.SetSongFavorite(ctx, id.UserID, sid, true); err != nil {
				return err
			}
			res.FavoritesImported++
		}
		for i, name := range doc.FavoriteArtists {
			clean, err := validator.ArtistName(csvUnsafe(name))
			if err != nil {
				res.Errors = append(res.Errors, rowError("favoriteArtists", i+1, err))
				continue
			}
			a, err := tx.EnsureArtist(ctx, id.UserID, clean)
			if err != nil {
				return err
			}
			if err := tx.SetArtistFavorite(ctx, id.UserID, a.ID, true); err != nil {
				return err
			}
		}
		for i, g := range doc.Goals {
			c, err := SongInput{Title: g.Song, ArtistName: g.Artist}.clean()
			if err == nil && (!g.MachineType.IsValid() || g.TargetScore <= 0 || g.TargetScore > 100) {
				err = apperror.BadInput(apperror.ReasonScoreRange, "targetScore", "Invalid goal")
			}
			if err != nil {
				res.Errors = append(res.Errors, rowError("goals", i+1, err))
				continue
			}
			sid, err := songID(c)
			if err != nil {
				return err
			}
			target := g.TargetScore
			if err := tx.SetGoal(ctx, id.UserID, sid, g.MachineType, &target); err != nil {
				return err
			}
			res.GoalsImported++
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return res, nil
}

func validateImportRow(r importReview, now time.Time) (*cleanSong, ReviewInput, *RowError) {
	if r.keyErr != nil {
		return nil, ReviewInput{}, r.keyErr
	}
	date, err := parseImportDate(r.Date)
	if err != nil {
		return nil, ReviewInput{}, toRowError(err)
	}
	score, err := r.Score.Float64()
	if err != nil {
		return nil, ReviewInput{}, toRowError(apperror.BadInput(apperror.ReasonScoreRange, "score", "Score must be a number"))
	}
	genres := make([]domain.Genre, 0, len(r.Genres))
	for _, g := range r.Genres {
		genres = append(genres, domain.Genre(strings.ToUpper(strings.TrimSpace(g))))
	}
	issues := make([]domain.Issue, 0, len(r.Issues))
	for _, i := range r.Issues {
		issues = append(issues, domain.Issue(strings.ToUpper(strings.TrimSpace(i))))
	}
	song, err := SongInput{Title: csvUnsafe(r.Song), ArtistName: csvUnsafe(r.Artist), Genres: genres, YouTubeURL: r.YouTubeURL, GeneratedYoutube: false}.clean()
	if err != nil {
		return nil, ReviewInput{}, toRowError(err)
	}
	in := ReviewInput{
		Date: date, Score: score, MachineType: domain.MachineType(strings.ToUpper(strings.TrimSpace(r.MachineType))),
		KeyChange: r.KeyChange, Variant: r.Variant, Issues: issues, Notes: r.Notes, Details: r.Details,
	}
	if err := in.apply(&storage.Review{}, now); err != nil { // validation only
		return nil, ReviewInput{}, toRowError(err)
	}
	return song, in, nil
}

// parseImportDate accepts YYYY-MM-DD and RFC 3339. Version-1 files stored the
// chosen day at midnight UTC, so the UTC calendar day is the intended day.
func parseImportDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if d, err := scalar.ParseDate(s); err == nil {
		return d, nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		t = t.UTC()
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, apperror.BadInput(apperror.ReasonDateInvalid, "date", "Date must look like 2026-11-21")
}

func toRowError(err error) *RowError {
	var ae *apperror.AppError
	if errors.As(err, &ae) {
		return &RowError{Field: ae.Field, Code: string(ae.Reason), Message: ae.Message}
	}
	return &RowError{Code: string(apperror.ReasonInvalidImport), Message: "Invalid entry"}
}

func rowError(section string, row int, err error) RowError {
	re := toRowError(err)
	re.Section, re.Row = section, row
	return *re
}

func parseImport(filename string, data []byte) (*importDoc, error) {
	trimmed := bytes.TrimSpace(bytes.TrimPrefix(data, []byte("\uFEFF")))
	if len(trimmed) == 0 {
		return nil, invalidImport("The file is empty")
	}
	if trimmed[0] == '{' || strings.HasSuffix(strings.ToLower(filename), ".json") {
		var doc importDoc
		dec := json.NewDecoder(bytes.NewReader(trimmed))
		dec.UseNumber()
		if err := dec.Decode(&doc); err != nil {
			return nil, invalidImport("The file is not valid MyUta JSON")
		}
		if doc.Version > ExportFormatVersion {
			return nil, invalidImport("This file was made by a newer version of MyUta")
		}
		return &doc, nil
	}
	return parseCSV(trimmed)
}

// parseCSV reads the CSV export (and the older column names).
func parseCSV(data []byte) (*importDoc, error) {
	r := csv.NewReader(bytes.NewReader(data))
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil || len(records) == 0 {
		return nil, invalidImport("The file is not valid CSV")
	}
	col := map[string]int{}
	for i, h := range records[0] {
		col[strings.ReplaceAll(strings.ToLower(strings.TrimSpace(h)), "_", "")] = i
	}
	for _, required := range []string{"date", "song", "artist", "score", "machinetype"} {
		if _, ok := col[required]; !ok {
			return nil, invalidImport("The CSV header must contain date, song, artist, score and machine_type")
		}
	}
	get := func(rec []string, name string) string {
		if i, ok := col[name]; ok && i < len(rec) {
			return strings.TrimSpace(rec[i])
		}
		return ""
	}
	opt := func(rec []string, name string) *string {
		v := csvUnsafe(get(rec, name))
		if v == "" {
			return nil
		}
		return &v
	}
	list := func(v string) []string {
		var out []string
		for _, p := range strings.FieldsFunc(v, func(r rune) bool { return r == ';' || r == ',' || r == '|' }) {
			if p = strings.TrimSpace(p); p != "" {
				out = append(out, p)
			}
		}
		return out
	}
	doc := &importDoc{Version: ExportFormatVersion}
	for i, rec := range records[1:] {
		if len(rec) == 1 && strings.TrimSpace(rec[0]) == "" {
			continue
		}
		ir := importReview{
			Date: get(rec, "date"), Score: json.Number(get(rec, "score")), MachineType: get(rec, "machinetype"),
			Variant: opt(rec, "variant"), Issues: list(get(rec, "issues")), Notes: opt(rec, "notes"),
			Song: get(rec, "song"), Artist: get(rec, "artist"), Genres: list(get(rec, "genres")),
			YouTubeURL: opt(rec, "youtubeurl"), row: i + 2,
		}
		if k := get(rec, "keychange"); k != "" {
			n, err := strconv.Atoi(strings.TrimPrefix(csvUnsafe(k), "+"))
			if err != nil {
				ir.keyErr = &RowError{Field: "keyChange", Code: string(apperror.ReasonKeyChangeRange), Message: "Key change must be a whole number"}
			}
			ir.KeyChange = n
		}
		doc.Reviews = append(doc.Reviews, ir)
	}
	return doc, nil
}

func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func joinEnum[T ~string](vals []T) string {
	out := make([]string, len(vals))
	for i, v := range vals {
		out[i] = string(v)
	}
	return strings.Join(out, ";")
}
