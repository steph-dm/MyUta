// Package ratelimit implements in-process fixed-window rate limits.
//
// The limits are per process. With several backend instances each instance
// counts separately; move the counters to the database or Redis if that matters.
package ratelimit

import (
	"sync"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
)

// Rule is one named limit.
type Rule struct {
	Name   string
	Limit  int
	Window time.Duration
}

// All rules live here so the numbers can be reviewed in one place.
var (
	LoginIP            = Rule{"login-ip", 10, 15 * time.Minute}     // failed logins per client address
	LoginAccount       = Rule{"login-account", 20, time.Hour}       // failed logins per e-mail address
	Register           = Rule{"register-ip", 5, time.Hour}          // attempts per client address
	PasswordResetIP    = Rule{"pwreset-ip", 5, time.Hour}           // requests per client address
	PasswordResetEmail = Rule{"pwreset-email", 3, time.Hour}        // requests per e-mail address
	VerificationMail   = Rule{"verify-mail", 3, time.Hour}          // resend requests per user
	ChangePassword     = Rule{"change-password", 5, time.Hour}      // wrong current password per user
	ChangeEmail        = Rule{"change-email", 5, time.Hour}         // wrong password per user
	DeleteAccount      = Rule{"delete-account", 5, time.Hour}       // wrong password per user
	OCR                = Rule{"ocr", 20, time.Hour}                 // screenshot reads per user
	YouTubeSearch      = Rule{"youtube", 30, time.Hour}             // searches per user
	Import             = Rule{"import", 10, time.Hour}              // imports per user
	TokenRedeem        = Rule{"token-redeem", 20, 15 * time.Minute} // reset/verify token attempts per address
)

type entry struct {
	count   int
	resetAt time.Time
}

type Limiter struct {
	mu      sync.Mutex
	entries map[string]*entry
	now     func() time.Time
	done    chan struct{}
}

func New() *Limiter {
	l := &Limiter{entries: map[string]*entry{}, now: time.Now, done: make(chan struct{})}
	go l.cleanup(5 * time.Minute)
	return l
}

func (l *Limiter) Close() { close(l.done) }

func key(r Rule, k string) string { return r.Name + ":" + k }

// Check fails if the limit is already reached, without counting this call.
// Use it with Fail for limits that only count failures.
func (l *Limiter) Check(r Rule, k string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	e := l.entries[key(r, k)]
	now := l.now()
	if e != nil && now.Before(e.resetAt) && e.count >= r.Limit {
		return apperror.RateLimited(e.resetAt.Sub(now))
	}
	return nil
}

// Fail records one failure.
func (l *Limiter) Fail(r Rule, k string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.hitLocked(r, k)
}

// Take counts this call and fails when the limit is exceeded. Use it for
// actions that cost something whether they succeed or not.
func (l *Limiter) Take(r Rule, k string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	e := l.hitLocked(r, k)
	if e.count > r.Limit {
		return apperror.RateLimited(e.resetAt.Sub(l.now()))
	}
	return nil
}

// Reset clears a key, e.g. after a successful login.
func (l *Limiter) Reset(r Rule, k string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key(r, k))
}

func (l *Limiter) hitLocked(r Rule, k string) *entry {
	now := l.now()
	e := l.entries[key(r, k)]
	if e == nil || !now.Before(e.resetAt) {
		e = &entry{resetAt: now.Add(r.Window)}
		l.entries[key(r, k)] = e
	}
	e.count++
	return e
}

func (l *Limiter) cleanup(every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-l.done:
			return
		case <-t.C:
			now := l.now()
			l.mu.Lock()
			for k, e := range l.entries {
				if !now.Before(e.resetAt) {
					delete(l.entries, k)
				}
			}
			l.mu.Unlock()
		}
	}
}
