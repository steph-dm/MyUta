// Package session manages login sessions: a row in the sessions table plus a
// signed HttpOnly cookie that names it. Sessions slide: an active session is
// extended when less than half of its lifetime remains.
package session

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hashicorp/golang-lru/v2/expirable"

	"github.com/steph-dm/MyUta/backend/internal/auth"
	"github.com/steph-dm/MyUta/backend/internal/storage"
)

// CookieName is the session cookie.
const CookieName = "myuta_session"

// cacheTTL bounds how long a revoked session can still be accepted by
// another backend instance. Revocations on the same instance apply at once.
const cacheTTL = 10 * time.Second

type cached struct {
	userID    string
	expiresAt time.Time
}

type Manager struct {
	store  storage.Store
	secret string
	ttl    time.Duration
	secure bool
	cache  *expirable.LRU[string, cached]
	now    func() time.Time
}

func NewManager(store storage.Store, secret string, ttl time.Duration, secureCookies bool) *Manager {
	return &Manager{
		store:  store,
		secret: secret,
		ttl:    ttl,
		secure: secureCookies,
		cache:  expirable.NewLRU[string, cached](10_000, nil, cacheTTL),
		now:    time.Now,
	}
}

// Start creates a session for the user and sets the cookie.
func (m *Manager) Start(ctx context.Context, w http.ResponseWriter, userID, userAgent string) (string, error) {
	ua := truncateUA(userAgent)
	s := &storage.Session{ID: uuid.NewString(), UserID: userID, ExpiresAt: m.now().Add(m.ttl), UserAgent: ua}
	if err := m.store.CreateSession(ctx, s); err != nil {
		return "", err
	}
	if err := m.setCookie(w, userID, s.ID, s.ExpiresAt); err != nil {
		return "", err
	}
	return s.ID, nil
}

// Authenticate reads the cookie and returns the caller. A missing or invalid
// cookie is not an error (anonymous request). An error means the session
// could not be checked (database unavailable) and must not be treated as
// "logged out".
func (m *Manager) Authenticate(ctx context.Context, w http.ResponseWriter, r *http.Request) (auth.Identity, bool, error) {
	c, err := r.Cookie(CookieName)
	if err != nil || c.Value == "" {
		return auth.Identity{}, false, nil //nolint:nilerr // no cookie means "anonymous"
	}
	userID, sessionID, err := auth.ParseSession(c.Value, m.secret)
	if err != nil {
		m.Clear(w)
		return auth.Identity{}, false, nil //nolint:nilerr // an invalid cookie means "anonymous", not a failure
	}

	entry, ok := m.cache.Get(sessionID)
	if !ok {
		s, err := m.lookup(ctx, sessionID)
		switch {
		case errors.Is(err, storage.ErrNotFound):
			m.Clear(w)                         // revoked or expired
			return auth.Identity{}, false, nil //nolint:nilerr // a revoked session means "anonymous"
		case err != nil:
			return auth.Identity{}, false, err
		}
		entry = cached{userID: s.UserID, expiresAt: s.ExpiresAt}
		m.cache.Add(sessionID, entry)
	}
	if entry.userID != userID || !m.now().Before(entry.expiresAt) {
		m.Clear(w)
		return auth.Identity{}, false, nil
	}

	// Sliding expiry: extend active sessions in the second half of their life.
	if entry.expiresAt.Sub(m.now()) < m.ttl/2 {
		newExp := m.now().Add(m.ttl)
		if err := m.store.ExtendSession(ctx, sessionID, newExp); err == nil {
			m.cache.Add(sessionID, cached{userID: userID, expiresAt: newExp})
			_ = m.setCookie(w, userID, sessionID, newExp)
		}
	}
	return auth.Identity{UserID: userID, SessionID: sessionID}, true, nil
}

// lookup retries once on connection errors (e.g. a pooled connection killed
// by a database restart) before reporting the database as unavailable.
func (m *Manager) lookup(ctx context.Context, sessionID string) (*storage.Session, error) {
	s, err := m.store.GetSession(ctx, sessionID)
	if errors.Is(err, storage.ErrUnavailable) {
		select {
		case <-ctx.Done():
			return nil, err
		case <-time.After(100 * time.Millisecond):
		}
		s, err = m.store.GetSession(ctx, sessionID)
	}
	return s, err
}

// End deletes the current session and clears the cookie.
func (m *Manager) End(ctx context.Context, w http.ResponseWriter, sessionID string) error {
	m.cache.Remove(sessionID)
	m.Clear(w)
	if sessionID == "" {
		return nil
	}
	return m.store.DeleteSession(ctx, sessionID)
}

// EndOthers deletes every session of the user except keepID ("" deletes all).
func (m *Manager) EndOthers(ctx context.Context, userID, keepID string) error {
	for _, k := range m.cache.Keys() {
		if v, ok := m.cache.Peek(k); ok && v.userID == userID && k != keepID {
			m.cache.Remove(k)
		}
	}
	return m.store.DeleteUserSessions(ctx, userID, keepID)
}

// Clear removes the cookie from the browser.
func (m *Manager) Clear(w http.ResponseWriter) {
	if w == nil {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name: CookieName, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: m.secure, SameSite: http.SameSiteLaxMode,
	})
}

func (m *Manager) setCookie(w http.ResponseWriter, userID, sessionID string, expires time.Time) error {
	if w == nil {
		return nil
	}
	token, err := auth.SignSession(m.secret, userID, sessionID, m.now(), expires)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: CookieName, Value: token, Path: "/", Expires: expires,
		MaxAge:   int(time.Until(expires).Seconds()),
		HttpOnly: true, Secure: m.secure, SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func truncateUA(ua string) *string {
	ua = strings.TrimSpace(ua)
	if ua == "" {
		return nil
	}
	if r := []rune(ua); len(r) > 300 {
		ua = string(r[:300])
	}
	return &ua
}
