package config

import "testing"

func TestDefaultsAreProductionAndSecretsChecked(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("APP_ENV", "")
	t.Setenv("JWT_SECRET", "your-super-secret-jwt-key-change-this")
	if _, err := Load(); err == nil {
		t.Fatal("placeholder secret accepted in production")
	}
	t.Setenv("JWT_SECRET", "short")
	if _, err := Load(); err == nil {
		t.Fatal("short secret accepted in production")
	}
	t.Setenv("JWT_SECRET", "0123456789abcdef0123456789abcdef!")
	t.Setenv("CORS_ORIGINS", "https://a.example, https://b.example/")
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Environment != EnvProduction || !cfg.SecureCookies() || cfg.IsDevelopment() {
		t.Error("default environment is not production")
	}
	if len(cfg.CORSOrigins) != 2 || cfg.CORSOrigins[1] != "https://b.example" || cfg.FrontendURL != "https://a.example" {
		t.Errorf("origins: %v frontend %s", cfg.CORSOrigins, cfg.FrontendURL)
	}

	t.Setenv("APP_ENV", "development")
	t.Setenv("JWT_SECRET", "dev")
	if _, err := Load(); err != nil {
		t.Errorf("short secret refused in development: %v", err)
	}
	t.Setenv("SMTP_HOST", "smtp.example.com")
	t.Setenv("SMTP_FROM", "")
	if _, err := Load(); err == nil {
		t.Error("SMTP without SMTP_FROM accepted")
	}
}
