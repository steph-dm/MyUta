package graph

import (
	"context"
	"errors"
	"log/slog"

	"github.com/99designs/gqlgen/graphql"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

func ErrorPresenter(ctx context.Context, err error) *gqlerror.Error {
	if appErr, ok := errors.AsType[*apperror.AppError](err); ok {
		return &gqlerror.Error{
			Message:    appErr.Message,
			Path:       graphql.GetPath(ctx),
			Extensions: appErr.Extensions(),
		}
	}

	slog.Error("internal error", "error", err, "path", graphql.GetPath(ctx))
	return &gqlerror.Error{
		Message:    "Internal server error",
		Path:       graphql.GetPath(ctx),
		Extensions: map[string]any{"code": "INTERNAL_SERVER_ERROR"},
	}
}
