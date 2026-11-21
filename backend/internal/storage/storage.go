// Package storage defines the persistence model and the Store interface.
// Every method that reads or writes user data takes the user id and puts it
// in the WHERE clause, so a forgotten ownership check cannot leak data.
package storage

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/uptrace/bun"

	"github.com/steph-dm/MyUta/backend/internal/domain"
)

// --- errors ---------------------------------------------------------------------------

// ErrNotFound means the row does not exist or belongs to another user.
var ErrNotFound = errors.New("not found")

// ErrUnavailable means the database could not be reached.
var ErrUnavailable = errors.New("database unavailable")

// ConflictError reports a unique-constraint violation.
type ConflictError struct{ Constraint string }

func (e *ConflictError) Error() string { return fmt.Sprintf("conflict on %s", e.Constraint) }

// IsConflict reports whether err is a conflict on the given constraint
// (or on any constraint when constraint is "").
func IsConflict(err error, constraint string) bool {
	var c *ConflictError
	return errors.As(err, &c) && (constraint == "" || c.Constraint == constraint)
}

// Constraint names used by the services.
const (
	ConstraintUserEmail  = "users_email_key"
	ConstraintArtistName = "artists_user_name_key"
	ConstraintSongTitle  = "songs_artist_title_key"
)

// --- models -----------------------------------------------------------------------------

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID                 string              `bun:"id,pk,type:uuid"`
	Email              string              `bun:"email,notnull"`
	Name               string              `bun:"name,notnull"`
	PasswordHash       string              `bun:"password_hash,notnull"`
	DefaultMachineType *domain.MachineType `bun:"default_machine_type"`
	Language           *string             `bun:"language"`
	EmailVerifiedAt    *time.Time          `bun:"email_verified_at"`
	CreatedAt          time.Time           `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt          time.Time           `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

type Session struct {
	bun.BaseModel `bun:"table:sessions,alias:se"`

	ID         string    `bun:"id,pk,type:uuid"`
	UserID     string    `bun:"user_id,type:uuid,notnull"`
	CreatedAt  time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	LastSeenAt time.Time `bun:"last_seen_at,nullzero,notnull,default:current_timestamp"`
	ExpiresAt  time.Time `bun:"expires_at,notnull"`
	UserAgent  *string   `bun:"user_agent"`
}

// Token purposes.
const (
	TokenPasswordReset = "password_reset"
	TokenEmailVerify   = "email_verify"
)

