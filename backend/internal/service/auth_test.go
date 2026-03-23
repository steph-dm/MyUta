package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/auth"
	"github.com/steph-dm/MyUta/backend/pkg/config"
	"github.com/steph-dm/MyUta/backend/pkg/middleware"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

type mockUserStore struct {
	users      map[string]*storage.User
	emails     map[string]*storage.User
	passwords  map[string]string
	emailTaken map[string]bool
	nameTaken  map[string]bool

	createErr error
	getErr    error
}

func newMockUserStore() *mockUserStore {
	return &mockUserStore{
		users:      make(map[string]*storage.User),
		emails:     make(map[string]*storage.User),
		passwords:  make(map[string]string),
		emailTaken: make(map[string]bool),
		nameTaken:  make(map[string]bool),
	}
}

func (m *mockUserStore) GetUser(_ context.Context, id string) (*storage.User, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	u, ok := m.users[id]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return u, nil
}

func (m *mockUserStore) GetUserByEmail(_ context.Context, email string) (*storage.User, error) {
	u, ok := m.emails[email]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return u, nil
}

func (m *mockUserStore) EmailExists(_ context.Context, email string, _ ...string) (bool, error) {
	return m.emailTaken[email], nil
}

func (m *mockUserStore) NameExists(_ context.Context, name string, _ ...string) (bool, error) {
	return m.nameTaken[name], nil
}

func (m *mockUserStore) CreateUser(_ context.Context, user *storage.User) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.users[user.ID] = user
	m.emails[user.Email] = user
	m.passwords[user.ID] = user.Password
	return nil
}

func (m *mockUserStore) UpdateUser(_ context.Context, _ *storage.User, _ ...string) error {
	return nil
}

func (m *mockUserStore) UpdatePassword(_ context.Context, id string, hashed string) error {
	m.passwords[id] = hashed
	if u, ok := m.users[id]; ok {
		u.Password = hashed
	}
	return nil
}

func (m *mockUserStore) GetPassword(_ context.Context, id string) (string, error) {
	p, ok := m.passwords[id]
	if !ok {
		return "", storage.ErrNotFound
	}
	return p, nil
}

func (m *mockUserStore) SoftDeleteUser(_ context.Context, id string) error {
	u, ok := m.users[id]
	if !ok {
		return storage.ErrNotFound
	}
	now := scalar.Now()
	u.DeletedAt = &now
	return nil
}

func (m *mockUserStore) IsAdmin(_ context.Context, _ string) (bool, error) {
	return false, nil
}

func (m *mockUserStore) ListActiveUsers(_ context.Context) ([]*storage.User, error) {
	return nil, nil
}

func (m *mockUserStore) IsActiveUser(_ context.Context, _ string, _ time.Time) (bool, error) {
	return true, nil
}

func newTestService(store storage.UserStorer) *service.AuthService {
	cfg := &config.Config{JWTSecret: "test-secret-key-for-unit-tests"}
	rl := middleware.NewRateLimiter()
	return service.NewAuthService(store, cfg, rl)
}

func seedUser(t *testing.T, store *mockUserStore, id, email, password string) *storage.User {
	t.Helper()
	hashed, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("seed hash: %v", err)
	}
	name := "TestUser"
	user := &storage.User{
		ID:        id,
		Email:     email,
		Password:  hashed,
		Name:      &name,
		Birthdate: scalar.FromTime(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)),
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}
	store.users[id] = user
	store.emails[email] = user
	store.passwords[id] = hashed
	return user
}

func TestLogin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		email     string
		password  string
		setup     func(*mockUserStore)
		wantErr   bool
		wantToken bool
	}{
		{
			name:      "valid credentials",
			email:     "test@example.com",
			password:  "V@lidPass1234",
			setup:     func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "V@lidPass1234") },
			wantToken: true,
		},
		{
			name:     "wrong password",
			email:    "test@example.com",
			password: "Wr0ngP@ss123!",
			setup:    func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "V@lidPass1234") },
			wantErr:  true,
		},
		{
			name:     "unknown email",
			email:    "nobody@example.com",
			password: "V@lidPass1234",
			setup:    func(_ *mockUserStore) {},
			wantErr:  true,
		},
		{
			name:     "deleted account",
			email:    "deleted@example.com",
			password: "V@lidPass1234",
			setup: func(s *mockUserStore) {
				u := seedUser(t, s, "user-2", "deleted@example.com", "V@lidPass1234")
				now := scalar.Now()
				u.DeletedAt = &now
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := newTestService(store)

			result, err := svc.Login(context.Background(), "127.0.0.1", tt.email, tt.password)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !tt.wantToken {
				return
			}
			if result.Token == "" {
				t.Error("expected non-empty token")
			}
			if result.User == nil {
				t.Error("expected user in payload")
			}
		})
	}
}

