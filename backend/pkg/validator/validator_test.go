package validator_test

import (
	"math"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

func TestReviewScore(t *testing.T) {
	tests := []struct {
		name    string
		score   float64
		wantErr bool
	}{
		{"valid zero", 0, false},
		{"valid mid", 50.5, false},
		{"valid max", 100, false},
		{"valid decimal", 85.123, false},
		{"negative", -1, true},
		{"above max", 100.1, true},
		{"NaN", math.NaN(), true},
		{"positive infinity", math.Inf(1), true},
		{"negative infinity", math.Inf(-1), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ReviewScore(tt.score)
			if (err != nil) != tt.wantErr {
				t.Errorf("ReviewScore(%v) error = %v, wantErr %v", tt.score, err, tt.wantErr)
			}
		})
	}
}

func TestEmail(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"valid simple", "user@example.com", false},
		{"valid subdomain", "user@mail.example.co.jp", false},
		{"missing @", "userexample.com", true},
		{"missing domain", "user@", true},
		{"missing local", "@example.com", true},
		{"spaces", "user @example.com", true},
		{"empty", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.Email(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("Email(%q) error = %v, wantErr %v", tt.email, err, tt.wantErr)
			}
		})
	}
}

func TestPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{"valid complex", "MyP@ssword123", false},
		{"valid all requirements", "Abcdefghij1!", false},
		{"too short", "MyP@ss1!", true},
		{"no uppercase", "mypassword@123", true},
		{"no lowercase", "MYPASSWORD@123", true},
		{"no number", "MyP@sswordabc", true},
		{"no special", "MyPassword123", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.Password(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("Password(%q) error = %v, wantErr %v", tt.password, err, tt.wantErr)
			}
		})
	}
}

func TestName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid name", "KenP", false},
		{"valid 1 char", "K", false},
		{"valid 20 chars", "12345678901234567890", false},
		{"empty", "", true},
		{"only spaces", "   ", true},
		{"21 chars", "123456789012345678901", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.Name(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("Name(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}

func TestBirthdate(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name    string
		date    time.Time
		wantErr bool
	}{
		{"valid 25 years ago", now.AddDate(-25, 0, 0), false},
		{"valid 13 years ago", now.AddDate(-13, 0, -1), false},
		{"future date", now.AddDate(0, 0, 1), true},
		{"too young (12)", now.AddDate(-12, 0, 0), true},
		{"too old (121)", now.AddDate(-121, 0, 0), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.Birthdate(tt.date)
			if (err != nil) != tt.wantErr {
				t.Errorf("Birthdate(%v) error = %v, wantErr %v", tt.date, err, tt.wantErr)
			}
		})
	}
}

func TestSongTitle(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		wantErr bool
	}{
		{"valid ASCII", "My Song", false},
		{"valid Japanese", "桜の花びらたち", false},
		{"valid single char", "A", false},
		{"empty", "", true},
		{"only spaces", "   ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.SongTitle(tt.title)
			if (err != nil) != tt.wantErr {
				t.Errorf("SongTitle(%q) error = %v, wantErr %v", tt.title, err, tt.wantErr)
			}
		})
	}
}

func TestNotes(t *testing.T) {
	long := make([]byte, 1001)
	for i := range long {
		long[i] = 'a'
	}
	longStr := string(long)
	short := "Some notes about the performance"

	tests := []struct {
		name    string
		notes   *string
		wantErr bool
	}{
		{"nil notes", nil, false},
		{"valid short", &short, false},
		{"too long", &longStr, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.Notes(tt.notes)
			if (err != nil) != tt.wantErr {
				t.Errorf("Notes(%v) error = %v, wantErr %v", tt.notes, err, tt.wantErr)
			}
		})
	}
}
