package service

import (
	"context"
	"errors"
	"math"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/validator"
)

// LibraryService manages artists, songs, favourites and goals.
type LibraryService struct{ d Deps }

// --- reads ----------------------------------------------------------------------------------------

func (s *LibraryService) ListArtists(ctx context.Context, f storage.ArtistFilter, sort storage.ArtistSort, p storage.Page) ([]*storage.Artist, int, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, 0, err
	}
	if err := validator.Page(p.Limit, p.Offset); err != nil {
		return nil, 0, err
	}
	return s.d.Store.ListArtists(ctx, id.UserID, f, sort, p)
}

// GetArtist returns nil (not an error) when the artist does not exist.
func (s *LibraryService) GetArtist(ctx context.Context, artistID string) (*storage.Artist, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if !validator.IsUUID(artistID) {
		return nil, nil
	}
	a, err := s.d.Store.GetArtist(ctx, id.UserID, artistID)
	if errors.Is(err, storage.ErrNotFound) {
		return nil, nil
	}
	return a, err
}

func (s *LibraryService) ListSongs(ctx context.Context, f storage.SongFilter, sort storage.SongSort, p storage.Page) ([]*storage.Song, int, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, 0, err
	}
	if err := validator.Page(p.Limit, p.Offset); err != nil {
		return nil, 0, err
	}
	if f.ArtistID != nil && !validator.IsUUID(*f.ArtistID) {
		return []*storage.Song{}, 0, nil
	}
	return s.d.Store.ListSongs(ctx, id.UserID, f, sort, p)
}

// GetSong returns nil (not an error) when the song does not exist.
func (s *LibraryService) GetSong(ctx context.Context, songID string) (*storage.Song, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if !validator.IsUUID(songID) {
		return nil, nil
	}
	song, err := s.d.Store.GetSong(ctx, id.UserID, songID)
	if errors.Is(err, storage.ErrNotFound) {
		return nil, nil
	}
	return song, err
}

func (s *LibraryService) FavoriteSongs(ctx context.Context) ([]*storage.Song, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return s.d.Store.ListFavoriteSongs(ctx, id.UserID)
}

func (s *LibraryService) FavoriteArtists(ctx context.Context) ([]*storage.Artist, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return s.d.Store.ListFavoriteArtists(ctx, id.UserID)
}

// --- artists ---------------------------------------------------------------------------------------

// RenameArtist renames an artist. If another artist already has this name
// (ignoring case, width and spacing) it fails with CONFLICT/ARTIST_EXISTS and
// reports that artist's id, so the client can offer MergeArtists.
func (s *LibraryService) RenameArtist(ctx context.Context, artistID, name string) (*storage.Artist, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(artistID, "Artist"); err != nil {
		return nil, err
	}
	clean, err := validator.ArtistName(name)
	if err != nil {
		return nil, err
	}
	if existing, err := s.d.Store.FindArtistByName(ctx, id.UserID, clean); err == nil && existing.ID != artistID {
		return nil, apperror.Conflict(apperror.ReasonArtistExists, "name", "Another artist already has this name").
			WithExtra("existingArtistId", existing.ID).WithExtra("existingArtistName", existing.Name)
	} else if err != nil && !errors.Is(err, storage.ErrNotFound) {
		return nil, err
	}
	if err := s.d.Store.RenameArtist(ctx, id.UserID, artistID, clean); err != nil {
		if storage.IsConflict(err, storage.ConstraintArtistName) {
			return nil, apperror.Conflict(apperror.ReasonArtistExists, "name", "Another artist already has this name")
		}
		return nil, notFound(err, "Artist")
	}
	return s.d.Store.GetArtist(ctx, id.UserID, artistID)
}

// MergeArtists moves all songs (and their reviews) of source into target and
// deletes source. Songs with the same title are combined.
func (s *LibraryService) MergeArtists(ctx context.Context, sourceID, targetID string) (*storage.Artist, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if sourceID == targetID {
		return nil, apperror.BadInput(apperror.ReasonSameArtist, "targetId", "Choose two different artists")
	}
	for _, aid := range []string{sourceID, targetID} {
		if err := validID(aid, "Artist"); err != nil {
			return nil, err
		}
	}
	var target *storage.Artist
	err = s.d.Store.InTx(ctx, func(tx storage.Store) error {
		if _, err := tx.GetArtist(ctx, id.UserID, sourceID); err != nil {
			return notFound(err, "Artist")
		}
		if target, err = tx.GetArtist(ctx, id.UserID, targetID); err != nil {
			return notFound(err, "Artist")
		}
		return tx.MergeArtists(ctx, id.UserID, sourceID, targetID)
	})
	return target, err
}

