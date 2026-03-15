package graph

import (
	"context"
	"net/http"
)

type ctxKey string

const (
	HTTPRequestKey  ctxKey = "httpRequest"
	HTTPResponseKey ctxKey = "httpResponse"
)

func SetTokenCookie(ctx context.Context, token string, secure bool) {
	w, ok := ctx.Value(HTTPResponseKey).(http.ResponseWriter)
	if !ok {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func ClearTokenCookie(ctx context.Context, secure bool) {
	w, ok := ctx.Value(HTTPResponseKey).(http.ResponseWriter)
	if !ok {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}
