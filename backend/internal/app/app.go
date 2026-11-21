// Package app wires configuration, storage, services and HTTP routes. It is
// used by cmd/server and by the integration tests, so tests exercise exactly
// the production handler chain.
package app

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/uptrace/bun"

	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/graph"
	"github.com/steph-dm/MyUta/backend/internal/graph/loaders"
	"github.com/steph-dm/MyUta/backend/internal/httpapi"
	"github.com/steph-dm/MyUta/backend/internal/mail"
	mw "github.com/steph-dm/MyUta/backend/internal/middleware"
	"github.com/steph-dm/MyUta/backend/internal/ocr"
	"github.com/steph-dm/MyUta/backend/internal/ratelimit"
	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/session"
	pgstore "github.com/steph-dm/MyUta/backend/internal/storage/postgres"
	"github.com/steph-dm/MyUta/backend/internal/youtube"
)

// App is the assembled application.
type App struct {
	Handler  http.Handler
	Store    *pgstore.Store
	Services *service.Services
	Limiter  *ratelimit.Limiter
}

// Options lets tests replace external services.
type Options struct {
	Mailer  mail.Sender
	YouTube youtube.Searcher
	OCR     ocr.Extractor
	Now     func() time.Time
}

// New builds the application. With a zero Options the external services are
// created from the configuration.
func New(cfg *config.Config, db *bun.DB, opts *Options) *App {
	if opts == nil {
		opts = &Options{
			Mailer:  mail.New(cfg),
			YouTube: youtube.NewClient(cfg.YouTubeAPIKey),
			OCR:     ocr.NewClaude(cfg.AnthropicKey, cfg.AnthropicModel),
		}
	}
	store := pgstore.New(db)
	limiter := ratelimit.New()
	sessions := session.NewManager(store, cfg.JWTSecret, cfg.SessionTTL, cfg.SecureCookies())
	services := service.New(service.Deps{
		Store: store, Sessions: sessions, Limiter: limiter, Config: cfg,
		Mailer: opts.Mailer, YouTube: opts.YouTube, OCR: opts.OCR, Now: opts.Now,
	})

	// API routes: client header (CSRF), body limit, session, dataloaders.
	api := func(h http.Handler) http.Handler {
		h = loaders.Middleware(store)(h)
		h = mw.Auth(sessions)(h)
		h = mw.BodyLimit(config.MaxJSONBodyBytes, config.MaxUploadBytes)(h)
		return mw.RequireClientHeader(h)
	}

	mux := http.NewServeMux()
	mux.Handle("/graphql", api(graph.NewHandler(services, cfg.IsDevelopment())))
	mux.Handle("/export", api(httpapi.Export(services.Data)))
	mux.HandleFunc("GET /livez", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := store.Ping(ctx); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte("ok"))
	})
	if cfg.IsDevelopment() {
		// GraphiQL: add the header {"X-MyUta-Client":"graphiql"} in its headers panel.
		mux.Handle("GET /{$}", playground.Handler("MyUta API", "/graphql"))
	}

	var h http.Handler = mux
	h = mw.RequestFacts(cfg.TrustedProxies)(h)
	h = mw.CORS(cfg.CORSOrigins)(h)
	h = mw.SecurityHeaders(h)
	h = mw.Logger(h)
	h = mw.RequestID(h)
	h = mw.Recovery(h)

	slog.Info("optional features",
		"ocr", services.Media.OCREnabled(), "youtube_search", services.Media.YouTubeEnabled(),
		"mail", services.Account.MailEnabled())
	return &App{Handler: h, Store: store, Services: services, Limiter: limiter}
}

// CleanupSessions removes expired sessions and old tokens every hour until ctx ends.
func (a *App) CleanupSessions(ctx context.Context) {
	t := time.NewTicker(time.Hour)
	defer t.Stop()
	for {
		if n, err := a.Store.DeleteExpiredSessions(ctx); err != nil && ctx.Err() == nil {
			slog.Warn("session cleanup failed", "error", err)
		} else if n > 0 {
			slog.Info("expired sessions removed", "count", n)
		}
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
