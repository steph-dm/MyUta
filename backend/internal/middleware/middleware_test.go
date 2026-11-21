package middleware

import (
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
)

func TestResolveClientIP(t *testing.T) {
	trusted := []netip.Prefix{netip.MustParsePrefix("172.16.0.0/12"), netip.MustParsePrefix("fd00::/8")}
	cases := []struct{ name, remote, xff, realIP, want string }{
		{"direct client ignores forged headers", "203.0.113.9:5555", "6.6.6.6", "6.6.6.6", "203.0.113.9"},
		{"nginx: X-Real-IP wins over forged XFF", "172.18.0.4:5555", "6.6.6.6, 203.0.113.9", "203.0.113.9", "203.0.113.9"},
		{"nginx without X-Real-IP: right-most untrusted XFF", "172.18.0.4:5555", "6.6.6.6, 203.0.113.9", "", "203.0.113.9"},
		{"IPv6 loopback proxy", "[::1]:5555", "203.0.113.9", "", "203.0.113.9"},
		{"IPv6 private proxy", "[fd12:3456::5]:5555", "6.6.6.6, 2001:db8::7", "", "2001:db8::7"},
		{"LAN client that is not a configured proxy", "192.168.1.50:5555", "6.6.6.6", "6.6.6.6", "192.168.1.50"},
		{"IPv4-mapped IPv6 peer", "[::ffff:203.0.113.9]:5555", "", "", "203.0.113.9"},
		{"garbage headers fall back to the peer", "172.18.0.4:5555", "not-an-ip", "nope", "172.18.0.4"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/graphql", nil)
			r.RemoteAddr = c.remote
			if c.xff != "" {
				r.Header.Set("X-Forwarded-For", c.xff)
			}
			if c.realIP != "" {
				r.Header.Set("X-Real-IP", c.realIP)
			}
			if got := ResolveClientIP(r, trusted); got != c.want {
				t.Errorf("got %s, want %s", got, c.want)
			}
		})
	}
}

func TestRequireClientHeader(t *testing.T) {
	h := RequireClientHeader(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	r := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), "CSRF_HEADER_MISSING") {
		t.Fatalf("request without header: %d %s", rec.Code, rec.Body)
	}
	r.Header.Set(ClientHeader, "web")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	if rec.Code != 204 {
		t.Fatalf("request with header: %d", rec.Code)
	}
}

func TestBodyLimit(t *testing.T) {
	h := BodyLimit(10, 100)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	big := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(strings.Repeat("x", 11)))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, big)
	if rec.Code != http.StatusRequestEntityTooLarge || !strings.Contains(rec.Body.String(), "PAYLOAD_TOO_LARGE") {
		t.Fatalf("oversized JSON: %d %s", rec.Code, rec.Body)
	}
	up := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader(strings.Repeat("x", 50)))
	up.Header.Set("Content-Type", "multipart/form-data; boundary=x")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, up)
	if rec.Code != 204 {
		t.Fatalf("upload within the upload limit: %d", rec.Code)
	}
}

func TestCORS(t *testing.T) {
	h := CORS([]string{"https://a.example", "https://b.example"})(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	for origin, allowed := range map[string]bool{"https://b.example": true, "https://evil.example": false} {
		r := httptest.NewRequest(http.MethodOptions, "/graphql", nil)
		r.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		if got := rec.Header().Get("Access-Control-Allow-Origin") == origin; got != allowed {
			t.Errorf("origin %s allowed=%v", origin, got)
		}
		if allowed && !strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), ClientHeader) {
			t.Error("client header not allowed by CORS")
		}
	}
}

func TestStatusWriterUnwrap(t *testing.T) {
	rec := httptest.NewRecorder()
	sw := &statusWriter{ResponseWriter: rec}
	if http.NewResponseController(sw).Flush() != nil {
		t.Error("flush through the logger's writer failed")
	}
}
