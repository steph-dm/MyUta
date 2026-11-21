package auth

import "context"

// Identity is the authenticated caller.
type Identity struct {
	UserID    string
	SessionID string
}

type ctxKey struct{}

func WithIdentity(ctx context.Context, id Identity) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

// FromContext returns the caller, if any.
func FromContext(ctx context.Context) (Identity, bool) {
	id, ok := ctx.Value(ctxKey{}).(Identity)
	return id, ok && id.UserID != ""
}

// UserID returns the caller's id or "" when anonymous.
func UserID(ctx context.Context) string {
	id, _ := FromContext(ctx)
	return id.UserID
}
