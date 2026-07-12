package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
	"github.com/steph-dm/MyUta/backend/pkg/validator"
)

type UserService struct {
	store storage.UserStorer
}

func NewUserService(store storage.UserStorer) *UserService {
	return &UserService{store: store}
}

func (s *UserService) Me(ctx context.Context, userID string) (*storage.User, error) {
	user, err := s.store.GetUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("can't get user: %w", err)
	}
	return user, nil
}

func (s *UserService) GetUser(ctx context.Context, callerID, targetID string) (*storage.User, error) {
	if callerID != targetID {
		if err := s.RequireAdmin(ctx, callerID); err != nil {
			return nil, err
		}
	}
	return s.store.GetUser(ctx, targetID)
}

func (s *UserService) ListUsers(ctx context.Context, callerID string) ([]*storage.User, error) {
	if err := s.RequireAdmin(ctx, callerID); err != nil {
		return nil, err
	}
	return s.store.ListUsers(ctx)
}

func (s *UserService) GetUserByID(ctx context.Context, id string) (*storage.User, error) {
	return s.store.GetUser(ctx, id)
}

func (s *UserService) UpdateUser(ctx context.Context, callerID, targetID string, email, name *string, defaultMachineType *storage.MachineType, clearDefaultMachineType *bool) (*storage.User, error) {
	if callerID != targetID {
		return nil, apperror.Forbidden("Not authorized to update this user")
	}

	user, err := s.store.GetUser(ctx, targetID)
	if err != nil {
		return nil, fmt.Errorf("can't get user: %w", err)
	}

	var columns []string

	if email != nil {
		if err := validator.Email(*email); err != nil {
			return nil, err
		}
		exists, err := s.store.EmailExists(ctx, *email, targetID)
		if err != nil {
			return nil, fmt.Errorf("can't check email: %w", err)
		}
		if exists {
			return nil, apperror.BadInput("Email already in use", "email")
		}
		user.Email = *email
		columns = append(columns, "email")
	}
	if name != nil {
		if err := validator.Name(*name); err != nil {
			return nil, err
		}
		exists, err := s.store.NameExists(ctx, *name, targetID)
		if err != nil {
			return nil, fmt.Errorf("can't check name: %w", err)
		}
		if exists {
			return nil, apperror.BadInput("Name already taken", "name")
		}
		trimmedName := strings.TrimSpace(*name)
		user.Name = &trimmedName
		columns = append(columns, "name")
	}
	if clearDefaultMachineType != nil && *clearDefaultMachineType && defaultMachineType != nil {
		return nil, apperror.BadInput("Cannot set and clear the default machine at the same time", "defaultMachineType")
	}
	if clearDefaultMachineType != nil && *clearDefaultMachineType {
		user.DefaultMachineType = nil
		columns = append(columns, "defaultMachineType")
	}
	if defaultMachineType != nil {
		user.DefaultMachineType = defaultMachineType
		columns = append(columns, "defaultMachineType")
	}

	if len(columns) > 0 {
		if err := s.store.UpdateUser(ctx, user, columns...); err != nil {
			return nil, fmt.Errorf("can't update user: %w", err)
		}
	}

	return s.store.GetUser(ctx, targetID)
}

func (s *UserService) RequireAdmin(ctx context.Context, userID string) error {
	isAdmin, err := s.store.IsAdmin(ctx, userID)
	if err != nil {
		return fmt.Errorf("can't check admin: %w", err)
	}
	if !isAdmin {
		return apperror.Forbidden("Admin access required")
	}
	return nil
}
