package dataloader

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/graph-gophers/dataloader/v7"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

type contextKey string

const loadersKey contextKey = "dataloaders"

// Loaders holds all DataLoader instances for a single request.
type Loaders struct {
	FavoriteSong   *dataloader.Loader[string, bool]
	FavoriteArtist *dataloader.Loader[string, bool]
	ArtistByID     *dataloader.Loader[string, *storage.Artist]
}

func For(ctx context.Context) *Loaders {
	return ctx.Value(loadersKey).(*Loaders)
}

func Middleware(favRepo storage.FavoriteStorer, artistRepo storage.ArtistStorer, getUserID func(ctx context.Context) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := getUserID(r.Context())
			loaders := newLoaders(favRepo, artistRepo, userID)
			ctx := context.WithValue(r.Context(), loadersKey, loaders)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func newLoaders(favRepo storage.FavoriteStorer, artistRepo storage.ArtistStorer, userID string) *Loaders {
	return &Loaders{
		FavoriteSong:   dataloader.NewBatchedLoader(favoriteSongBatch(favRepo, userID), dataloader.WithWait[string, bool](2*time.Millisecond)),
		FavoriteArtist: dataloader.NewBatchedLoader(favoriteArtistBatch(favRepo, userID), dataloader.WithWait[string, bool](2*time.Millisecond)),
		ArtistByID:     dataloader.NewBatchedLoader(artistByIDBatch(artistRepo), dataloader.WithWait[string, *storage.Artist](2*time.Millisecond)),
	}
}

func favoriteSongBatch(favRepo storage.FavoriteStorer, userID string) dataloader.BatchFunc[string, bool] {
	return func(ctx context.Context, songIDs []string) []*dataloader.Result[bool] {
		results := make([]*dataloader.Result[bool], len(songIDs))

		if userID == "" {
			for i := range results {
				results[i] = &dataloader.Result[bool]{Data: false}
			}
			return results
		}

		favSet, err := favRepo.BatchIsSongFavorited(ctx, userID, songIDs)
		if err != nil {
			for i := range results {
				results[i] = &dataloader.Result[bool]{Error: err}
			}
			return results
		}

		for i, id := range songIDs {
			results[i] = &dataloader.Result[bool]{Data: favSet[id]}
		}
		return results
	}
}

func favoriteArtistBatch(favRepo storage.FavoriteStorer, userID string) dataloader.BatchFunc[string, bool] {
	return func(ctx context.Context, artistIDs []string) []*dataloader.Result[bool] {
		results := make([]*dataloader.Result[bool], len(artistIDs))

		if userID == "" {
			for i := range results {
				results[i] = &dataloader.Result[bool]{Data: false}
			}
			return results
		}

		favSet, err := favRepo.BatchIsArtistFavorited(ctx, userID, artistIDs)
		if err != nil {
			for i := range results {
				results[i] = &dataloader.Result[bool]{Error: err}
			}
			return results
		}

		for i, id := range artistIDs {
			results[i] = &dataloader.Result[bool]{Data: favSet[id]}
		}
		return results
	}
}

func artistByIDBatch(artistRepo storage.ArtistStorer) dataloader.BatchFunc[string, *storage.Artist] {
	return func(ctx context.Context, ids []string) []*dataloader.Result[*storage.Artist] {
		results := make([]*dataloader.Result[*storage.Artist], len(ids))

		artists, err := artistRepo.MultiGetArtists(ctx, ids)
		if err != nil {
			for i := range results {
				results[i] = &dataloader.Result[*storage.Artist]{Error: err}
			}
			return results
		}

		// Build lookup map
		byID := make(map[string]*storage.Artist, len(artists))
		for _, a := range artists {
			byID[a.ID] = a
		}

		for i, id := range ids {
			if a, ok := byID[id]; ok {
				results[i] = &dataloader.Result[*storage.Artist]{Data: a}
			} else {
				results[i] = &dataloader.Result[*storage.Artist]{Error: fmt.Errorf("artist %s not found", id)}
			}
		}
		return results
	}
}
