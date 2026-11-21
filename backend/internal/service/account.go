// Package service implements the use cases. Services validate input, apply
// the rules and call the store; they return *apperror.AppError for anything
// the user should see.
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/google/uuid"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/auth"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/mail"
	"github.com/steph-dm/MyUta/backend/internal/ocr"
	"github.com/steph-dm/MyUta/backend/internal/ratelimit"
	"github.com/steph-dm/MyUta/backend/internal/reqctx"
	"github.com/steph-dm/MyUta/backend/internal/session"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/validator"
	"github.com/steph-dm/MyUta/backend/internal/youtube"
)

// Deps are the collaborators shared by all services.
type Deps struct {
	Store    storage.Store
	Sessions *session.Manager
	Limiter  *ratelimit.Limiter
	Mailer   mail.Sender
	YouTube  youtube.Searcher
	OCR      ocr.Extractor
	Config   *config.Config
	Now      func() time.Time
}

// Services groups every use case.
type Services struct {
	Account *AccountService
	Library *LibraryService
	Reviews *ReviewService
	Data    *DataService
	Media   *MediaService
}

func New(d Deps) *Services {
	if d.Now == nil {
		d.Now = time.Now
	}
	return &Services{
		Account: &AccountService{d},
		Library: &LibraryService{d},
		Reviews: &ReviewService{d},
		Data:    &DataService{d},
		Media:   &MediaService{d},
	}
}

// caller returns the authenticated identity or UNAUTHENTICATED.
func caller(ctx context.Context) (auth.Identity, error) {
	id, ok := auth.FromContext(ctx)
	if !ok {
		return auth.Identity{}, apperror.Unauthenticated()
	}
	return id, nil
}

// notFound maps storage.ErrNotFound to a NOT_FOUND application error.
func notFound(err error, entity string) error {
	if errors.Is(err, storage.ErrNotFound) {
		return apperror.NotFound(entity)
	}
	return err
}

// validID returns NOT_FOUND for ids that are not UUIDs (they cannot exist).
func validID(id, entity string) error {
	if !validator.IsUUID(id) {
		return apperror.NotFound(entity)
	}
	return nil
}

const (
	resetTokenTTL  = time.Hour
	verifyTokenTTL = 48 * time.Hour
)

// AccountService handles registration, sessions and account settings.
type AccountService struct{ d Deps }

// MailEnabled reports whether password reset and verification e-mails can be sent.
func (s *AccountService) MailEnabled() bool { return s.d.Mailer != nil }

type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Language *string
}