func TestRefreshToken(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		setup   func(*mockUserStore)
		wantErr bool
	}{
		{
			name:   "valid user",
			userID: "user-1",
			setup:  func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "pass") },
		},
		{
			name:    "unknown user",
			userID:  "nonexistent",
			setup:   func(_ *mockUserStore) {},
			wantErr: true,
		},
		{
			name:   "deleted user",
			userID: "user-2",
			setup: func(s *mockUserStore) {
				u := seedUser(t, s, "user-2", "del@example.com", "pass")
				now := scalar.Now()
				u.DeletedAt = &now
			},
			wantErr: true,
		},
		{
			name:   "store error",
			userID: "user-3",
			setup: func(s *mockUserStore) {
				s.getErr = errors.New("db down")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := newTestService(store)

			result, err := svc.RefreshToken(context.Background(), tt.userID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Token == "" {
				t.Error("expected non-empty token")
			}
			if result.User == nil {
				t.Error("expected user in payload")
			}
		})
	}
}

func TestChangePassword(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		userID      string
		currentPass string
		newPass     string
		setup       func(*mockUserStore)
		wantErr     bool
	}{
		{
			name:        "valid change",
			userID:      "user-1",
			currentPass: "OldP@ssw0rd!!",
			newPass:     "NewP@ssw0rd!!",
			setup:       func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "OldP@ssw0rd!!") },
		},
		{
			name:        "wrong current password",
			userID:      "user-1",
			currentPass: "Wr0ngP@ss123!",
			newPass:     "NewP@ssw0rd!!",
			setup:       func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "OldP@ssw0rd!!") },
			wantErr:     true,
		},
		{
			name:        "weak new password",
			userID:      "user-1",
			currentPass: "OldP@ssw0rd!!",
			newPass:     "weak",
			setup:       func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "OldP@ssw0rd!!") },
			wantErr:     true,
		},
		{
			name:        "unknown user",
			userID:      "nonexistent",
			currentPass: "Something1!!",
			newPass:     "NewP@ssw0rd!!",
			setup:       func(_ *mockUserStore) {},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := newTestService(store)

			ok, err := svc.ChangePassword(context.Background(), tt.userID, tt.currentPass, tt.newPass)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !ok {
				t.Error("expected true")
			}

			// Verify new password works after change
			newHashed := store.passwords[tt.userID]
			if !auth.ComparePasswords(tt.newPass, newHashed) {
				t.Error("new password should be verifiable after change")
			}
		})
	}
}

func TestDeleteAccount(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		userID   string
		password string
		setup    func(*mockUserStore)
		wantErr  bool
	}{
		{
			name:     "valid deletion",
			userID:   "user-1",
			password: "V@lidPass1234",
			setup:    func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "V@lidPass1234") },
		},
		{
			name:     "wrong password",
			userID:   "user-1",
			password: "Wr0ngP@ss123!",
			setup:    func(s *mockUserStore) { seedUser(t, s, "user-1", "test@example.com", "V@lidPass1234") },
			wantErr:  true,
		},
		{
			name:     "unknown user",
			userID:   "nonexistent",
			password: "Anything123!!",
			setup:    func(_ *mockUserStore) {},
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := newTestService(store)

			ok, err := svc.DeleteAccount(context.Background(), tt.userID, tt.password)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !ok {
				t.Error("expected true")
			}

			// Verify user is soft-deleted
			u := store.users[tt.userID]
			if u.DeletedAt == nil {
				t.Error("expected DeletedAt to be set after deletion")
			}
		})
	}
}

func TestRegister(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		email   string
		pass    string
		uname   string
		setup   func(*mockUserStore)
		wantErr bool
	}{
		{
			name:  "valid registration",
			email: "new@example.com",
			pass:  "V@lidPass1234",
			uname: "NewUser",
			setup: func(_ *mockUserStore) {},
		},
		{
			name:    "duplicate email",
			email:   "taken@example.com",
			pass:    "V@lidPass1234",
			uname:   "NewUser",
			setup:   func(s *mockUserStore) { s.emailTaken["taken@example.com"] = true },
			wantErr: true,
		},
		{
			name:    "duplicate name",
			email:   "new@example.com",
			pass:    "V@lidPass1234",
			uname:   "TakenName",
			setup:   func(s *mockUserStore) { s.nameTaken["TakenName"] = true },
			wantErr: true,
		},
		{
			name:    "invalid email",
			email:   "not-an-email",
			pass:    "V@lidPass1234",
			uname:   "NewUser",
			setup:   func(_ *mockUserStore) {},
			wantErr: true,
		},
		{
			name:    "weak password",
			email:   "new@example.com",
			pass:    "weak",
			uname:   "NewUser",
			setup:   func(_ *mockUserStore) {},
			wantErr: true,
		},
		{
			name:  "store create error",
			email: "new@example.com",
			pass:  "V@lidPass1234",
			uname: "NewUser",
			setup: func(s *mockUserStore) {
				s.createErr = errors.New("db write failed")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := newTestService(store)

			birthdate := scalar.FromTime(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC))
			result, err := svc.Register(context.Background(), "127.0.0.1", tt.email, tt.pass, tt.uname, birthdate)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Token == "" {
				t.Error("expected non-empty token")
			}
			if result.User == nil {
				t.Error("expected user in payload")
			}
		})
	}
}
