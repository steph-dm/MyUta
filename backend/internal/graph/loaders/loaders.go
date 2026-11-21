// Package loaders batches the related-object lookups of one GraphQL request
// (artist of each song, reviews of each song, favourite flags, ...) into one
// query per relation. Every loader is bound to the caller's user id.
package loaders

import (
	"context"
	"net/http"
	"time"

	"github.com/graph-gophers/dataloader/v7"

	"github.com/steph-dm/MyUta/backend/internal/auth"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

type Loaders struct {
	ArtistByID          *dataloader.Loader[string, *storage.Artist]
	SongByID            *dataloader.Loader[string, *storage.Song]
	SongsByArtist       *dataloader.Loader[string, []*storage.Song]
	SongCountByArtist   *dataloader.Loader[string, int]
	ReviewCountByArtist *dataloader.Loader[string, int]
	ReviewsBySong       *dataloader.Loader[string, []*storage.Review]
	ReviewCountBySong   *dataloader.Loader[string, int]
	BestBySong          *dataloader.Loader[string, map[domain.MachineType]float64]
	GoalsBySong         *dataloader.Loader[string, []*storage.SongGoal]
	SongFavorite        *dataloader.Loader[string, bool]
	ArtistFavorite      *dataloader.Loader[string, bool]
}

type ctxKey struct{}

// For returns the loaders of the current request.
func For(ctx context.Context) *Loaders {
	return ctx.Value(ctxKey{}).(*Loaders)
}

// Middleware creates fresh loaders for each request (after authentication).
func Middleware(store storage.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			l := New(store, auth.UserID(r.Context()))
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, l)))
		})
	}
}

// New builds the loaders for one user.
func New(store storage.Store, userID string) *Loaders {
	return &Loaders{
		ArtistByID: byID(func(ctx context.Context, ids []string) ([]*storage.Artist, error) {
			return store.ArtistsByIDs(ctx, userID, ids)
		}, func(a *storage.Artist) string { return a.ID }),
		SongByID: byID(func(ctx context.Context, ids []string) ([]*storage.Song, error) {
			return store.SongsByIDs(ctx, userID, ids)
		}, func(s *storage.Song) string { return s.ID }),
		SongsByArtist: grouped(func(ctx context.Context, ids []string) ([]*storage.Song, error) {
			return store.SongsByArtistIDs(ctx, userID, ids)
		}, func(s *storage.Song) string { return s.ArtistID }),
		ReviewsBySong: grouped(func(ctx context.Context, ids []string) ([]*storage.Review, error) {
			return store.ReviewsBySongIDs(ctx, userID, ids)
		}, func(r *storage.Review) string { return r.SongID }),
		GoalsBySong: grouped(func(ctx context.Context, ids []string) ([]*storage.SongGoal, error) {
			return store.GoalsBySongIDs(ctx, userID, ids)
		}, func(g *storage.SongGoal) string { return g.SongID }),
		SongCountByArtist: mapped(func(ctx context.Context, ids []string) (map[string]int, error) {
			return store.SongCountsByArtistIDs(ctx, userID, ids)
		}),
		ReviewCountByArtist: mapped(func(ctx context.Context, ids []string) (map[string]int, error) {
			return store.ReviewCountsByArtistIDs(ctx, userID, ids)
		}),
		ReviewCountBySong: mapped(func(ctx context.Context, ids []string) (map[string]int, error) {
			return store.ReviewCountsBySongIDs(ctx, userID, ids)
		}),
		SongFavorite: mapped(func(ctx context.Context, ids []string) (map[string]bool, error) {
			return store.FavoriteSongIDs(ctx, userID, ids)
		}),
		ArtistFavorite: mapped(func(ctx context.Context, ids []string) (map[string]bool, error) {
			return store.FavoriteArtistIDs(ctx, userID, ids)
		}),
		BestBySong: mapped(func(ctx context.Context, ids []string) (map[string]map[domain.MachineType]float64, error) {
			best, err := store.BestScores(ctx, userID, ids)
			if err != nil {
				return nil, err
			}
			out := map[string]map[domain.MachineType]float64{}
			for k, v := range best {
				if out[k.SongID] == nil {
					out[k.SongID] = map[domain.MachineType]float64{}
				}
				out[k.SongID][k.MachineType] = v
			}
			return out, nil
		}),
	}
}

const wait = 2 * time.Millisecond

// byID loads single objects; a missing id yields storage.ErrNotFound.
func byID[V any](fetch func(context.Context, []string) ([]V, error), key func(V) string) *dataloader.Loader[string, V] {
	return dataloader.NewBatchedLoader(func(ctx context.Context, ids []string) []*dataloader.Result[V] {
		rows, err := fetch(ctx, ids)
		out := make([]*dataloader.Result[V], len(ids))
		if err != nil {
			for i := range out {
				out[i] = &dataloader.Result[V]{Error: err}
			}
			return out
		}
		m := make(map[string]V, len(rows))
		for _, r := range rows {
			m[key(r)] = r
		}
		for i, id := range ids {
			if v, ok := m[id]; ok {
				out[i] = &dataloader.Result[V]{Data: v}
			} else {
				out[i] = &dataloader.Result[V]{Error: storage.ErrNotFound}
			}
		}
		return out
	}, dataloader.WithWait[string, V](wait))
}

// grouped loads lists; a key without rows yields an empty list (no extra query).
func grouped[V any](fetch func(context.Context, []string) ([]V, error), key func(V) string) *dataloader.Loader[string, []V] {
	return dataloader.NewBatchedLoader(func(ctx context.Context, ids []string) []*dataloader.Result[[]V] {
		rows, err := fetch(ctx, ids)
		out := make([]*dataloader.Result[[]V], len(ids))
		if err != nil {
			for i := range out {
				out[i] = &dataloader.Result[[]V]{Error: err}
			}
			return out
		}
		m := map[string][]V{}
		for _, r := range rows {
			m[key(r)] = append(m[key(r)], r)
		}
		for i, id := range ids {
			v := m[id]
			if v == nil {
				v = []V{}
			}
			out[i] = &dataloader.Result[[]V]{Data: v}
		}
		return out
	}, dataloader.WithWait[string, []V](wait))
}

// mapped loads values from a map; a missing key yields the zero value.
func mapped[V any](fetch func(context.Context, []string) (map[string]V, error)) *dataloader.Loader[string, V] {
	return dataloader.NewBatchedLoader(func(ctx context.Context, ids []string) []*dataloader.Result[V] {
		m, err := fetch(ctx, ids)
		out := make([]*dataloader.Result[V], len(ids))
		for i, id := range ids {
			if err != nil {
				out[i] = &dataloader.Result[V]{Error: err}
			} else {
				out[i] = &dataloader.Result[V]{Data: m[id]}
			}
		}
		return out
	}, dataloader.WithWait[string, V](wait))
}
