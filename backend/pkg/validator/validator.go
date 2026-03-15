package validator

import (
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
)

const (
	maxTitleLength   = 200
	maxNameLength    = 200
	maxNotesLength   = 1000
	minScore         = 0.0
	maxScore         = 100.0
	maxPasswordLen   = 72 // bcrypt truncates at 72 bytes
	maxTake          = 200
	maxDays          = 365
	maxImportSize    = 5 * 1024 * 1024 // 5 MB
	maxBatchDelete   = 100
)

var (
	emailRegex    = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`)
	lowercaseRe   = regexp.MustCompile(`[a-z]`)
	uppercaseRe   = regexp.MustCompile(`[A-Z]`)
	digitRe       = regexp.MustCompile(`[0-9]`)
	specialCharRe = regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`)
)

func Email(email string) error {
	if !emailRegex.MatchString(email) {
		return apperror.BadInput("Invalid email format", "email")
	}
	return nil
}

func Password(password string) error {
	if len(password) < 12 {
		return apperror.BadInput("Password must be at least 12 characters long", "password")
	}
	if len(password) > maxPasswordLen {
		return apperror.BadInput("Password cannot exceed 72 characters", "password")
	}
	if !lowercaseRe.MatchString(password) {
		return apperror.BadInput("Password must contain at least one lowercase letter", "password")
	}
	if !uppercaseRe.MatchString(password) {
		return apperror.BadInput("Password must contain at least one uppercase letter", "password")
	}
	if !digitRe.MatchString(password) {
		return apperror.BadInput("Password must contain at least one number", "password")
	}
	if !specialCharRe.MatchString(password) {
		return apperror.BadInput("Password must contain at least one special character", "password")
	}
	return nil
}

func Name(name string) error {
	trimmed := strings.TrimSpace(name)
	if len(trimmed) < 1 || len(trimmed) > 20 {
		return apperror.BadInput("Name must be between 1 and 20 characters", "name")
	}
	return nil
}

func Birthdate(birthdate time.Time) error {
	now := time.Now()

	if birthdate.After(now) {
		return apperror.BadInput("Birthdate cannot be in the future", "birthdate")
	}

	age := now.Year() - birthdate.Year()
	if now.YearDay() < birthdate.YearDay() {
		age--
	}

	if age < 13 {
		return apperror.BadInput("You must be at least 13 years old to register", "birthdate")
	}
	if age > 120 {
		return apperror.BadInput("Invalid birthdate", "birthdate")
	}

	return nil
}

func SongTitle(title string) error {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return apperror.BadInput("Song title cannot be empty", "title")
	}
	if len(trimmed) > maxTitleLength {
		return apperror.BadInput("Song title cannot exceed 200 characters", "title")
	}
	return nil
}

func ArtistName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return apperror.BadInput("Artist name cannot be empty", "name")
	}
	if len(trimmed) > maxNameLength {
		return apperror.BadInput("Artist name cannot exceed 200 characters", "name")
	}
	return nil
}

func ReviewScore(score float64) error {
	if math.IsNaN(score) || math.IsInf(score, 0) {
		return apperror.BadInput("Score must be a valid number", "score")
	}
	if score < minScore || score > maxScore {
		return apperror.BadInput("Score must be between 0 and 100", "score")
	}
	return nil
}

func ReviewDate(dateStr string) (time.Time, error) {
	date, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			return time.Time{}, apperror.BadInput("Invalid date format", "date")
		}
	}

	now := time.Now()
	tomorrow := now.AddDate(0, 0, 1)
	if date.After(tomorrow) {
		return time.Time{}, apperror.BadInput("Review date cannot be in the future", "date")
	}

	tenYearsAgo := now.AddDate(-10, 0, 0)
	if date.Before(tenYearsAgo) {
		return time.Time{}, apperror.BadInput("Review date is too far in the past", "date")
	}

	return date, nil
}

func Notes(notes *string) error {
	if notes != nil && len(*notes) > maxNotesLength {
		return apperror.BadInput("Notes cannot exceed 1000 characters", "notes")
	}
	return nil
}

func Genres(genres []storage.Genre) error {
	for _, genre := range genres {
		switch genre {
		case storage.GenrePop,
			storage.GenreRock,
			storage.GenreHiphop,
			storage.GenreElectro,
			storage.GenreJazz,
			storage.GenreClassical,
			storage.GenreFolk,
			storage.GenreAnime:
		default:
			return apperror.BadInput("Invalid genre", "genres")
		}
	}
	return nil
}

func MachineType(machineType storage.MachineType) error {
	switch machineType {
	case storage.MachineTypeDAM, storage.MachineTypeJoysound:
		return nil
	default:
		return apperror.BadInput("Invalid machine type", "machineType")
	}
}

func Issues(issues []storage.Issue) error {
	for _, issue := range issues {
		switch issue {
		case storage.IssueReview,
			storage.IssueMelody,
			storage.IssueRhythm,
			storage.IssueRange,
			storage.IssueBridge,
			storage.IssueChorus,
			storage.IssueVerse,
			storage.IssueIntro,
			storage.IssueOutro,
			storage.IssueSpeed,
			storage.IssueExpressiveness:
		default:
			return apperror.BadInput("Invalid issue", "issues")
		}
	}
	return nil
}

func Pagination(take, skip *int) error {
	if take != nil && (*take < 0 || *take > maxTake) {
		return apperror.BadInput("take must be between 0 and 200", "take")
	}
	if skip != nil && *skip < 0 {
		return apperror.BadInput("skip must be non-negative", "skip")
	}
	return nil
}

func Days(days *int) error {
	if days != nil && (*days < 1 || *days > maxDays) {
		return apperror.BadInput("days must be between 1 and 365", "days")
	}
	return nil
}

func ImportSize(data string) error {
	if len(data) > maxImportSize {
		return apperror.BadInput("Import data cannot exceed 5MB", "jsonData")
	}
	return nil
}

func BatchSize(ids []string) error {
	if len(ids) > maxBatchDelete {
		return apperror.BadInput("Cannot delete more than 100 items at once", "ids")
	}
	if len(ids) == 0 {
		return apperror.BadInput("No items to delete", "ids")
	}
	return nil
}

var youtubeURLRe = regexp.MustCompile(`^https?://(www\.)?(youtube\.com|youtu\.be)/`)

func YouTubeURL(url *string) error {
	if url == nil || *url == "" {
		return nil
	}
	if !youtubeURLRe.MatchString(*url) {
		return apperror.BadInput("Invalid YouTube URL", "youtubeUrl")
	}
	return nil
}

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func UUID(id, field string) error {
	if !uuidRe.MatchString(id) {
		return apperror.BadInput("Invalid ID format", field)
	}
	return nil
}
