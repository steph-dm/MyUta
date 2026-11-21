// Package validator checks and normalises user input. Every function returns
// an *apperror.AppError with a stable reason so that clients can translate it.
// Lengths are counted in characters (runes), never bytes, except for the
// password maximum which is a real bcrypt limit in bytes.
package validator

import (
	"math"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
)

const (
	PasswordMinChars = 12
	PasswordMaxBytes = 72 // bcrypt ignores everything after 72 bytes
	NameMaxChars     = 30
	TitleMaxChars    = 200
	ArtistMaxChars   = 200
	NotesMaxChars    = 1000
	VariantMaxChars  = 100
	GradeMaxChars    = 5
	MaxPageSize      = 100
	MaxBatchIDs      = 100
	KeyChangeMax     = 12
	MaxTotalPoints   = 100_000_000
)

// earliestDate is only a sanity bound against typos such as year 0202.
var earliestDate = time.Date(1970, 1, 1, 0, 0, 0, 0, time.UTC)

// NormalizeEmail trims and lower-cases an address. It is the only place
// where e-mail addresses are normalised.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// Email validates an already normalised address.
func Email(email string) error {
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || !strings.Contains(email[strings.LastIndex(email, "@")+1:], ".") || utf8.RuneCountInString(email) > 254 {
		return apperror.BadInput(apperror.ReasonInvalidEmail, "email", "Invalid email address")
	}
	return nil
}

// Password applies the password policy: a minimum length and bcrypt's byte
// limit. There are no composition rules: length is what makes passwords strong.
func Password(password, field string) error {
	if utf8.RuneCountInString(password) < PasswordMinChars {
		return apperror.BadInput(apperror.ReasonPasswordTooShort, field, "Password must be at least 12 characters long")
	}
	if len(password) > PasswordMaxBytes {
		return apperror.BadInput(apperror.ReasonPasswordTooLong, field, "Password cannot be longer than 72 bytes")
	}
	return nil
}

// Name cleans and validates a display name.
func Name(name string) (string, error) {
	name = domain.CleanText(name)
	if n := utf8.RuneCountInString(name); n < 1 || n > NameMaxChars {
		return "", apperror.BadInput(apperror.ReasonNameLength, "name", "Name must be between 1 and 30 characters")
	}
	return name, nil
}

func SongTitle(title string) (string, error) {
	title = domain.CleanText(title)
	if n := utf8.RuneCountInString(title); n < 1 || n > TitleMaxChars {
		return "", apperror.BadInput(apperror.ReasonTitleLength, "title", "Song title must be between 1 and 200 characters")
	}
	return title, nil
}

func ArtistName(name string) (string, error) {
	name = domain.CleanText(name)
	if n := utf8.RuneCountInString(name); n < 1 || n > ArtistMaxChars {
		return "", apperror.BadInput(apperror.ReasonArtistNameLength, "artistName", "Artist name must be between 1 and 200 characters")
	}
	return name, nil
}

// Notes trims notes; blank notes become nil.
func Notes(notes *string) (*string, error) {
	return optionalText(notes, NotesMaxChars, apperror.ReasonNotesLength, "notes", "Notes cannot exceed 1000 characters")
}

// Variant trims the variant label (e.g. "Hard Rock", "-2 key"); blank becomes nil.
func Variant(v *string) (*string, error) {
	if v == nil {
		return nil, nil
	}
	clean := domain.CleanText(*v)
	return optionalText(&clean, VariantMaxChars, apperror.ReasonVariantLength, "variant", "Variant cannot exceed 100 characters")
}

func optionalText(s *string, maxChars int, reason apperror.Reason, field, msg string) (*string, error) {
	if s == nil {
		return nil, nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil, nil
	}
	if utf8.RuneCountInString(t) > maxChars {
		return nil, apperror.BadInput(reason, field, msg)
	}
	return &t, nil
}

// Score validates a 0-100 score and rounds it to three decimals.
func Score(score float64) (float64, error) {
	if math.IsNaN(score) || math.IsInf(score, 0) || score < 0 || score > 100 {
		return 0, apperror.BadInput(apperror.ReasonScoreRange, "score", "Score must be between 0 and 100")
	}
	return math.Round(score*1000) / 1000, nil
}

func KeyChange(k int) error {
	if k < -KeyChangeMax || k > KeyChangeMax {
		return apperror.BadInput(apperror.ReasonKeyChangeRange, "keyChange", "Key change must be between -12 and +12")
	}
	return nil
}

// PerformedOn validates a calendar day. "Today" is taken generously (UTC+14)
// so that users ahead of UTC can always log tonight's session.
func PerformedOn(d time.Time, now time.Time) error {
	latest := now.UTC().Add(14 * time.Hour).Truncate(24 * time.Hour)
	if d.After(latest) {
		return apperror.BadInput(apperror.ReasonDateInFuture, "date", "Date cannot be in the future")
	}
	if d.Before(earliestDate) {
		return apperror.BadInput(apperror.ReasonDateInvalid, "date", "Date is not valid")
	}
	return nil
}

