package middleware_test

import (
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/pkg/middleware"
)

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	rl := middleware.NewRateLimiter()
	defer rl.Close()

	for i := 0; i < 5; i++ {
		if err := rl.Check("test-key", 5, 60); err != nil {
			t.Errorf("attempt %d should be allowed, got error: %v", i+1, err)
		}
	}
}

func TestRateLimiter_BlocksOverLimit(t *testing.T) {
	rl := middleware.NewRateLimiter()
	defer rl.Close()

	// Use up all attempts.
	for i := 0; i < 3; i++ {
		rl.Check("block-key", 3, 60)
	}

	// Next attempt should be blocked.
	if err := rl.Check("block-key", 3, 60); err == nil {
		t.Error("should be rate-limited after exceeding max attempts")
	}
}

func TestRateLimiter_ResetsAfterWindow(t *testing.T) {
	rl := middleware.NewRateLimiter()
	defer rl.Close()

	// Use up all attempts with a 1-second window.
	for i := 0; i < 3; i++ {
		rl.Check("reset-key", 3, 1)
	}

	// Should be blocked.
	if err := rl.Check("reset-key", 3, 1); err == nil {
		t.Error("should be rate-limited")
	}

	// Wait for window to expire.
	time.Sleep(1100 * time.Millisecond)

	// Should be allowed again.
	if err := rl.Check("reset-key", 3, 1); err != nil {
		t.Errorf("should be allowed after window reset, got: %v", err)
	}
}

func TestRateLimiter_IndependentKeys(t *testing.T) {
	rl := middleware.NewRateLimiter()
	defer rl.Close()

	// Max out key A.
	for i := 0; i < 2; i++ {
		rl.Check("key-a", 2, 60)
	}
	if err := rl.Check("key-a", 2, 60); err == nil {
		t.Error("key-a should be rate-limited")
	}

	// Key B should still work.
	if err := rl.Check("key-b", 2, 60); err != nil {
		t.Errorf("key-b should not be rate-limited, got: %v", err)
	}
}
