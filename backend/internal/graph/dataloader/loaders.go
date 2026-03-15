package dataloader

import (
	"context"
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
}

func For(ctx context.Context) *Loaders {
	return ctx.Value(loadersKey).(*Loaders)
}

func Middleware(favRepo storage.FavoriteStorer, getUserID func(ctx context.Context) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := getUserID(r.Context())
			loaders := newLoaders(favRepo, userID)
			ctx := context.WithValue(r.Context(), loadersKey, loaders)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func newLoaders(favRepo storage.FavoriteStorer, userID string) *Loaders {
	return &Loaders{
		FavoriteSong:   dataloader.NewBatchedLoader(favoriteSongBatch(favRepo, userID), dataloader.WithWait[string, bool](2*time.Millisecond)),
		FavoriteArtist: dataloader.NewBatchedLoader(favoriteArtistBatch(favRepo, userID), dataloader.WithWait[string, bool](2*time.Millisecond)),
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