type AuthToken struct {
	bun.BaseModel `bun:"table:auth_tokens,alias:t"`

	ID        string     `bun:"id,pk,type:uuid"`
	UserID    string     `bun:"user_id,type:uuid,notnull"`
	Purpose   string     `bun:"purpose,notnull"`
	TokenHash []byte     `bun:"token_hash,notnull"`
	NewEmail  *string    `bun:"new_email"`
	ExpiresAt time.Time  `bun:"expires_at,notnull"`
	UsedAt    *time.Time `bun:"used_at"`
	CreatedAt time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

type Artist struct {
	bun.BaseModel `bun:"table:artists,alias:a"`

	ID        string    `bun:"id,pk,type:uuid"`
	UserID    string    `bun:"user_id,type:uuid,notnull"`
	Name      string    `bun:"name,notnull"`
	NameKey   string    `bun:"name_key,scanonly"` // generated column
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

type Song struct {
	bun.BaseModel `bun:"table:songs,alias:s"`

	ID               string         `bun:"id,pk,type:uuid"`
	UserID           string         `bun:"user_id,type:uuid,notnull"`
	ArtistID         string         `bun:"artist_id,type:uuid,notnull"`
	Title            string         `bun:"title,notnull"`
	TitleKey         string         `bun:"title_key,scanonly"` // generated column
	Genres           []domain.Genre `bun:"genres,array,notnull"`
	YouTubeURL       *string        `bun:"youtube_url"`
	GeneratedYoutube bool           `bun:"generated_youtube,notnull"`
	CreatedAt        time.Time      `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt        time.Time      `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

type Review struct {
	bun.BaseModel `bun:"table:reviews,alias:r"`

	ID          string               `bun:"id,pk,type:uuid"`
	UserID      string               `bun:"user_id,type:uuid,notnull"`
	SongID      string               `bun:"song_id,type:uuid,notnull"`
	PerformedOn time.Time            `bun:"performed_on,type:date,notnull"`
	Score       float64              `bun:"score,notnull"`
	MachineType domain.MachineType   `bun:"machine_type,notnull"`
	KeyChange   int                  `bun:"key_change,notnull"`
	Variant     *string              `bun:"variant"`
	Issues      []domain.Issue       `bun:"issues,array,notnull"`
	Notes       *string              `bun:"notes"`
	Details     *domain.ScoreDetails `bun:"details,type:jsonb"`
	CreatedAt   time.Time            `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt   time.Time            `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

type SongGoal struct {
	bun.BaseModel `bun:"table:song_goals,alias:g"`

	SongID      string             `bun:"song_id,pk,type:uuid"`
	MachineType domain.MachineType `bun:"machine_type,pk"`
	UserID      string             `bun:"user_id,type:uuid,notnull"`
	TargetScore float64            `bun:"target_score,notnull"`
	CreatedAt   time.Time          `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt   time.Time          `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

type FavoriteSong struct {
	bun.BaseModel `bun:"table:favorite_songs,alias:fs"`

	UserID    string    `bun:"user_id,pk,type:uuid"`
	SongID    string    `bun:"song_id,pk,type:uuid"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

type FavoriteArtist struct {
	bun.BaseModel `bun:"table:favorite_artists,alias:fa"`

	UserID    string    `bun:"user_id,pk,type:uuid"`
	ArtistID  string    `bun:"artist_id,pk,type:uuid"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

// --- query parameters ---------------------------------------------------------------------

type Page struct {
	Limit  int
	Offset int
}

type ReviewFilter struct {
	MachineType *domain.MachineType
	SongID      *string
	ArtistID    *string
	Search      string
	Genres      []domain.Genre
	DateFrom    *time.Time
	DateTo      *time.Time
}

type ReviewSort string

const (
	ReviewSortDateDesc  ReviewSort = "DATE_DESC"
	ReviewSortDateAsc   ReviewSort = "DATE_ASC"
	ReviewSortScoreDesc ReviewSort = "SCORE_DESC"
	ReviewSortScoreAsc  ReviewSort = "SCORE_ASC"
)

type SongFilter struct {
	Search        string
	Genres        []domain.Genre
	FavoritesOnly bool
	ArtistID      *string
}

type SongSort string

const (
	SongSortTitleAsc  SongSort = "TITLE_ASC"
	SongSortTitleDesc SongSort = "TITLE_DESC"
	SongSortRecent    SongSort = "RECENT"
)

type ArtistFilter struct {
	Search        string
	FavoritesOnly bool
}

type ArtistSort string

const (
	ArtistSortNameAsc  ArtistSort = "NAME_ASC"
	ArtistSortNameDesc ArtistSort = "NAME_DESC"
)

// SongMachine identifies the scores of one song on one machine.
type SongMachine struct {
	SongID      string
	MachineType domain.MachineType
}

// ProfileUpdate lists the profile fields to change; nil fields are kept.
// ClearDefaultMachine distinguishes "set to none" from "not changed".
type ProfileUpdate struct {
	Name                *string
	DefaultMachineType  *domain.MachineType
	ClearDefaultMachine bool
	Language            *string
}

// --- aggregates -------------------------------------------------------------------------------

type MachineStat struct {
	MachineType  domain.MachineType `json:"machineType"`
	ReviewCount  int                `json:"reviewCount"`
	AverageScore float64            `json:"averageScore"`
	BestScore    float64            `json:"bestScore"`
}

type MostPracticedSong struct {
	SongID     string `json:"songId"`
	Title      string `json:"title"`
	ArtistName string `json:"artistName"`
	Count      int    `json:"count"`
}

type IssueStat struct {
	Issue domain.Issue `json:"issue"`
	Count int          `json:"count"`
}

type DashboardStats struct {
	TotalReviews       int                `json:"totalReviews"`
	TotalSongs         int                `json:"totalSongs"`
	TotalArtists       int                `json:"totalArtists"`
	SessionsLast30Days int                `json:"sessionsLast30Days"`
	SessionsPrev30Days int                `json:"sessionsPrev30Days"`
	MostPracticed      *MostPracticedSong `json:"mostPracticed"`
	CommonIssues       []*IssueStat       `json:"commonIssues"`
	MachineStats       []*MachineStat     `json:"machineStats"`
}

// ExportReview is one review with its song and artist, for export.
type ExportReview struct {
	Review     *Review
	SongTitle  string
	ArtistName string
	Genres     []domain.Genre
	YouTubeURL *string
}

type ExportSong struct {
	SongTitle  string
	ArtistName string
	Genres     []domain.Genre
	YouTubeURL *string
}

type ExportGoal struct {
	SongTitle   string
	ArtistName  string
	MachineType domain.MachineType
	TargetScore float64
}

type ExportData struct {
	User            *User
	Reviews         []*ExportReview
	FavoriteSongs   []*ExportSong
	FavoriteArtists []string
	Goals           []*ExportGoal
}

// --- Store ----------------------------------------------------------------------------------------

type Store interface {
	// InTx runs fn in a transaction; fn receives a Store bound to it.
	InTx(ctx context.Context, fn func(tx Store) error) error
	Ping(ctx context.Context) error

	CreateUser(ctx context.Context, u *User) error
	GetUser(ctx context.Context, id string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	UpdateProfile(ctx context.Context, id string, upd ProfileUpdate) error
	SetEmail(ctx context.Context, id, email string, verified bool) error
	MarkEmailVerified(ctx context.Context, id, email string) error
	SetPasswordHash(ctx context.Context, id, hash string) error
	DeleteUser(ctx context.Context, id string) error

	CreateSession(ctx context.Context, s *Session) error
	GetSession(ctx context.Context, id string) (*Session, error)
	ExtendSession(ctx context.Context, id string, expiresAt time.Time) error
	DeleteSession(ctx context.Context, id string) error
	DeleteUserSessions(ctx context.Context, userID, exceptID string) error
	DeleteExpiredSessions(ctx context.Context) (int, error)

	CreateAuthToken(ctx context.Context, t *AuthToken) error
	ConsumeAuthToken(ctx context.Context, purpose string, hash []byte) (*AuthToken, error)
	DeleteAuthTokens(ctx context.Context, userID, purpose string) error

	GetArtist(ctx context.Context, userID, id string) (*Artist, error)
	FindArtistByName(ctx context.Context, userID, name string) (*Artist, error)
	EnsureArtist(ctx context.Context, userID, name string) (*Artist, error)
	RenameArtist(ctx context.Context, userID, id, name string) error
	MergeArtists(ctx context.Context, userID, sourceID, targetID string) error
	DeleteArtist(ctx context.Context, userID, id string) error
	ArtistImpact(ctx context.Context, userID, id string) (songs, reviews int, err error)
	ReviewCountsByArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]int, error)
	ListArtists(ctx context.Context, userID string, f ArtistFilter, sort ArtistSort, p Page) ([]*Artist, int, error)
	ArtistsByIDs(ctx context.Context, userID string, ids []string) ([]*Artist, error)
	ListFavoriteArtists(ctx context.Context, userID string) ([]*Artist, error)

	GetSong(ctx context.Context, userID, id string) (*Song, error)
	FindSong(ctx context.Context, userID, artistID, title string) (*Song, error)
	CreateSong(ctx context.Context, s *Song) error
	UpdateSong(ctx context.Context, s *Song) error
	DeleteSong(ctx context.Context, userID, id string) error
	SongImpact(ctx context.Context, userID, id string) (reviews int, err error)
	ListSongs(ctx context.Context, userID string, f SongFilter, sort SongSort, p Page) ([]*Song, int, error)
	SongsByIDs(ctx context.Context, userID string, ids []string) ([]*Song, error)
	SongsByArtistIDs(ctx context.Context, userID string, artistIDs []string) ([]*Song, error)
	SongCountsByArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]int, error)
	ListFavoriteSongs(ctx context.Context, userID string) ([]*Song, error)

	CreateReview(ctx context.Context, r *Review) error
	UpdateReview(ctx context.Context, r *Review) error
	GetReview(ctx context.Context, userID, id string) (*Review, error)
	DeleteReviews(ctx context.Context, userID string, ids []string) (int, error)
	ListReviews(ctx context.Context, userID string, f ReviewFilter, sort ReviewSort, p Page) ([]*Review, int, error)
	ReviewsBySongIDs(ctx context.Context, userID string, songIDs []string) ([]*Review, error)
	ReviewCountsBySongIDs(ctx context.Context, userID string, songIDs []string) (map[string]int, error)
	BestScores(ctx context.Context, userID string, songIDs []string) (map[SongMachine]float64, error)
	ReviewExists(ctx context.Context, r *Review) (bool, error)

	SetSongFavorite(ctx context.Context, userID, songID string, favorite bool) error
	SetArtistFavorite(ctx context.Context, userID, artistID string, favorite bool) error
	FavoriteSongIDs(ctx context.Context, userID string, songIDs []string) (map[string]bool, error)
	FavoriteArtistIDs(ctx context.Context, userID string, artistIDs []string) (map[string]bool, error)

	SetGoal(ctx context.Context, userID, songID string, machine domain.MachineType, target *float64) error
	GoalsBySongIDs(ctx context.Context, userID string, songIDs []string) ([]*SongGoal, error)

	DashboardStats(ctx context.Context, userID string) (*DashboardStats, error)
	ExportData(ctx context.Context, userID string) (*ExportData, error)
}