// Genres validates genres and removes duplicates, keeping the order.
func Genres(genres []domain.Genre) ([]domain.Genre, error) {
	out := make([]domain.Genre, 0, len(genres))
	seen := map[domain.Genre]bool{}
	for _, g := range genres {
		if !g.IsValid() {
			return nil, apperror.BadInput(apperror.ReasonInvalidGenre, "genres", "Invalid genre")
		}
		if !seen[g] {
			seen[g] = true
			out = append(out, g)
		}
	}
	return out, nil
}

// Issues validates issues and removes duplicates, keeping the order.
func Issues(issues []domain.Issue) ([]domain.Issue, error) {
	out := make([]domain.Issue, 0, len(issues))
	seen := map[domain.Issue]bool{}
	for _, i := range issues {
		if !i.IsValid() {
			return nil, apperror.BadInput(apperror.ReasonInvalidIssue, "issues", "Invalid issue")
		}
		if !seen[i] {
			seen[i] = true
			out = append(out, i)
		}
	}
	return out, nil
}

func MachineType(m domain.MachineType, field string) error {
	if !m.IsValid() {
		return apperror.BadInput(apperror.ReasonInvalidMachine, field, "Invalid machine type")
	}
	return nil
}

func Language(lang string) error {
	if lang != "en" && lang != "ja" {
		return apperror.BadInput(apperror.ReasonInvalidLanguage, "language", "Unsupported language")
	}
	return nil
}

// Details validates a score breakdown; an empty breakdown becomes nil.
func Details(d *domain.ScoreDetails) (*domain.ScoreDetails, error) {
	if d.IsEmpty() {
		return nil, nil
	}
	for name, v := range d.Percentages() {
		if v != nil && (math.IsNaN(*v) || *v < 0 || *v > 100) {
			return nil, apperror.BadInput(apperror.ReasonDetailsRange, "details."+name, "Breakdown values must be between 0 and 100")
		}
	}
	if d.TotalPoints != nil && (*d.TotalPoints < 0 || *d.TotalPoints > MaxTotalPoints) {
		return nil, apperror.BadInput(apperror.ReasonDetailsRange, "details.totalPoints", "Total points out of range")
	}
	if d.Grade != nil {
		g := strings.TrimSpace(*d.Grade)
		if utf8.RuneCountInString(g) > GradeMaxChars {
			return nil, apperror.BadInput(apperror.ReasonDetailsRange, "details.grade", "Grade is too long")
		}
		if g == "" {
			d.Grade = nil
		} else {
			d.Grade = &g
		}
	}
	return d, nil
}

// youtubeHosts are the hosts accepted for song links. The frontend uses the
// same list (src/lib/youtube.ts).
var youtubeHosts = map[string]bool{
	"youtube.com": true, "www.youtube.com": true, "m.youtube.com": true,
	"music.youtube.com": true, "youtu.be": true,
}

var videoIDRe = regexp.MustCompile(`^[A-Za-z0-9_-]{6,20}$`)

// YouTubeURL trims the link and checks that it points to a YouTube video.
// Empty becomes nil.
func YouTubeURL(raw *string) (*string, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	s := strings.TrimSpace(*raw)
	if VideoID(s) == "" {
		return nil, apperror.BadInput(apperror.ReasonInvalidYouTubeURL, "youtubeUrl", "Invalid YouTube link")
	}
	return &s, nil
}

// VideoID extracts the video id from a YouTube link, or "".
func VideoID(link string) string {
	u, err := url.Parse(strings.TrimSpace(link))
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || !youtubeHosts[strings.ToLower(u.Hostname())] {
		return ""
	}
	var id string
	path := strings.Trim(u.Path, "/")
	switch {
	case strings.EqualFold(u.Hostname(), "youtu.be"):
		id = strings.SplitN(path, "/", 2)[0]
	case path == "watch":
		id = u.Query().Get("v")
	default:
		parts := strings.Split(path, "/")
		if len(parts) >= 2 && (parts[0] == "embed" || parts[0] == "shorts" || parts[0] == "live" || parts[0] == "v") {
			id = parts[1]
		}
	}
	if !videoIDRe.MatchString(id) {
		return ""
	}
	return id
}

// Page validates pagination arguments.
func Page(limit, offset int) error {
	if limit < 1 || limit > MaxPageSize || offset < 0 {
		return apperror.BadInput(apperror.ReasonPagination, "limit", "limit must be 1-100 and offset non-negative")
	}
	return nil
}

// IDs validates a batch of ids.
func IDs(ids []string) error {
	if len(ids) == 0 || len(ids) > MaxBatchIDs {
		return apperror.BadInput(apperror.ReasonBatchSize, "ids", "Select between 1 and 100 items")
	}
	return nil
}

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// IsUUID reports whether id has the UUID text form. Malformed ids are treated
// as "not found" by the services.
func IsUUID(id string) bool { return uuidRe.MatchString(id) }
