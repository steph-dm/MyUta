// Command migrate manages database migrations.
//
//	go run ./cmd/migrate up               apply pending migrations (DATABASE_URL)
//	go run ./cmd/migrate status           list migrations and whether they are applied
//	go run ./cmd/migrate create add_thing create the next numbered migration file
//
// Migrations are embedded in the server binary and also run on server start
// unless RUN_MIGRATIONS=false.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"

	"github.com/steph-dm/MyUta/backend/internal/database"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

const usage = "usage: migrate up | status | create <name>"

func run(args []string) error {
	if len(args) == 0 {
		return errors.New(usage)
	}
	switch args[0] {
	case "create":
		if len(args) != 2 {
			return errors.New("usage: migrate create <name>")
		}
		path, err := create(args[1])
		if err != nil {
			return err
		}
		fmt.Println("created", path)
		return nil
	case "up", "status":
		_ = godotenv.Load()
		url := os.Getenv("DATABASE_URL")
		if url == "" {
			return errors.New("DATABASE_URL is required")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		db, err := database.Connect(ctx, url)
		if err != nil {
			return err
		}
		defer func() { _ = db.Close() }()
		if args[0] == "up" {
			return database.Migrate(ctx, db.DB)
		}
		statuses, err := database.Status(ctx, db.DB)
		if err != nil {
			return err
		}
		for _, s := range statuses {
			applied := "pending"
			if !s.AppliedAt.IsZero() {
				applied = "applied " + s.AppliedAt.Format(time.RFC3339)
			}
			fmt.Printf("%-50s %s\n", filepath.Base(s.Source.Path), applied)
		}
		return nil
	default:
		return errors.New(usage)
	}
}

var nameRe = regexp.MustCompile(`[^a-z0-9]+`)

// create writes migrations/NNN_name.sql with the next sequence number. It
// locates the directory from this source file, so it works from any folder.
func create(raw string) (string, error) {
	name := strings.Trim(nameRe.ReplaceAllString(strings.ToLower(raw), "_"), "_")
	if name == "" {
		return "", errors.New("the name must contain letters or digits")
	}
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("cannot locate the source tree")
	}
	dir := filepath.Join(filepath.Dir(self), "..", "..", "internal", "database", "migrations")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", dir, err)
	}
	next := 1
	for _, e := range entries {
		if n, err := strconv.Atoi(strings.SplitN(e.Name(), "_", 2)[0]); err == nil && n >= next {
			next = n + 1
		}
	}
	path := filepath.Join(dir, fmt.Sprintf("%03d_%s.sql", next, name))
	body := "-- +goose Up\n\n-- +goose Down\n"
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil { //nolint:gosec // a source file meant to be committed
		return "", err
	}
	return filepath.Clean(path), nil
}
