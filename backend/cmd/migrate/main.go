package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const migrationsDir = "pkg/database/migrations"

const template = `-- +goose Up

-- +goose Down
`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "usage: go run ./cmd/migrate <name>\n")
		fmt.Fprintf(os.Stderr, "example: go run ./cmd/migrate add_avatar_column\n")
		os.Exit(1)
	}

	name := os.Args[1]
	timestamp := time.Now().UTC().Format("20060102150405")
	filename := fmt.Sprintf("%s_%s.sql", timestamp, name)
	path := filepath.Join(migrationsDir, filename)

	if err := os.MkdirAll(migrationsDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "can't create migrations dir: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(path, []byte(template), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "can't write migration file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("created %s\n", path)
}
