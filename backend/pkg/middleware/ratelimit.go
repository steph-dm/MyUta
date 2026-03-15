package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
	done    chan struct{}
}

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		entries: make(map[string]*rateLimitEntry),
		done:    make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) Close() {
	close(rl.done)
}

func (rl *RateLimiter) Check(key string, maxAttempts int, windowSeconds int) error {
	now := time.Now()
	window := time.Duration(windowSeconds) * time.Second

	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, ok := rl.entries[key]
	if !ok || now.After(entry.resetAt) {
		rl.entries[key] = &rateLimitEntry{count: 1, resetAt: now.Add(window)}
		return nil
	}

	entry.count++

	if entry.count > maxAttempts {
		retryAfter := int(time.Until(entry.resetAt).Seconds()) + 1
		return fmt.Errorf("too many attempts. Please try again in %d seconds", retryAfter)
	}

	return nil
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-rl.done:
			return
		case <-ticker.C:
			now := time.Now()
			rl.mu.Lock()
			for key, entry := range rl.entries {
				if now.After(entry.resetAt) {
					delete(rl.entries, key)
				}
			}
			rl.mu.Unlock()
		}
	}
}

func ClientIP(r *http.Request) string {
	remoteIP := extractHost(r.RemoteAddr)

	// Only trust forwarded headers from local/private IPs.
	if isTrustedProxy(remoteIP) {
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			for i := range forwarded {
				if forwarded[i] == ',' {
					return strings.TrimSpace(forwarded[:i])
				}
			}
			return strings.TrimSpace(forwarded)
		}
		if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
			return strings.TrimSpace(realIP)
		}
	}

	return remoteIP
}

func extractHost(addr string) string {
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}

func isTrustedProxy(ip string) bool {
	return ip == "127.0.0.1" || ip == "::1" || ip == "localhost" ||
		strings.HasPrefix(ip, "10.") ||
		strings.HasPrefix(ip, "192.168.") ||
		isRFC1918_172(ip)
}

func isRFC1918_172(ip string) bool {
	if !strings.HasPrefix(ip, "172.") {
		return false
	}
	parts := strings.SplitN(ip, ".", 3)
	if len(parts) < 2 {
		return false
	}
	octet, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}
	return octet >= 16 && octet <= 31
}

// ClientIPFromContext extracts the client IP from an *http.Request stored in ctx under the given key.
func ClientIPFromContext(ctx context.Context, requestKey any) string {
	if req, ok := ctx.Value(requestKey).(*http.Request); ok && req != nil {
		return ClientIP(req)
	}
	return "unknown"
}

