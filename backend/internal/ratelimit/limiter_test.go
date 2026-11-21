package ratelimit

import (
	"errors"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
)

func TestTakeAndFailures(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l := &Limiter{entries: map[string]*entry{}, now: func() time.Time { return now }, done: make(chan struct{})}
	r := Rule{"t", 2, time.Minute}
	for range 2 {
		if l.Take(r, "a") != nil {
			t.Fatal("first two calls limited")
		}
	}
	err := l.Take(r, "a")
	var ae *apperror.AppError
	if !errors.As(err, &ae) || ae.Code != apperror.CodeRateLimited || ae.Extensions()["retryAfterSeconds"] != 60 {
		t.Fatalf("third call: %v", err)
	}
	if l.Take(r, "b") != nil {
		t.Fatal("keys are not independent")
	}
	now = now.Add(time.Minute)
	if l.Take(r, "a") != nil {
		t.Fatal("window did not reset")
	}

	// failure-only counting: successful checks do not use up the budget
	f := Rule{"f", 1, time.Minute}
	for range 5 {
		if l.Check(f, "u") != nil {
			t.Fatal("checks without failures were limited")
		}
	}
	l.Fail(f, "u")
	if l.Check(f, "u") == nil {
		t.Fatal("limit not reached after a failure")
	}
	l.Reset(f, "u")
	if l.Check(f, "u") != nil {
		t.Fatal("reset did not clear")
	}
}
