package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/steph-dm/MyUta/backend/internal/graph"
	"github.com/steph-dm/MyUta/backend/internal/graph/dataloader"
	"github.com/steph-dm/MyUta/backend/internal/service"
	pgstore "github.com/steph-dm/MyUta/backend/internal/storage/postgres"
	"github.com/steph-dm/MyUta/backend/pkg/auth"
	"github.com/steph-dm/MyUta/backend/pkg/config"
	"github.com/steph-dm/MyUta/backend/pkg/database"
	mw "github.com/steph-dm/MyUta/backend/pkg/middleware"
	"github.com/steph-dm/MyUta/backend/pkg/youtube"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	slog.Info("starting MyUta Go backend")

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}
	slog.Info("configuration loaded",
		"port", cfg.Port,
		"environment", cfg.Environment,
		"cors_origin", cfg.CORSOrigin,
	)

	ctx := context.Background()
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	if err := database.Migrate(ctx, db); err != nil {
		slog.Error("can't run database migration", "error", err)
		os.Exit(1)
	}

	store := pgstore.NewStore(db)

	ytClient := youtube.NewClient(cfg.YouTubeAPIKey)
	ocr := service.NewClaudeOCR(cfg.AnthropicKey, cfg.AnthropicModel)
	rateLimiter := mw.NewRateLimiter()
	defer rateLimiter.Close()

	authService := service.NewAuthService(store, cfg, rateLimiter)
	userService := service.NewUserService(store)
	artistService := service.NewArtistService(store)
	songService := service.NewSongService(store)
	reviewService := service.NewReviewService(store)
	exportService := service.NewExportService(store)

	resolver := &graph.Resolver{
		AuthService:   authService,
		UserService:   userService,
		ArtistService: artistService,
		SongService:   songService,
		ReviewService: reviewService,
		ExportService: exportService,
		YouTube:       ytClient,
		OCR:           ocr,
		RateLimiter:   rateLimiter,
		SecureCookie:  !cfg.IsDevelopment(),
	}

	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: resolver,
	}))

	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.POST{})

	srv.Use(extension.FixedComplexityLimit(200))
	srv.Use(graph.DepthLimiter{})

	if cfg.IsDevelopment() {
		srv.Use(extension.Introspection{})
	}

	srv.SetErrorPresenter(graph.ErrorPresenter)

	mux := http.NewServeMux()

	graphqlHandler := dataloader.Middleware(store, auth.UserIDFromContext)(srv)
	graphqlHandler = injectRequest(graphqlHandler)

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		if err := db.PingContext(r.Context()); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
		if r.Method != http.MethodHead {
			_, _ = w.Write([]byte("ok"))
		}
	})
	mux.Handle("/graphql", http.MaxBytesHandler(graphqlHandler, 5*1024*1024)) // 5 MB limit

	if cfg.IsDevelopment() {
		mux.Handle("/", playground.Handler("MyUta API", "/graphql"))
		slog.Info("GraphiQL playground enabled at /")
	}

	var httpHandler http.Handler = mux
	httpHandler = mw.Auth(cfg.JWTSecret, store)(httpHandler)
	httpHandler = mw.CORS(cfg.CORSOrigin)(httpHandler)
	httpHandler = mw.SecurityHeaders(httpHandler)
	httpHandler = mw.Logger(httpHandler)
	httpHandler = mw.RequestID(httpHandler)
	httpHandler = mw.Recovery(httpHandler)

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           httpHandler,
		ReadTimeout:       30 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		slog.Info("GraphQL server ready",
			"url", fmt.Sprintf("http://localhost:%d/graphql", cfg.Port),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	slog.Info("shutting down gracefully", "signal", sig.String())

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "error", err)
		os.Exit(1)
	}

	if err := db.Close(); err != nil {
		slog.Error("closing database", "error", err)
	}
	slog.Info("server stopped cleanly")
}

func injectRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), graph.HTTPRequestKey, r)
		ctx = context.WithValue(ctx, graph.HTTPResponseKey, w)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
