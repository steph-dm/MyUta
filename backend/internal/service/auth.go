package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
	"github.com/steph-dm/MyUta/backend/pkg/auth"
	"github.com/steph-dm/MyUta/backend/pkg/config"
	"github.com/steph-dm/MyUta/backend/pkg/middleware"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

type AuthService struct {
	store       storage.UserStorer
	config      *config.Config
	rateLimiter *middleware.RateLimiter
}

func NewAuthService(store storage.UserStorer, cfg *config.Config, rl *middleware.RateLimiter) *AuthService {
	return &AuthService{store: store, config: cfg, rateLimiter: rl}
}

func (s *AuthService) Register(ctx context.Context, clientIP, email, password, name string, birthdate scalar.DateTime) (*storage.AuthPayload, error) {
	if err := s.rateLimiter.Check("register:"+clientIP, 5, 900); err != nil {
		return nil, apperror.Forbidden(err.Error())
	}
	if err := s.rateLimiter.Check("register-email:"+email, 3, 900); err != nil {
		return nil, apperror.Forbidden(err.Error())
	}

	if err := validator.Email(email); err != nil {
		return nil, err
	}
	if err := validator.Password(password); err != nil {
		return nil, err
	}
	if err := validator.Name(name); err != nil {
		return nil, err
	}
	if err := validator.Birthdate(birthdate.Time); err != nil {
		return nil, err
	}

	exists, err := s.store.EmailExists(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("can't check email: %w", err)
	}
	if exists {
		return nil, apperror.BadInput("Email already in use", "email")
	}

	exists, err = s.store.NameExists(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("can't check name: %w", err)
	}
	if exists {
		return nil, apperror.BadInput("Name already taken", "name")
	}

	hashed, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("can't hash password: %w", err)
	}

	now := scalar.Now()
	trimmedName := strings.TrimSpace(name)
	user := &storage.User{
		ID:        uuid.NewString(),
		Email:     email,
		Password:  hashed,
		Name:      &trimmedName,
		Birthdate: birthdate,
		IsAdmin:   false,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.store.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("can't create user: %w", err)
	}

	token, err := auth.GenerateToken(user.ID, s.config.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("can't generate token: %w", err)
	}

	created, err := s.store.GetUser(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("can't get user: %w", err)
	}
	return &storage.AuthPayload{Token: token, User: created}, nil
}

func (s *AuthService) Login(ctx context.Context, clientIP, email, password string) (*storage.AuthPayload, error) {
	if err := s.rateLimiter.Check("login:"+clientIP, 10, 900); err != nil {
		return nil, apperror.Forbidden(err.Error())
	}

	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.Unauthenticated("Invalid email or password")
		}
		return nil, fmt.Errorf("can't get user: %w", err)
	}
	if user.DeletedAt != nil {
		return nil, apperror.Forbidden("This account has been deactivated")
	}

	if !auth.ComparePasswords(password, user.Password) {
		return nil, apperror.Unauthenticated("Invalid email or password")
	}

	token, err := auth.GenerateToken(user.ID, s.config.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("can't generate token: %w", err)
	}

	return &storage.AuthPayload{Token: token, User: user}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, userID string) (*storage.AuthPayload, error) {
	user, err := s.store.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, apperror.Unauthenticated("User not found")
		}
		return nil, fmt.Errorf("can't get user: %w", err)
	}
	if user.DeletedAt != nil {
		return nil, apperror.Forbidden("This account has been deactivated")
	}

	token, err := auth.GenerateToken(user.ID, s.config.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("can't generate token: %w", err)
	}

	return &storage.AuthPayload{Token: token, User: user}, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) (bool, error) {
	hashed, err := s.store.GetPassword(ctx, userID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return false, apperror.NotFound("User")
		}
		return false, fmt.Errorf("can't get password: %w", err)
	}
	if !auth.ComparePasswords(currentPassword, hashed) {
		return false, apperror.BadInput("Current password is incorrect", "currentPassword")
	}
	if err := validator.Password(newPassword); err != nil {
		return false, err
	}

	newHashed, err := auth.HashPassword(newPassword)
	if err != nil {
		return false, fmt.Errorf("can't hash password: %w", err)
	}
	if err := s.store.UpdatePassword(ctx, userID, newHashed); err != nil {
		return false, fmt.Errorf("can't update password: %w", err)
	}
	return true, nil
}

func (s *AuthService) DeleteAccount(ctx context.Context, userID, password string) (bool, error) {
	hashed, err := s.store.GetPassword(ctx, userID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return false, apperror.NotFound("User")
		}
		return false, fmt.Errorf("can't get password: %w", err)
	}
	if !auth.ComparePasswords(password, hashed) {
		return false, apperror.BadInput("Password is incorrect", "password")
	}

	if err := s.store.SoftDeleteUser(ctx, userID); err != nil {
		return false, fmt.Errorf("can't delete account: %w", err)
	}
	return true, nil
}
