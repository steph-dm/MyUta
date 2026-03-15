package postgres

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/pkg/scalar"
)

func (s *Store) GetUser(ctx context.Context, id string) (*storage.User, error) {
	user := new(storage.User)
	err := s.DB.NewSelect().Model(user).
		Where("id = ?", id).
		Where(`"deletedAt" IS NULL`).
		Scan(ctx)
	if err != nil {
		return nil, storage.WrapNotFound(err, "user")
	}
	return user, nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*storage.User, error) {
	user := new(storage.User)
	err := s.DB.NewSelect().Model(user).Where("email = ?", email).Scan(ctx)
	if err != nil {
		return nil, storage.WrapNotFound(err, "user")
	}
	return user, nil
}

func (s *Store) EmailExists(ctx context.Context, email string, excludeID ...string) (bool, error) {
	q := s.DB.NewSelect().Model((*storage.User)(nil)).Where("email = ?", email)
	if len(excludeID) > 0 {
		q = q.Where("id != ?", excludeID[0])
	}
	ok, err := q.Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("can't check email exists: %w", err)
	}
	return ok, nil
}

func (s *Store) NameExists(ctx context.Context, name string, excludeID ...string) (bool, error) {
	q := s.DB.NewSelect().Model((*storage.User)(nil)).Where("name = ?", name)
	if len(excludeID) > 0 {
		q = q.Where("id != ?", excludeID[0])
	}
	ok, err := q.Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("can't check name exists: %w", err)
	}
	return ok, nil
}

func (s *Store) CreateUser(ctx context.Context, user *storage.User) error {
	if _, err := s.DB.NewInsert().Model(user).Exec(ctx); err != nil {
		return fmt.Errorf("can't create user: %w", err)
	}
	return nil
}

func (s *Store) UpdateUser(ctx context.Context, user *storage.User, columns ...string) error {
	user.UpdatedAt = scalar.Now()
	cols := slices.Concat(columns, []string{"updatedAt"})
	if _, err := s.DB.NewUpdate().Model(user).
		Column(cols...).
		Where("id = ?", user.ID).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update user: %w", err)
	}
	return nil
}

func (s *Store) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	if _, err := s.DB.NewUpdate().Model((*storage.User)(nil)).
		Set("password = ?", hashedPassword).
		Set(`"passwordChangedAt" = NOW()`).
		Set(`"updatedAt" = NOW()`).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't update password: %w", err)
	}
	return nil
}

func (s *Store) GetPassword(ctx context.Context, id string) (string, error) {
	var password string
	err := s.DB.NewSelect().Model((*storage.User)(nil)).
		Column("password").
		Where("id = ?", id).
		Scan(ctx, &password)
	if err != nil {
		return "", fmt.Errorf("can't get password: %w", err)
	}
	return password, nil
}

func (s *Store) SoftDeleteUser(ctx context.Context, id string) error {
	if _, err := s.DB.NewUpdate().Model((*storage.User)(nil)).
		Set(`"deletedAt" = NOW()`).
		Set(`"updatedAt" = NOW()`).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return fmt.Errorf("can't delete user: %w", err)
	}
	return nil
}

func (s *Store) IsAdmin(ctx context.Context, id string) (bool, error) {
	var isAdmin bool
	err := s.DB.NewSelect().Model((*storage.User)(nil)).
		ColumnExpr(`"isAdmin"`).
		Where("id = ?", id).
		Scan(ctx, &isAdmin)
	if err != nil {
		return false, fmt.Errorf("can't check admin status: %w", err)
	}
	return isAdmin, nil
}

func (s *Store) ListActiveUsers(ctx context.Context) ([]*storage.User, error) {
	var users []*storage.User
	err := s.DB.NewSelect().Model(&users).
		Where(`"deletedAt" IS NULL`).
		OrderExpr(`"createdAt" DESC`).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("can't list users: %w", err)
	}
	return users, nil
}

func (s *Store) IsActiveUser(ctx context.Context, id string, tokenIssuedAt time.Time) (bool, error) {
	var user storage.User
	err := s.DB.NewSelect().Model(&user).
		ColumnExpr(`"passwordChangedAt"`).
		Where("id = ?", id).
		Where(`"deletedAt" IS NULL`).
		Scan(ctx)
	if err != nil {
		return false, fmt.Errorf("can't check active user: %w", err)
	}
	if user.PasswordChangedAt != nil && !tokenIssuedAt.IsZero() {
		if tokenIssuedAt.Before(user.PasswordChangedAt.Time) {
			return false, nil
		}
	}
	return true, nil
}
