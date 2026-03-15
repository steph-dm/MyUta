package auth_test

import (
	"testing"

	"github.com/steph-dm/MyUta/backend/pkg/auth"
)

func TestHashAndComparePasswords(t *testing.T) {
	password := "MySecureP@ss1"

	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if hash == password {
		t.Error("hash should not equal plaintext password")
	}

	if !auth.ComparePasswords(password, hash) {
		t.Error("ComparePasswords() should return true for correct password")
	}

	if auth.ComparePasswords("WrongPassword1!", hash) {
		t.Error("ComparePasswords() should return false for incorrect password")
	}
}

func TestGenerateAndVerifyToken(t *testing.T) {
	secret := "test-secret-key"
	userID := "user-123"

	token, err := auth.GenerateToken(userID, secret)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if token == "" {
		t.Error("token should not be empty")
	}

	gotID, _, err := auth.VerifyToken(token, secret)
	if err != nil {
		t.Fatalf("VerifyToken() error = %v", err)
	}
	if gotID != userID {
		t.Errorf("VerifyToken() = %q, want %q", gotID, userID)
	}

	gotID, _, err = auth.VerifyToken(token, "wrong-secret")
	if err != nil {
		t.Fatalf("VerifyToken() unexpected error = %v", err)
	}
	if gotID != "" {
		t.Errorf("VerifyToken() with wrong secret = %q, want empty", gotID)
	}

	gotID, _, err = auth.VerifyToken("invalid.token.here", secret)
	if err != nil {
		t.Fatalf("VerifyToken() unexpected error = %v", err)
	}
	if gotID != "" {
		t.Errorf("VerifyToken() with invalid token = %q, want empty", gotID)
	}
}

func TestRequireAuth(t *testing.T) {
	tests := []struct {
		name    string
		userID  string
		wantErr bool
	}{
		{"authenticated", "user-123", false},
		{"empty string", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := auth.RequireAuth(tt.userID)
			if (err != nil) != tt.wantErr {
				t.Errorf("RequireAuth(%q) error = %v, wantErr %v", tt.userID, err, tt.wantErr)
			}
			if !tt.wantErr && got != tt.userID {
				t.Errorf("RequireAuth(%q) = %q, want %q", tt.userID, got, tt.userID)
			}
		})
	}
}
