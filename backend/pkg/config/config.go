package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	JWTSecret      string
	YouTubeAPIKey  string
	AnthropicKey   string
	AnthropicModel string
	Port           int
	CORSOrigin     string
	Environment    string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		YouTubeAPIKey:  optionalEnv("YOUTUBE_API_KEY", ""),
		AnthropicKey:   optionalEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel: optionalEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
		Port:           envInt("PORT", 4000),
		CORSOrigin:     optionalEnv("CORS_ORIGIN", "http://localhost:3000"),
		Environment:    optionalEnv("APP_ENV", "development"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	if strings.Contains(cfg.DatabaseURL, "sslmode=disable") &&
		!strings.Contains(cfg.DatabaseURL, "localhost") &&
		!strings.Contains(cfg.DatabaseURL, "127.0.0.1") {
		slog.Warn("sslmode=disable on non-localhost database")
	}

	return cfg, nil
}

func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

func optionalEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func envInt(key string, fallback int) int {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		slog.Error("bad int env", "key", key, "value", val)
		return fallback
	}
	return n
}
