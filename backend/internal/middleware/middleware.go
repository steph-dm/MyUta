// Package middleware contains the HTTP middleware chain.
package middleware

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/netip"
	"runtime/debug"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/auth"
	"github.com/steph-dm/MyUta/backend/internal/reqctx"
	"github.com/steph-dm/MyUta/backend/internal/session"
)

// ClientHeader must be sent with every API request. Browsers cannot add
// custom headers to cross-site form posts, so this blocks CSRF even for
// multipart uploads.
const ClientHeader = "X-MyUta-Client"

// --- request id and logger ---------------------------------------------------------------------

type requestIDKey struct{}
type loggerKey struct{}

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := uuid.NewString()
		w.Header().Set("X-Request-ID", id)
		ctx := context.WithValue(r.Context(), requestIDKey{}, id)
		ctx = context.WithValue(ctx, loggerKey{}, slog.Default().With("request_id", id))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetRequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// LoggerFromContext returns a logger that carries the request id.
func LoggerFromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}

// --- access log ------------------------------------------------------------------------------------

// AccessInfo is filled in while the request is handled and logged at the end.
type AccessInfo struct {
	mu         sync.Mutex
	ClientIP   string
	Operation  string
	UserID     string
	ErrorCodes []string
}

type accessKey struct{}

func Access(ctx context.Context) *AccessInfo {
	a, _ := ctx.Value(accessKey{}).(*AccessInfo)
	return a
}

func (a *AccessInfo) SetOperation(op string) {
	if a == nil {
		return
	}
	a.mu.Lock()
	a.Operation = op
	a.mu.Unlock()
}

func (a *AccessInfo) AddErrorCode(code string) {
	if a == nil {
		return
	}
	a.mu.Lock()
	if !slices.Contains(a.ErrorCodes, code) {
		a.ErrorCodes = append(a.ErrorCodes, code)
	}
	a.mu.Unlock()
}

type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *statusWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(b)
	w.bytes += n
	return n, err
}

// Unwrap lets http.ResponseController reach the underlying writer.
func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (w *statusWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := w.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, errors.New("hijacking not supported")
}

// Logger writes one structured line per request.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		info := &AccessInfo{}
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r.WithContext(context.WithValue(r.Context(), accessKey{}, info)))
		if r.Method == http.MethodOptions || r.URL.Path == "/healthz" || r.URL.Path == "/livez" {
			return
		}
		info.mu.Lock()
		defer info.mu.Unlock()
		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"duration_ms", float64(time.Since(start).Microseconds()) / 1000,
			"bytes", sw.bytes,
		}
		if info.ClientIP != "" {
			attrs = append(attrs, "client_ip", info.ClientIP)
		}
		if info.Operation != "" {
			attrs = append(attrs, "operation", info.Operation)
		}
		if info.UserID != "" {
			attrs = append(attrs, "user_id", info.UserID)
		}
		if len(info.ErrorCodes) > 0 {
			attrs = append(attrs, "error_codes", info.ErrorCodes)
		}
		LoggerFromContext(r.Context()).Info("request", attrs...)
	})
}

// --- recovery ---------------------------------------------------------------------------------------

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				if err, ok := rec.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					panic(rec)
				}
				LoggerFromContext(r.Context()).Error("panic recovered",
					"panic", fmt.Sprint(rec), "method", r.Method, "path", r.URL.Path, "stack", string(debug.Stack()))
				WriteError(w, http.StatusInternalServerError, &apperror.AppError{Code: apperror.CodeInternal, Message: "Internal server error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// --- headers ------------------------------------------------------------------------------------------

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// CORS allows the configured origins (exact match) to call the API with cookies.
func CORS(origins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			w.Header().Add("Vary", "Origin")
			if origin != "" && slices.Contains(origins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, "+ClientHeader)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Max-Age", "600")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireClientHeader rejects API requests without the client header.
func RequireClientHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodOptions && r.Header.Get(ClientHeader) == "" {
			WriteError(w, http.StatusForbidden, apperror.Forbidden(apperror.ReasonCSRFHeaderMissing,
				"Missing "+ClientHeader+" header"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// BodyLimit rejects oversized bodies with 413. Multipart requests (file
// uploads) may be larger than plain JSON requests.
func BodyLimit(jsonLimit, uploadLimit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			limit := jsonLimit
			if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt == "multipart/form-data" {
				limit = uploadLimit + 64<<10 // room for the multipart envelope
			}
			if r.ContentLength > limit {
				WriteError(w, http.StatusRequestEntityTooLarge, apperror.TooLarge(limit))
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

// --- client address -----------------------------------------------------------------------------------

// RequestFacts stores the client address (see ResolveClientIP), the user
// agent and the response writer in the context for the services.
func RequestFacts(trusted []netip.Prefix) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ResolveClientIP(r, trusted)
			if a := Access(r.Context()); a != nil {
				a.mu.Lock()
				a.ClientIP = ip // logged, so proxy settings can be checked
				a.mu.Unlock()
			}
			ctx := reqctx.WithClientIP(r.Context(), ip)
			ctx = reqctx.WithUserAgent(ctx, r.UserAgent())
			ctx = reqctx.WithResponseWriter(ctx, w)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ResolveClientIP returns the address used as the rate-limit key. Forwarding
// headers are honoured only when the direct peer is a trusted proxy:
// X-Real-IP first (nginx overwrites it), otherwise the right-most
// X-Forwarded-For entry that is not one of our proxies.
func ResolveClientIP(r *http.Request, trusted []netip.Prefix) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer, err := netip.ParseAddr(host)
	if err != nil {
		return host
	}
	peer = peer.Unmap()
	if !isTrusted(peer, trusted) {
		return peer.String()
	}
	if v := strings.TrimSpace(r.Header.Get("X-Real-IP")); v != "" {
		if ip, err := netip.ParseAddr(v); err == nil {
			return ip.Unmap().String()
		}
	}
	parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(parts) - 1; i >= 0; i-- {
		ip, err := netip.ParseAddr(strings.TrimSpace(parts[i]))
		if err != nil {
			continue
		}
		if ip = ip.Unmap(); !isTrusted(ip, trusted) {
			return ip.String()
		}
	}
	return peer.String()
}

func isTrusted(ip netip.Addr, trusted []netip.Prefix) bool {
	if ip.IsLoopback() {
		return true
	}
	for _, p := range trusted {
		if p.Contains(ip) {
			return true
		}
	}
	return false
}

// --- authentication ----------------------------------------------------------------------------------------

// Auth identifies the caller from the session cookie. If the session cannot
// be checked (database down) the request fails with 503 instead of being
// treated as anonymous, so users are not "logged out" by an outage.
func Auth(sessions *session.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			id, ok, err := sessions.Authenticate(ctx, w, r)
			if err != nil {
				LoggerFromContext(ctx).Error("session lookup failed", "error", err)
				w.Header().Set("Retry-After", "5")
				WriteError(w, http.StatusServiceUnavailable, apperror.Unavailable())
				return
			}
			if ok {
				ctx = auth.WithIdentity(ctx, id)
				if a := Access(ctx); a != nil {
					a.mu.Lock()
					a.UserID = id.UserID
					a.mu.Unlock()
				}
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// WriteError writes a GraphQL-shaped error response.
func WriteError(w http.ResponseWriter, status int, e *apperror.AppError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"errors": []any{map[string]any{"message": e.Message, "extensions": e.Extensions()}},
	})
}
