// Package config reads the process configuration from the environment.
// Defaults are safe for production; development features must be enabled
// explicitly with APP_ENV=development.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
	EnvTest        = "test"

	// MaxUploadBytes is the single size limit for uploaded files (screenshots,
	// import files). nginx allows slightly more so this limit is the one users hit.
	MaxUploadBytes int64 = 10 << 20
	// MaxJSONBodyBytes limits ordinary GraphQL requests.
	MaxJSONBodyBytes int64 = 1 << 20
	// MaxImportRows caps the number of reviews in one import.
	MaxImportRows = 5000

	minSecretBytes = 32
)

// placeholderSecrets are the example values shipped in the repository.
var placeholderSecrets = []string{
	"change-this-to-a-random-secret",
	"your-super-secret-jwt-key-change-this",
	"changeme", "secret",
}

// SMTP configures outgoing e-mail. Host empty means e-mail is disabled.
type SMTP struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func (s SMTP) Enabled() bool { return s.Host != "" }

type Config struct {
	Environment    string
	DatabaseURL    string
	JWTSecret      string
	Port           int
	CORSOrigins    []string
	FrontendURL    string
	TrustedProxies []netip.Prefix
	SessionTTL     time.Duration
	RunMigrations  bool
	LogLevel       slog.Level

	YouTubeAPIKey  string
	AnthropicKey   string
	AnthropicModel string

	SMTP SMTP
}

func (c *Config) IsDevelopment() bool { return c.Environment == EnvDevelopment }

// SecureCookies is false only in development (plain http on localhost).
func (c *Config) SecureCookies() bool { return !c.IsDevelopment() }

// Load reads .env (if present) and the environment.
func Load() (*Config, error) {
	_ = godotenv.Load()
	var errs []error

	cfg := &Config{
		Environment:    strings.ToLower(env("APP_ENV", EnvProduction)),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		YouTubeAPIKey:  os.Getenv("YOUTUBE_API_KEY"),
		AnthropicKey:   os.Getenv("ANTHROPIC_API_KEY"),
		AnthropicModel: env("ANTHROPIC_MODEL", "claude-haiku-5-5"),
	}
	switch cfg.Environment {
	case EnvDevelopment, EnvProduction, EnvTest:
	default:
		errs = append(errs, fmt.Errorf("APP_ENV must be development, production or test (got %q)", cfg.Environment))
	}

	var err error
	if cfg.Port, err = envInt("PORT", 4000); err != nil {
		errs = append(errs, err)
	}
	if cfg.RunMigrations, err = envBool("RUN_MIGRATIONS", true); err != nil {
		errs = append(errs, err)
	}
	if cfg.SessionTTL, err = envDuration("SESSION_TTL", 7*24*time.Hour); err != nil {
		errs = append(errs, err)
	} else if cfg.SessionTTL < time.Hour {
		errs = append(errs, errors.New("SESSION_TTL must be at least 1h"))
	}
	if err := cfg.LogLevel.UnmarshalText([]byte(env("LOG_LEVEL", "info"))); err != nil {
		errs = append(errs, fmt.Errorf("LOG_LEVEL: %w", err))
	}

	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if err := checkSecret(cfg.JWTSecret, cfg.IsDevelopment()); err != nil {
		errs = append(errs, err)
	}

	// CORS_ORIGINS (comma separated); CORS_ORIGIN is still read for old .env files.
	origins := env("CORS_ORIGINS", os.Getenv("CORS_ORIGIN"))
	if origins == "" && cfg.IsDevelopment() {
		origins = "http://localhost:3000"
	}
	for _, o := range strings.Split(origins, ",") {
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			if u, err := url.Parse(o); err != nil || u.Scheme == "" || u.Host == "" {
				errs = append(errs, fmt.Errorf("CORS_ORIGINS: %q is not an origin like https://example.com", o))
				continue
			}
			cfg.CORSOrigins = append(cfg.CORSOrigins, o)
		}
	}

	cfg.FrontendURL = strings.TrimRight(env("FRONTEND_URL", firstOr(cfg.CORSOrigins, "")), "/")

	proxies := env("TRUSTED_PROXIES", "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7")
	for _, p := range strings.Split(proxies, ",") {
		if p = strings.TrimSpace(p); p == "" {
			continue
		}
		prefix, err := netip.ParsePrefix(p)
		if err != nil {
			addr, aerr := netip.ParseAddr(p)
			if aerr != nil {
				errs = append(errs, fmt.Errorf("TRUSTED_PROXIES: %q is not an address or CIDR prefix", p))
				continue
			}
			prefix = netip.PrefixFrom(addr, addr.BitLen())
		}
		cfg.TrustedProxies = append(cfg.TrustedProxies, prefix.Masked())
	}

	cfg.SMTP = SMTP{
		Host:     os.Getenv("SMTP_HOST"),
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
	}
	if cfg.SMTP.Port, err = envInt("SMTP_PORT", 587); err != nil {
		errs = append(errs, err)
	}
	if cfg.SMTP.Enabled() {
		if cfg.SMTP.From == "" {
			errs = append(errs, errors.New("SMTP_FROM is required when SMTP_HOST is set"))
		}
		if cfg.FrontendURL == "" {
			errs = append(errs, errors.New("FRONTEND_URL is required when e-mail is enabled (links in e-mails)"))
		}
	}

	if len(errs) > 0 {
		return nil, errors.Join(errs...)
	}
	return cfg, nil
}

func checkSecret(secret string, dev bool) error {
	if secret == "" {
		return errors.New("JWT_SECRET is required")
	}
	if dev {
		return nil
	}
	for _, p := range placeholderSecrets {
		if strings.EqualFold(secret, p) {
			return errors.New("JWT_SECRET is still the example value; generate one with: openssl rand -base64 48")
		}
	}
	if len(secret) < minSecretBytes {
		return fmt.Errorf("JWT_SECRET must be at least %d bytes; generate one with: openssl rand -base64 48", minSecretBytes)
	}
	return nil
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s must be a number (got %q)", key, v)
	}
	return n, nil
}

func envBool(key string, fallback bool) (bool, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false (got %q)", key, v)
	}
	return b, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s must be a duration like 168h (got %q)", key, v)
	}
	return d, nil
}

func firstOr(list []string, fallback string) string {
	if len(list) > 0 {
		return list[0]
	}
	return fallback
}