func (s *AccountService) Register(ctx context.Context, in RegisterInput) (*storage.User, error) {
	if err := s.d.Limiter.Take(ratelimit.Register, reqctx.ClientIP(ctx)); err != nil {
		return nil, err
	}
	email := validator.NormalizeEmail(in.Email)
	if err := validator.Email(email); err != nil {
		return nil, err
	}
	if err := validator.Password(in.Password, "password"); err != nil {
		return nil, err
	}
	name, err := validator.Name(in.Name)
	if err != nil {
		return nil, err
	}
	if in.Language != nil {
		if err := validator.Language(*in.Language); err != nil {
			return nil, err
		}
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	u := &storage.User{ID: uuid.NewString(), Email: email, Name: name, PasswordHash: hash, Language: in.Language}
	if err := s.d.Store.CreateUser(ctx, u); err != nil {
		if storage.IsConflict(err, storage.ConstraintUserEmail) {
			return nil, apperror.Conflict(apperror.ReasonEmailTaken, "email", "This email address is already registered")
		}
		return nil, err
	}
	if _, err := s.d.Sessions.Start(ctx, reqctx.ResponseWriter(ctx), u.ID, reqctx.UserAgent(ctx)); err != nil {
		return nil, err
	}
	if s.d.Mailer != nil {
		_ = s.sendVerification(ctx, u, u.Email) // best effort: failures are logged; the user can resend
	}
	return u, nil
}

func (s *AccountService) Login(ctx context.Context, email, password string) (*storage.User, error) {
	ip := reqctx.ClientIP(ctx)
	email = validator.NormalizeEmail(email)
	if err := s.d.Limiter.Check(ratelimit.LoginIP, ip); err != nil {
		return nil, err
	}
	if err := s.d.Limiter.Check(ratelimit.LoginAccount, email); err != nil {
		return nil, err
	}
	fail := func() error {
		s.d.Limiter.Fail(ratelimit.LoginIP, ip)
		s.d.Limiter.Fail(ratelimit.LoginAccount, email)
		return apperror.InvalidCredentials()
	}
	u, err := s.d.Store.GetUserByEmail(ctx, email)
	if errors.Is(err, storage.ErrNotFound) {
		auth.DummyCompare(password) // same response time as a wrong password
		return nil, fail()
	}
	if err != nil {
		return nil, err
	}
	if !auth.ComparePassword(password, u.PasswordHash) {
		return nil, fail()
	}
	s.d.Limiter.Reset(ratelimit.LoginAccount, email)
	if _, err := s.d.Sessions.Start(ctx, reqctx.ResponseWriter(ctx), u.ID, reqctx.UserAgent(ctx)); err != nil {
		return nil, err
	}
	return u, nil
}

// Logout ends the current session (also works for anonymous callers: it clears the cookie).
func (s *AccountService) Logout(ctx context.Context) error {
	id, _ := auth.FromContext(ctx)
	return s.d.Sessions.End(ctx, reqctx.ResponseWriter(ctx), id.SessionID)
}

// LogoutEverywhere ends every session of the caller, including this one.
func (s *AccountService) LogoutEverywhere(ctx context.Context) error {
	id, err := caller(ctx)
	if err != nil {
		return err
	}
	if err := s.d.Sessions.EndOthers(ctx, id.UserID, ""); err != nil {
		return err
	}
	return s.d.Sessions.End(ctx, reqctx.ResponseWriter(ctx), id.SessionID)
}

// Me returns the caller, or nil when anonymous or deleted.
func (s *AccountService) Me(ctx context.Context) (*storage.User, error) {
	id, ok := auth.FromContext(ctx)
	if !ok {
		return nil, nil
	}
	u, err := s.d.Store.GetUser(ctx, id.UserID)
	if errors.Is(err, storage.ErrNotFound) {
		return nil, nil
	}
	return u, err
}

// ProfileInput: nil fields are unchanged. DefaultMachineSet with a nil
// DefaultMachine clears the default machine.
type ProfileInput struct {
	Name              *string
	DefaultMachineSet bool
	DefaultMachine    *domain.MachineType
	Language          *string
}

func (s *AccountService) UpdateProfile(ctx context.Context, in ProfileInput) (*storage.User, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	upd := storage.ProfileUpdate{}
	if in.Name != nil {
		name, err := validator.Name(*in.Name)
		if err != nil {
			return nil, err
		}
		upd.Name = &name
	}
	if in.DefaultMachineSet {
		if in.DefaultMachine == nil {
			upd.ClearDefaultMachine = true
		} else {
			if err := validator.MachineType(*in.DefaultMachine, "defaultMachineType"); err != nil {
				return nil, err
			}
			upd.DefaultMachineType = in.DefaultMachine
		}
	}
	if in.Language != nil {
		if err := validator.Language(*in.Language); err != nil {
			return nil, err
		}
		upd.Language = in.Language
	}
	if err := s.d.Store.UpdateProfile(ctx, id.UserID, upd); err != nil {
		return nil, notFound(err, "User")
	}
	return s.d.Store.GetUser(ctx, id.UserID)
}

// checkPassword verifies the caller's password, counting failures for rule.
func (s *AccountService) checkPassword(ctx context.Context, rule ratelimit.Rule, field, password string) (*storage.User, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := s.d.Limiter.Check(rule, id.UserID); err != nil {
		return nil, err
	}
	u, err := s.d.Store.GetUser(ctx, id.UserID)
	if err != nil {
		return nil, notFound(err, "User")
	}
	if !auth.ComparePassword(password, u.PasswordHash) {
		s.d.Limiter.Fail(rule, id.UserID)
		return nil, apperror.WrongPassword(field)
	}
	return u, nil
}

// ChangePassword sets a new password, ends every other session and rotates
// the current one (a new cookie is issued, so the user stays signed in).
func (s *AccountService) ChangePassword(ctx context.Context, current, next string) error {
	u, err := s.checkPassword(ctx, ratelimit.ChangePassword, "currentPassword", current)
	if err != nil {
		return err
	}
	if err := validator.Password(next, "newPassword"); err != nil {
		return err
	}
	hash, err := auth.HashPassword(next)
	if err != nil {
		return err
	}
	if err := s.d.Store.SetPasswordHash(ctx, u.ID, hash); err != nil {
		return err
	}
	_ = s.d.Store.DeleteAuthTokens(ctx, u.ID, storage.TokenPasswordReset)
	if err := s.d.Sessions.EndOthers(ctx, u.ID, ""); err != nil {
		return err
	}
	_, err = s.d.Sessions.Start(ctx, reqctx.ResponseWriter(ctx), u.ID, reqctx.UserAgent(ctx))
	return err
}

// ChangeEmailResult tells the client whether a confirmation e-mail was sent
// (the address changes after the link is opened) or the change is immediate.
type ChangeEmailResult struct {
	User             *storage.User
	VerificationSent bool
}

func (s *AccountService) ChangeEmail(ctx context.Context, newEmail, password string) (*ChangeEmailResult, error) {
	u, err := s.checkPassword(ctx, ratelimit.ChangeEmail, "password", password)
	if err != nil {
		return nil, err
	}
	email := validator.NormalizeEmail(newEmail)
	if err := validator.Email(email); err != nil {
		return nil, err
	}
	if email == u.Email {
		return &ChangeEmailResult{User: u}, nil
	}
	if _, err := s.d.Store.GetUserByEmail(ctx, email); err == nil {
		return nil, apperror.Conflict(apperror.ReasonEmailTaken, "email", "This email address is already registered")
	} else if !errors.Is(err, storage.ErrNotFound) {
		return nil, err
	}
	if s.d.Mailer != nil {
		// The address only changes once the link sent to it has been opened.
		if err := s.sendVerification(ctx, u, email); err != nil {
			return nil, apperror.Upstream(apperror.ReasonUpstreamFailed, "The confirmation e-mail could not be sent")
		}
		return &ChangeEmailResult{User: u, VerificationSent: true}, nil
	}
	if err := s.d.Store.SetEmail(ctx, u.ID, email, false); err != nil {
		if storage.IsConflict(err, storage.ConstraintUserEmail) {
			return nil, apperror.Conflict(apperror.ReasonEmailTaken, "email", "This email address is already registered")
		}
		return nil, err
	}
	u, err = s.d.Store.GetUser(ctx, u.ID)
	return &ChangeEmailResult{User: u}, err
}

func (s *AccountService) DeleteAccount(ctx context.Context, password string) error {
	u, err := s.checkPassword(ctx, ratelimit.DeleteAccount, "password", password)
	if err != nil {
		return err
	}
	if err := s.d.Store.DeleteUser(ctx, u.ID); err != nil { // sessions, tokens and data cascade
		return err
	}
	s.d.Sessions.Clear(reqctx.ResponseWriter(ctx))
	return nil
}

// RequestPasswordReset always answers true so that it cannot be used to find
// registered addresses.
func (s *AccountService) RequestPasswordReset(ctx context.Context, email string) error {
	if s.d.Mailer == nil {
		return apperror.FeatureDisabled("passwordReset")
	}
	if err := s.d.Limiter.Take(ratelimit.PasswordResetIP, reqctx.ClientIP(ctx)); err != nil {
		return err
	}
	email = validator.NormalizeEmail(email)
	if s.d.Limiter.Take(ratelimit.PasswordResetEmail, email) != nil {
		return nil //nolint:nilerr // silently ignore floods for one address (no enumeration)
	}
	u, err := s.d.Store.GetUserByEmail(ctx, email)
	if errors.Is(err, storage.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	token, hash := newToken()
	if err := s.d.Store.CreateAuthToken(ctx, &storage.AuthToken{
		ID: uuid.NewString(), UserID: u.ID, Purpose: storage.TokenPasswordReset,
		TokenHash: hash, ExpiresAt: s.d.Now().Add(resetTokenTTL),
	}); err != nil {
		return err
	}
	link := s.d.Config.FrontendURL + "/reset-password?token=" + url.QueryEscape(token)
	if err := s.d.Mailer.Send(ctx, resetMail(u, link)); err != nil {
		slog.ErrorContext(ctx, "password reset e-mail failed", "error", err, "user_id", u.ID)
	}
	return nil
}

func (s *AccountService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if err := s.d.Limiter.Take(ratelimit.TokenRedeem, reqctx.ClientIP(ctx)); err != nil {
		return err
	}
	if err := validator.Password(newPassword, "newPassword"); err != nil {
		return err
	}
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.d.Store.InTx(ctx, func(tx storage.Store) error {
		t, err := tx.ConsumeAuthToken(ctx, storage.TokenPasswordReset, hashToken(token))
		if errors.Is(err, storage.ErrNotFound) {
			return apperror.BadInput(apperror.ReasonInvalidToken, "token", "This link is invalid or has expired")
		}
		if err != nil {
			return err
		}
		if err := tx.SetPasswordHash(ctx, t.UserID, hash); err != nil {
			return err
		}
		u, err := tx.GetUser(ctx, t.UserID)
		if err != nil {
			return err
		}
		if u.EmailVerifiedAt == nil { // opening the link proves the mailbox
			_ = tx.MarkEmailVerified(ctx, u.ID, u.Email)
		}
		return s.d.Sessions.EndOthers(ctx, t.UserID, "")
	})
}

func (s *AccountService) VerifyEmail(ctx context.Context, token string) error {
	if err := s.d.Limiter.Take(ratelimit.TokenRedeem, reqctx.ClientIP(ctx)); err != nil {
		return err
	}
	return s.d.Store.InTx(ctx, func(tx storage.Store) error {
		t, err := tx.ConsumeAuthToken(ctx, storage.TokenEmailVerify, hashToken(token))
		if errors.Is(err, storage.ErrNotFound) {
			return apperror.BadInput(apperror.ReasonInvalidToken, "token", "This link is invalid or has expired")
		}
		if err != nil {
			return err
		}
		u, err := tx.GetUser(ctx, t.UserID)
		if err != nil {
			return err
		}
		if t.NewEmail == nil || *t.NewEmail == u.Email {
			return tx.MarkEmailVerified(ctx, u.ID, u.Email)
		}
		if err := tx.SetEmail(ctx, u.ID, *t.NewEmail, true); err != nil {
			if storage.IsConflict(err, storage.ConstraintUserEmail) {
				return apperror.Conflict(apperror.ReasonEmailTaken, "email", "This email address is already registered")
			}
			return err
		}
		return nil
	})
}

func (s *AccountService) ResendVerification(ctx context.Context) error {
	if s.d.Mailer == nil {
		return apperror.FeatureDisabled("emailVerification")
	}
	id, err := caller(ctx)
	if err != nil {
		return err
	}
	if err := s.d.Limiter.Take(ratelimit.VerificationMail, id.UserID); err != nil {
		return err
	}
	u, err := s.d.Store.GetUser(ctx, id.UserID)
	if err != nil {
		return notFound(err, "User")
	}
	if u.EmailVerifiedAt != nil {
		return nil
	}
	if err := s.sendVerification(ctx, u, u.Email); err != nil {
		return apperror.Upstream(apperror.ReasonUpstreamFailed, "The confirmation e-mail could not be sent")
	}
	return nil
}

func (s *AccountService) sendVerification(ctx context.Context, u *storage.User, address string) error {
	_ = s.d.Store.DeleteAuthTokens(ctx, u.ID, storage.TokenEmailVerify)
	token, hash := newToken()
	addr := address
	if err := s.d.Store.CreateAuthToken(ctx, &storage.AuthToken{
		ID: uuid.NewString(), UserID: u.ID, Purpose: storage.TokenEmailVerify,
		TokenHash: hash, NewEmail: &addr, ExpiresAt: s.d.Now().Add(verifyTokenTTL),
	}); err != nil {
		slog.ErrorContext(ctx, "verification token failed", "error", err)
		return err
	}
	link := s.d.Config.FrontendURL + "/verify-email?token=" + url.QueryEscape(token)
	if err := s.d.Mailer.Send(ctx, verifyMail(u, address, link)); err != nil {
		slog.ErrorContext(ctx, "verification e-mail failed", "error", err, "user_id", u.ID)
		return err
	}
	return nil
}

// newToken returns a random URL-safe token and the hash that is stored.
// Only the hash is kept, so a database leak does not expose usable links.
func newToken() (string, []byte) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Sprintf("crypto/rand: %v", err))
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	return token, hashToken(token)
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

func resetMail(u *storage.User, link string) mail.Message {
	if u.Language != nil && *u.Language == "ja" {
		return mail.Message{To: u.Email, Subject: "マイウタ: パスワードの再設定",
			Text: u.Name + " さん\n\nパスワードを再設定するには、1時間以内に次のリンクを開いてください:\n\n" + link +
				"\n\nこのメールに心当たりがない場合は無視してください。パスワードは変更されません。\n"}
	}
	return mail.Message{To: u.Email, Subject: "MyUta: reset your password",
		Text: "Hi " + u.Name + ",\n\nOpen this link within one hour to choose a new password:\n\n" + link +
			"\n\nIf you did not ask for this, ignore this e-mail; your password stays the same.\n"}
}

func verifyMail(u *storage.User, address, link string) mail.Message {
	if u.Language != nil && *u.Language == "ja" {
		return mail.Message{To: address, Subject: "マイウタ: メールアドレスの確認",
			Text: u.Name + " さん\n\nこのメールアドレスを確認するには、48時間以内に次のリンクを開いてください:\n\n" + link + "\n"}
	}
	return mail.Message{To: address, Subject: "MyUta: confirm your e-mail address",
		Text: "Hi " + u.Name + ",\n\nOpen this link within 48 hours to confirm this e-mail address:\n\n" + link + "\n"}
}
