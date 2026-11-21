// Package httpapi holds the few plain HTTP endpoints next to GraphQL.
package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/middleware"
	"github.com/steph-dm/MyUta/backend/internal/service"
)

// Export serves GET /export?format=json|csv as a file download for the
// signed-in user.
func Export(data *service.DataService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		file, err := data.Export(r.Context(), r.URL.Query().Get("format"))
		if err != nil {
			var ae *apperror.AppError
			switch {
			case errors.As(err, &ae) && ae.Code == apperror.CodeUnauthenticated:
				middleware.WriteError(w, http.StatusUnauthorized, ae)
			case errors.As(err, &ae):
				middleware.WriteError(w, http.StatusBadRequest, ae)
			default:
				middleware.LoggerFromContext(r.Context()).Error("export failed", "error", err)
				middleware.WriteError(w, http.StatusInternalServerError, &apperror.AppError{Code: apperror.CodeInternal, Message: "Export failed"})
			}
			return
		}
		w.Header().Set("Content-Type", file.ContentType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q; filename*=UTF-8''%s", file.Filename, url.PathEscape(file.Filename)))
		w.Header().Set("Content-Length", strconv.Itoa(len(file.Body)))
		_, _ = w.Write(file.Body) //nolint:gosec // served as an attachment with an explicit type and nosniff
	})
}
