package graph

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/auth"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/graph/model"
	"github.com/steph-dm/MyUta/backend/internal/middleware"
	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

const (
	maxComplexity = 2000
	maxDepth      = 10
	maxRootFields = 15
)

// NewHandler builds the GraphQL HTTP handler: POST (JSON) and multipart
// uploads only, query cache, limits, @auth directive and error presenter.
func NewHandler(services *service.Services, introspection bool) http.Handler {
	cfg := Config{Resolvers: &Resolver{Services: services}}
	cfg.Directives.Auth = func(ctx context.Context, _ any, next graphql.Resolver) (any, error) {
		if _, ok := auth.FromContext(ctx); !ok {
			return nil, apperror.Unauthenticated()
		}
		return next(ctx)
	}
	setComplexity(&cfg.Complexity)

	srv := handler.New(NewExecutableSchema(cfg))
	// No GET transport: queries over GET could be triggered cross-site.
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{
		MaxUploadSize: config.MaxUploadBytes + 64<<10,
		MaxMemory:     config.MaxUploadBytes,
	})
	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	if introspection {
		srv.Use(extension.Introspection{})
	}
	srv.Use(extension.FixedComplexityLimit(maxComplexity))
	srv.Use(Limits{})
	srv.AroundOperations(func(ctx context.Context, next graphql.OperationHandler) graphql.ResponseHandler {
		if oc := graphql.GetOperationContext(ctx); oc != nil {
			name := oc.OperationName
			if name == "" && oc.Operation != nil {
				name = oc.Operation.Name
			}
			middleware.Access(ctx).SetOperation(name)
		}
		return next(ctx)
	})
	srv.SetErrorPresenter(ErrorPresenter)
	srv.SetRecoverFunc(func(ctx context.Context, p any) error {
		middleware.LoggerFromContext(ctx).Error("panic in resolver", "panic", fmt.Sprint(p), "stack", string(debug.Stack()))
		return errors.New("internal panic")
	})
	return srv
}

// setComplexity makes list fields cost "page size x child cost".
func setComplexity(c *ComplexityRoot) {
	pageCost := func(limit *int, def, child int) int {
		n := def
		if limit != nil && *limit > 0 {
			n = *limit
		}
		return 1 + n*child
	}
	c.Query.Reviews = func(child int, _ *model.ReviewFilter, _ *model.ReviewSort, limit, _ *int) int {
		return pageCost(limit, 20, child)
	}
	c.Query.Songs = func(child int, _ *model.SongFilter, _ *model.SongSort, limit, _ *int) int {
		return pageCost(limit, 50, child)
	}
	c.Query.Artists = func(child int, _ *model.ArtistFilter, _ *model.ArtistSort, limit, _ *int) int {
		return pageCost(limit, 50, child)
	}
	list := func(n int) func(int) int { return func(child int) int { return 1 + n*child } }
	c.Query.MyFavoriteSongs = list(20)
	c.Query.MyFavoriteArtists = list(20)
	c.Artist.Songs = list(10)
	c.Song.Reviews = list(10)
}

// ErrorPresenter shows application errors and gqlgen's own validation/parse
// errors; everything else is logged and masked.
func ErrorPresenter(ctx context.Context, err error) *gqlerror.Error {
	acc := middleware.Access(ctx)
	if appErr, ok := errors.AsType[*apperror.AppError](err); ok {
		acc.AddErrorCode(string(appErr.Code))
		return &gqlerror.Error{Message: appErr.Message, Path: graphql.GetPath(ctx), Extensions: appErr.Extensions()}
	}
	if errors.Is(err, storage.ErrNotFound) {
		acc.AddErrorCode(string(apperror.CodeNotFound))
		return &gqlerror.Error{Message: "Not found", Path: graphql.GetPath(ctx), Extensions: map[string]any{"code": string(apperror.CodeNotFound)}}
	}
	if errors.Is(err, storage.ErrUnavailable) {
		acc.AddErrorCode(string(apperror.CodeUnavailable))
		u := apperror.Unavailable()
		return &gqlerror.Error{Message: u.Message, Path: graphql.GetPath(ctx), Extensions: u.Extensions()}
	}
	if mbe, ok := errors.AsType[*http.MaxBytesError](err); ok {
		e := apperror.TooLarge(mbe.Limit)
		acc.AddErrorCode(string(e.Code))
		return &gqlerror.Error{Message: e.Message, Extensions: e.Extensions()}
	}
	// Produced by gqlgen/gqlparser (syntax, validation, variable coercion).
	// Resolver errors always arrive wrapped, so they never match here.
	if gqlErr, ok := errors.AsType[*gqlerror.Error](err); ok && gqlErr.Unwrap() == nil {
		if gqlErr.Extensions == nil {
			gqlErr.Extensions = map[string]any{}
		}
		if _, has := gqlErr.Extensions["code"]; !has {
			gqlErr.Extensions["code"] = "GRAPHQL_VALIDATION_FAILED"
		}
		acc.AddErrorCode(fmt.Sprint(gqlErr.Extensions["code"]))
		return gqlErr
	}
	acc.AddErrorCode(string(apperror.CodeInternal))
	middleware.LoggerFromContext(ctx).Error("internal error", "error", err, "path", graphql.GetPath(ctx).String())
	return &gqlerror.Error{
		Message: "Internal server error", Path: graphql.GetPath(ctx),
		Extensions: map[string]any{"code": string(apperror.CodeInternal)},
	}
}

// Limits rejects documents that are too deep or select too many root fields
// (aliases make one request do many things).
type Limits struct{}

var (
	_ graphql.HandlerExtension        = Limits{}
	_ graphql.OperationContextMutator = Limits{}
)

func (Limits) ExtensionName() string                     { return "Limits" }
func (Limits) Validate(_ graphql.ExecutableSchema) error { return nil }

func (Limits) MutateOperationContext(_ context.Context, oc *graphql.OperationContext) *gqlerror.Error {
	if oc == nil || oc.Operation == nil {
		return nil
	}
	if n := len(oc.Operation.SelectionSet); n > maxRootFields {
		return limitError(apperror.ReasonTooManyFields, fmt.Sprintf("operation selects %d root fields; the maximum is %d", n, maxRootFields))
	}
	if d := queryDepth(oc.Operation.SelectionSet, 0); d > maxDepth {
		return limitError(apperror.ReasonQueryTooDeep, fmt.Sprintf("query depth %d exceeds the maximum of %d", d, maxDepth))
	}
	return nil
}

func limitError(reason apperror.Reason, msg string) *gqlerror.Error {
	e := gqlerror.Errorf("%s", msg)
	e.Extensions = map[string]any{"code": string(apperror.CodeBadInput), "reason": string(reason)}
	return e
}

func queryDepth(set ast.SelectionSet, seen int) int {
	if seen > 50 { // fragment cycles are rejected by validation; this is a safety net
		return seen
	}
	maxD := 0
	for _, sel := range set {
		d := 0
		switch s := sel.(type) {
		case *ast.Field:
			if s.Name == "__typename" {
				continue
			}
			d = 1 + queryDepth(s.SelectionSet, seen+1)
		case *ast.InlineFragment:
			d = queryDepth(s.SelectionSet, seen+1)
		case *ast.FragmentSpread:
			if s.Definition != nil {
				d = queryDepth(s.Definition.SelectionSet, seen+1)
			}
		}
		maxD = max(maxD, d)
	}
	return maxD
}