// DeleteArtist deletes the artist with all its songs and reviews.
func (s *LibraryService) DeleteArtist(ctx context.Context, artistID string) error {
	id, err := caller(ctx)
	if err != nil {
		return err
	}
	if err := validID(artistID, "Artist"); err != nil {
		return err
	}
	return notFound(s.d.Store.DeleteArtist(ctx, id.UserID, artistID), "Artist")
}

func (s *LibraryService) SetArtistFavorite(ctx context.Context, artistID string, favorite bool) (*storage.Artist, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(artistID, "Artist"); err != nil {
		return nil, err
	}
	if err := s.d.Store.SetArtistFavorite(ctx, id.UserID, artistID, favorite); err != nil {
		return nil, notFound(err, "Artist")
	}
	a, err := s.d.Store.GetArtist(ctx, id.UserID, artistID)
	return a, notFound(err, "Artist")
}

// --- songs --------------------------------------------------------------------------------------------

// SongInput describes a song. ArtistName is matched case/width-insensitively;
// a new artist is created when no artist has that name.
type SongInput struct {
	Title            string
	ArtistName       string
	Genres           []domain.Genre
	YouTubeURL       *string
	GeneratedYoutube bool
}

type cleanSong struct {
	title, artist string
	genres        []domain.Genre
	url           *string
	generated     bool
}

func (in SongInput) clean() (*cleanSong, error) {
	title, err := validator.SongTitle(in.Title)
	if err != nil {
		return nil, err
	}
	artist, err := validator.ArtistName(in.ArtistName)
	if err != nil {
		return nil, err
	}
	genres, err := validator.Genres(in.Genres)
	if err != nil {
		return nil, err
	}
	url, err := validator.YouTubeURL(in.YouTubeURL)
	if err != nil {
		return nil, err
	}
	return &cleanSong{title: title, artist: artist, genres: genres, url: url, generated: in.GeneratedYoutube && url != nil}, nil
}

// UpdateSong replaces the song's fields (genres are replaced, not merged).
// Changing the artist name moves the song; the previous artist is kept.
func (s *LibraryService) UpdateSong(ctx context.Context, songID string, in SongInput) (*storage.Song, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(songID, "Song"); err != nil {
		return nil, err
	}
	c, err := in.clean()
	if err != nil {
		return nil, err
	}
	var song *storage.Song
	err = s.d.Store.InTx(ctx, func(tx storage.Store) error {
		if song, err = tx.GetSong(ctx, id.UserID, songID); err != nil {
			return notFound(err, "Song")
		}
		artist, err := tx.EnsureArtist(ctx, id.UserID, c.artist)
		if err != nil {
			return err
		}
		song.ArtistID, song.Title, song.Genres = artist.ID, c.title, c.genres
		song.YouTubeURL, song.GeneratedYoutube = c.url, c.generated
		if err := tx.UpdateSong(ctx, song); err != nil {
			if storage.IsConflict(err, storage.ConstraintSongTitle) {
				return apperror.Conflict(apperror.ReasonDuplicateSong, "title", "This artist already has a song with this title")
			}
			return err
		}
		song, err = tx.GetSong(ctx, id.UserID, songID)
		return err
	})
	return song, err
}

// DeleteSong deletes the song and its reviews.
func (s *LibraryService) DeleteSong(ctx context.Context, songID string) error {
	id, err := caller(ctx)
	if err != nil {
		return err
	}
	if err := validID(songID, "Song"); err != nil {
		return err
	}
	return notFound(s.d.Store.DeleteSong(ctx, id.UserID, songID), "Song")
}

func (s *LibraryService) SetSongFavorite(ctx context.Context, songID string, favorite bool) (*storage.Song, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(songID, "Song"); err != nil {
		return nil, err
	}
	if err := s.d.Store.SetSongFavorite(ctx, id.UserID, songID, favorite); err != nil {
		return nil, notFound(err, "Song")
	}
	song, err := s.d.Store.GetSong(ctx, id.UserID, songID)
	return song, notFound(err, "Song")
}

// SetGoal sets the target score for a song on one machine; nil removes it.
func (s *LibraryService) SetGoal(ctx context.Context, songID string, machine domain.MachineType, target *float64) (*storage.Song, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := validID(songID, "Song"); err != nil {
		return nil, err
	}
	if err := validator.MachineType(machine, "machineType"); err != nil {
		return nil, err
	}
	if target != nil {
		v, err := validator.Score(*target)
		if err != nil || v <= 0 || math.IsNaN(v) {
			return nil, apperror.BadInput(apperror.ReasonScoreRange, "targetScore", "Target must be between 0 and 100")
		}
		target = &v
	}
	song, err := s.d.Store.GetSong(ctx, id.UserID, songID)
	if err != nil {
		return nil, notFound(err, "Song")
	}
	if err := s.d.Store.SetGoal(ctx, id.UserID, songID, machine, target); err != nil {
		return nil, notFound(err, "Song")
	}
	return song, nil
}
