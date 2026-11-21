// Package reqctx carries request facts (client address, user agent, response
// writer) through the context, so services do not depend on HTTP middleware.
package reqctx

import (
	"context"
	"net/http"
)

type key int

const (
	clientIPKey key = iota
	userAgentKey
	writerKey
)

func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPKey, ip)
}

// ClientIP returns the resolved client address ("unknown" outside a request).
func ClientIP(ctx context.Context) string {
	if ip, ok := ctx.Value(clientIPKey).(string); ok && ip != "" {
		return ip
	}
	return "unknown"
}

func WithUserAgent(ctx context.Context, ua string) context.Context {
	return context.WithValue(ctx, userAgentKey, ua)
}

func UserAgent(ctx context.Context) string {
	ua, _ := ctx.Value(userAgentKey).(string)
	return ua
}

func WithResponseWriter(ctx context.Context, w http.ResponseWriter) context.Context {
	return context.WithValue(ctx, writerKey, w)
}

// ResponseWriter returns the writer used to set cookies, or nil.
func ResponseWriter(ctx context.Context) http.ResponseWriter {
	w, _ := ctx.Value(writerKey).(http.ResponseWriter)
	return w
}
