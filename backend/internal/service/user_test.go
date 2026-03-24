package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

func seedTestUser(store *mockUserStore, id, email string, admin bool) *storage.User {
	name := "TestUser"
	user := &storage.User{
		ID:        id,
		Email:     email,
		Name:      &name,
		IsAdmin:   admin,
		Birthdate: scalar.FromTime(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)),
		CreatedAt: scalar.Now(),
		UpdatedAt: scalar.Now(),
	}
	store.users[id] = user
	store.emails[email] = user
	return user
}

type mockAdminStore struct {
	mockUserStore
	adminIDs map[string]bool
}

func newMockAdminStore() *mockAdminStore {
	return &mockAdminStore{
		mockUserStore: *newMockUserStore(),
		adminIDs:      make(map[string]bool),
	}
}

func (m *mockAdminStore) IsAdmin(_ context.Context, id string) (bool, error) {
	return m.adminIDs[id], nil
}

func TestMe(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		setup   func(*mockUserStore)
		wantNil bool
		wantErr bool
	}{
		{
			name:   "active user",
			userID: "u-1",
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "test@example.com", false)
			},
		},
		{
			name:   "soft-deleted user returns nil",
			userID: "u-1",
			setup: func(s *mockUserStore) {
				u := seedTestUser(s, "u-1", "del@example.com", false)
				now := scalar.Now()
				u.DeletedAt = &now
			},
			wantNil: true,
		},
		{
			name:    "unknown user",
			userID:  "nonexistent",
			setup:   func(_ *mockUserStore) {},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := service.NewUserService(store)

			user, err := svc.Me(context.Background(), tt.userID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.wantNil && user != nil {
				t.Fatal("expected nil user for deleted account")
			}
			if !tt.wantNil && user == nil {
				t.Fatal("expected user, got nil")
			}
		})
	}
}

func TestGetUser(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		callerID string
		targetID string
		setup    func(*mockAdminStore)
		wantErr  bool
	}{
		{
			name:     "self access",
			callerID: "u-1",
			targetID: "u-1",
			setup: func(s *mockAdminStore) {
				seedTestUser(&s.mockUserStore, "u-1", "test@example.com", false)
			},
		},
		{
			name:     "admin cross access",
			callerID: "u-admin",
			targetID: "u-1",
			setup: func(s *mockAdminStore) {
				seedTestUser(&s.mockUserStore, "u-admin", "admin@example.com", true)
				seedTestUser(&s.mockUserStore, "u-1", "test@example.com", false)
				s.adminIDs["u-admin"] = true
			},
		},
		{
			name:     "non-admin cross access forbidden",
			callerID: "u-2",
			targetID: "u-1",
			setup: func(s *mockAdminStore) {
				seedTestUser(&s.mockUserStore, "u-1", "test@example.com", false)
				seedTestUser(&s.mockUserStore, "u-2", "other@example.com", false)
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockAdminStore()
			tt.setup(store)
			svc := service.NewUserService(store)

			user, err := svc.GetUser(context.Background(), tt.callerID, tt.targetID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if user.ID != tt.targetID {
				t.Errorf("got id %q, want %q", user.ID, tt.targetID)
			}
		})
	}
}

func TestUpdateUser(t *testing.T) {
	t.Parallel()

	newEmail := "updated@example.com"
	newName := "UpdatedName"
	takenEmail := "taken@example.com"
	takenName := "TakenName"

	tests := []struct {
		name     string
		callerID string
		email    *string
		uname    *string
		setup    func(*mockUserStore)
		wantErr  bool
	}{
		{
			name:     "update email",
			callerID: "u-1",
			email:    &newEmail,
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "old@example.com", false)
			},
		},
		{
			name:     "update name",
			callerID: "u-1",
			uname:    &newName,
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "test@example.com", false)
			},
		},
		{
			name:     "email already taken",
			callerID: "u-1",
			email:    &takenEmail,
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "test@example.com", false)
				s.emailTaken[takenEmail] = true
			},
			wantErr: true,
		},
		{
			name:     "name already taken",
			callerID: "u-1",
			uname:    &takenName,
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "test@example.com", false)
				s.nameTaken[takenName] = true
			},
			wantErr: true,
		},
		{
			name:     "wrong caller forbidden",
			callerID: "u-2",
			email:    &newEmail,
			setup: func(s *mockUserStore) {
				seedTestUser(s, "u-1", "test@example.com", false)
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockUserStore()
			tt.setup(store)
			svc := service.NewUserService(store)

			_, err := svc.UpdateUser(context.Background(), tt.callerID, "u-1", tt.email, tt.uname, nil, nil)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestRequireAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		userID  string
		isAdmin bool
		wantErr bool
	}{
		{name: "admin passes", userID: "u-1", isAdmin: true},
		{name: "non-admin blocked", userID: "u-2", isAdmin: false, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			store := newMockAdminStore()
			if tt.isAdmin {
				store.adminIDs[tt.userID] = true
			}
			svc := service.NewUserService(store)

			err := svc.RequireAdmin(context.Background(), tt.userID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
