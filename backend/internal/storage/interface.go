package storage

import (
	"context"
	"time"
)

type Storer interface {
	UserStorer
	ArtistStorer
	SongStorer
	ReviewStorer
	FavoriteStorer
	ExportStorer
}

type UserStorer interface {
	GetUser(ctx context.Context, id string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	EmailExists(ctx context.Context, email string, excludeID ...string) (bool, error)
	NameExists(ctx context.Context, name string, excludeID ...string) (bool, error)
	CreateUser(ctx context.Context, user *User) error
	UpdateUser(ctx context.Context, user *User, columns ...string) error
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error
	GetPassword(ctx context.Context, id string) (string, error)
	SoftDeleteUser(ctx context.Context, id string) error
	IsAdmin(ctx context.Context, id string) (bool, error)
	ListActiveUsers(ctx context.Context) ([]*User, error)
	IsActiveUser(ctx context.Context, id string, tokenIssuedAt time.Time) (bool, error)
}

type ArtistStorer interface {
	GetArtist(ctx context.Context, id string) (*Artist, error)
	GetArtistByName(ctx context.Context, userID, name string) (*Artist, error)
	CreateArtist(ctx context.Context, artist *Artist) error
	UpdateArtist(ctx context.Context, artist *Artist) error
	DeleteArtist(ctx context.Context, id string) error
	ListArtists(ctx context.Context, userID string, take, skip *int) ([]*Artist, error)
	MultiGetArtists(ctx context.Context, ids []string) ([]*Artist, error)
}

type SongStorer interface {
	GetSong(ctx context.Context, id string) (*Song, error)
	GetSongByTitleAndArtist(ctx context.Context, userID, title, artistID string) (*Song, error)
	SongExists(ctx context.Context, songID string) (bool, error)
	CreateSong(ctx context.Context, song *Song) error
	UpdateSong(ctx context.Context, song *Song) error
	UpdateSongFields(ctx context.Context, id string, genres []string, youtubeURL *string, generatedYT bool) error
	DeleteSong(ctx context.Context, id string) error
	GetSongArtistID(ctx context.Context, songID string) (string, error)
	ListSongsByArtist(ctx context.Context, userID, artistID string) ([]*Song, error)
	ListSongsByArtistIDs(ctx context.Context, userID string, artistIDs []string) ([]*Song, error)
	ListSongs(ctx context.Context, userID string, take, skip *int) ([]*Song, error)
	CountSongsByArtist(ctx context.Context, userID, artistID string) (int, error)
	BatchReviewCounts(ctx context.Context, songIDs []string) (map[string]int, error)
}

type ReviewStorer interface {
	GetReview(ctx context.Context, id string) (*Review, error)
	CreateReview(ctx context.Context, review *Review) error
	UpdateReview(ctx context.Context, review *Review) error
	DeleteReview(ctx context.Context, id string) error
	DeleteReviewBatch(ctx context.Context, ids []string, userID string) (int, error)
	GetReviewOwnerID(ctx context.Context, reviewID string) (string, error)
	VerifyReviewOwnership(ctx context.Context, ids []string) (map[string]string, error)
	ListReviewsByUser(ctx context.Context, userID string) ([]*Review, error)
	ReviewCount(ctx context.Context, userID, songID string) (int, error)
	ListReviewsWithSongByUser(ctx context.Context, userID string) ([]*ReviewWithSong, error)
	ListReviewsWithSongBySong(ctx context.Context, songID, userID string) ([]*ReviewWithSong, error)
	RecentReviewsWithSong(ctx context.Context, userID string, cutoff time.Time) ([]*ReviewWithSong, error)
	GetDashboardStats(ctx context.Context, userID string) (*DashboardStats, error)
}

type FavoriteStorer interface {
	ToggleFavoriteSong(ctx context.Context, userID, songID string) (bool, error)
	ListFavoriteSongs(ctx context.Context, userID string) ([]*Song, error)
	BatchIsSongFavorited(ctx context.Context, userID string, songIDs []string) (map[string]bool, error)
	ToggleFavoriteArtist(ctx context.Context, userID, artistID string) (bool, error)
	ListFavoriteArtists(ctx context.Context, userID string) ([]*Artist, error)
	BatchIsArtistFavorited(ctx context.Context, userID string, artistIDs []string) (map[string]bool, error)
}

type ExportStorer interface {
	ExportReviews(ctx context.Context, userID string) ([]*ExportReview, error)
	ExportFavoriteSongs(ctx context.Context, userID string) ([]*ExportFavorite, error)
	ExportFavoriteArtistNames(ctx context.Context, userID string) ([]string, error)
}
