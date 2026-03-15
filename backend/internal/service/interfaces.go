package service

import (
	"context"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

type AuthServicer interface {
	Register(ctx context.Context, clientIP, email, password, name string, birthdate scalar.DateTime) (*storage.AuthPayload, error)
	Login(ctx context.Context, clientIP, email, password string) (*storage.AuthPayload, error)
	RefreshToken(ctx context.Context, userID string) (*storage.AuthPayload, error)
	ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) (bool, error)
	DeleteAccount(ctx context.Context, userID, password string) (bool, error)
}

type UserServicer interface {
	Me(ctx context.Context, userID string) (*storage.User, error)
	GetUser(ctx context.Context, callerID, targetID string) (*storage.User, error)
	ListUsers(ctx context.Context, callerID string) ([]*storage.User, error)
	GetUserByID(ctx context.Context, id string) (*storage.User, error)
	UpdateUser(ctx context.Context, callerID, targetID string, email, name *string, birthdate *scalar.DateTime, defaultMachineType *storage.MachineType) (*storage.User, error)
	RequireAdmin(ctx context.Context, userID string) error
}

type ArtistServicer interface {
	GetArtist(ctx context.Context, id string) (*storage.Artist, error)
	GetArtistWithSongs(ctx context.Context, userID, id string) (*storage.Artist, error)
	ListArtists(ctx context.Context, userID string, take, skip *int) ([]*storage.Artist, error)
	UpsertArtist(ctx context.Context, userID, name string) (*storage.Artist, error)
	UpdateArtist(ctx context.Context, userID, id, name string) (*storage.Artist, error)
	DeleteArtist(ctx context.Context, userID, id string) (*storage.Artist, error)
	ToggleFavorite(ctx context.Context, userID, artistID string) (bool, error)
	MyFavoriteArtists(ctx context.Context, userID string) ([]*storage.Artist, error)
}

type SongServicer interface {
	GetSong(ctx context.Context, userID, id string) (*storage.Song, error)
	ListSongs(ctx context.Context, userID string, take, skip *int) ([]*storage.Song, error)
	ListByArtist(ctx context.Context, userID, artistID string) ([]*storage.Song, error)
	CountByArtist(ctx context.Context, userID, artistID string) (int, error)
	UpsertSong(ctx context.Context, userID string, id *string, title, artistID string, genres []storage.Genre, youtubeURL *string, generatedYoutube *bool) (*storage.Song, error)
	DeleteSong(ctx context.Context, userID, id string) (*storage.Song, error)
	ToggleFavorite(ctx context.Context, userID, songID string) (bool, error)
	MyFavorites(ctx context.Context, userID string) ([]*storage.Song, error)
}

type ReviewServicer interface {
	GetReview(ctx context.Context, userID, reviewID string) (*storage.Review, error)
	ListReviews(ctx context.Context, userID string) ([]*storage.Review, error)
	UpsertReview(ctx context.Context, userID string, id *string, songID string, date scalar.DateTime, score float64, machineType storage.MachineType, issues []storage.Issue, notes *string) (*storage.Review, error)
	DeleteReview(ctx context.Context, userID, reviewID string) (*storage.Review, error)
	DeleteReviews(ctx context.Context, userID string, ids []string) (int, error)
	MyReviews(ctx context.Context, callerID, targetUserID string) ([]*storage.ReviewWithSong, error)
	ReviewsBySong(ctx context.Context, userID, songID string) ([]*storage.ReviewWithSong, error)
	RecentReviews(ctx context.Context, userID string, days *int) ([]*storage.ReviewWithSong, error)
	SongWithReviews(ctx context.Context, userID, songID string) (*storage.Song, error)
	ReviewCount(ctx context.Context, userID, songID string) (int, error)
	ReviewsByUser(ctx context.Context, userID string) ([]*storage.Review, error)
	DashboardStats(ctx context.Context, userID string) (*storage.DashboardStats, error)
}

type ExportServicer interface {
	ExportData(ctx context.Context, userID string) (string, error)
	ImportData(ctx context.Context, userID, jsonData string) (*storage.ImportResult, error)
}
