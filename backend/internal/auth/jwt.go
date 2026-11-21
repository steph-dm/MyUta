// Package auth signs and verifies session tokens and hashes passwords.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenIssuer = "myuta"

// ErrInvalidToken is returned for any token that must not be accepted.
var ErrInvalidToken = errors.New("invalid session token")

// Claims identify a server-side session. The session row decides whether the
// token is still valid; the signature only proves we issued it.
type Claims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

// SignSession returns a signed token for the given session.
func SignSession(secret, userID, sessionID string, issuedAt, expires time.Time) (string, error) {
	claims := Claims{
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(expires),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// ParseSession verifies a token and returns the user and session ids.
// Only HS256 is accepted and the expiry claim is required.
func ParseSession(tokenStr, secret string) (userID, sessionID string, err error) {
	claims := &Claims{}
	_, err = jwt.ParseWithClaims(tokenStr, claims,
		func(*jwt.Token) (any, error) { return []byte(secret), nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(tokenIssuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return "", "", fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}
	if claims.Subject == "" || claims.SessionID == "" {
		return "", "", ErrInvalidToken
	}
	return claims.Subject, claims.SessionID, nil
}
