// Command server runs the MyUta API.
//
//	server               start the HTTP server (runs migrations unless RUN_MIGRATIONS=false)
//	server -healthcheck  exit 0 if http://127.0.0.1:$PORT/livez answers (container health checks)
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/app"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/database"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "probe the local server and exit")
	flag.Parse()
	if *healthcheck {
		os.Exit(probe())
	}
	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func probe() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	c := &http.Client{Timeout: 3 * time.Second}
	resp, err := c.Get("http://127.0.0.1:" + port + "/livez") //nolint:gosec // fixed local address
	if err != nil {
		return 1
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("configuration: %w", err)
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel})))
	slog.Info("starting MyUta backend", "environment", cfg.Environment, "port", cfg.Port, "cors_origins", cfg.CORSOrigins)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()
	if cfg.RunMigrations {
		if err := database.Migrate(ctx, db.DB); err != nil {
			return err
		}
	} else {
		slog.Info("RUN_MIGRATIONS=false: not running migrations (use cmd/migrate)")
	}

	a := app.New(cfg, db, nil)
	defer a.Limiter.Close()

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           a.Handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second, // above ocr.Timeout so slow OCR still gets an answer
		IdleTimeout:       120 * time.Second,
	}

	go a.CleanupSessions(ctx)

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}
	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
