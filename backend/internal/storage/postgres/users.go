package postgres

import (
	"context"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

// --- users ------------------------------------------------------------------------------------

func (s *Store) CreateUser(ctx context.Context, u *storage.User) error {
	_, err := s.db.NewInsert().Model(u).Returning("*").Exec(ctx)
	return classify(err)
}

func (s *Store) GetUser(ctx context.Context, id string) (*storage.User, error) {
	u := new(storage.User)
	err := s.db.NewSelect().Model(u).Where("id = ?", id).Scan(ctx)
	return u, classify(err)
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*storage.User, error) {
	u := new(storage.User)
	err := s.db.NewSelect().Model(u).Where("email = ?", email).Scan(ctx)
	return u, classify(err)
}

func (s *Store) UpdateProfile(ctx context.Context, id string, upd storage.ProfileUpdate) error {
	q := s.db.NewUpdate().Model((*storage.User)(nil)).Where("id = ?", id)
	changed := false
	if upd.Name != nil {
		q = q.Set("name = ?", *upd.Name)
		changed = true
	}
	if upd.ClearDefaultMachine {
		q = q.Set("default_machine_type = NULL")
		changed = true
	} else if upd.DefaultMachineType != nil {
		q = q.Set("default_machine_type = ?", *upd.DefaultMachineType)
		changed = true
	}
	if upd.Language != nil {
		q = q.Set("language = ?", *upd.Language)
		changed = true
	}
	if !changed {
		return nil
	}
	return mustAffect(q.Exec(ctx))
}

func (s *Store) SetEmail(ctx context.Context, id, email string, verified bool) error {
	q := s.db.NewUpdate().Model((*storage.User)(nil)).Set("email = ?", email).Where("id = ?", id)
	if verified {
		q = q.Set("email_verified_at = now()")
	} else {
		q = q.Set("email_verified_at = NULL")
	}
	return mustAffect(q.Exec(ctx))
}

// MarkEmailVerified verifies the address only if it is still the user's address.
func (s *Store) MarkEmailVerified(ctx context.Context, id, email string) error {
	return mustAffect(s.db.NewUpdate().Model((*storage.User)(nil)).
		Set("email_verified_at = now()").
		Where("id = ? AND email = ?", id, email).Exec(ctx))
}

func (s *Store) SetPasswordHash(ctx context.Context, id, hash string) error {
	return mustAffect(s.db.NewUpdate().Model((*storage.User)(nil)).
		Set("password_hash = ?", hash).Where("id = ?", id).Exec(ctx))
}

func (s *Store) DeleteUser(ctx context.Context, id string) error {
	return mustAffect(s.db.NewDelete().Model((*storage.User)(nil)).Where("id = ?", id).Exec(ctx))
}

// --- sessions ---------------------------------------------------------------------------------

func (s *Store) CreateSession(ctx context.Context, se *storage.Session) error {
	_, err := s.db.NewInsert().Model(se).Returning("*").Exec(ctx)
	return classify(err)
}

func (s *Store) GetSession(ctx context.Context, id string) (*storage.Session, error) {
	se := new(storage.Session)
	err := s.db.NewSelect().Model(se).Where("id = ? AND expires_at > now()", id).Scan(ctx)
	return se, classify(err)
}

func (s *Store) ExtendSession(ctx context.Context, id string, expiresAt time.Time) error {
	return mustAffect(s.db.NewUpdate().Model((*storage.Session)(nil)).
		Set("expires_at = ?", expiresAt).Set("last_seen_at = now()").
		Where("id = ?", id).Exec(ctx))
}

func (s *Store) DeleteSession(ctx context.Context, id string) error {
	_, err := s.db.NewDelete().Model((*storage.Session)(nil)).Where("id = ?", id).Exec(ctx)
	return classify(err)
}

func (s *Store) DeleteUserSessions(ctx context.Context, userID, exceptID string) error {
	q := s.db.NewDelete().Model((*storage.Session)(nil)).Where("user_id = ?", userID)
	if exceptID != "" {
		q = q.Where("id <> ?", exceptID)
	}
	_, err := q.Exec(ctx)
	return classify(err)
}

func (s *Store) DeleteExpiredSessions(ctx context.Context) (int, error) {
	res, err := s.db.NewDelete().Model((*storage.Session)(nil)).Where("expires_at <= now()").Exec(ctx)
	if err != nil {
		return 0, classify(err)
	}
	n, _ := res.RowsAffected()
	_, err = s.db.NewDelete().Model((*storage.AuthToken)(nil)).
		Where("expires_at <= now() - interval '7 days'").Exec(ctx)
	return int(n), classify(err)
}

// --- one-time tokens ----------------------------------------------------------------------------

func (s *Store) CreateAuthToken(ctx context.Context, t *storage.AuthToken) error {
	_, err := s.db.NewInsert().Model(t).Returning("*").Exec(ctx)
	return classify(err)
}

// ConsumeAuthToken marks a valid, unused token as used and returns it.
func (s *Store) ConsumeAuthToken(ctx context.Context, purpose string, hash []byte) (*storage.AuthToken, error) {
	t := new(storage.AuthToken)
	err := s.db.NewUpdate().Model(t).
		Set("used_at = now()").
		Where("token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > now()", hash, purpose).
		Returning("*").Scan(ctx)
	return t, classify(err)
}

func (s *Store) DeleteAuthTokens(ctx context.Context, userID, purpose string) error {
	_, err := s.db.NewDelete().Model((*storage.AuthToken)(nil)).
		Where("user_id = ? AND purpose = ?", userID, purpose).Exec(ctx)
	return classify(err)
}

// mustAffect turns "no row matched" into ErrNotFound.
func mustAffect(res interface{ RowsAffected() (int64, error) }, err error) error {
	if err != nil {
		return classify(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return storage.ErrNotFound
	}
	return nil
}
