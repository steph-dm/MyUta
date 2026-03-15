package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/steph-dm/MyUta/backend/pkg/apperror"
)

const (
	tokenExpiry = 24 * time.Hour
	tokenIssuer = "myuta"
)

type Claims struct {
	UserID string `json:"userId"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, secret string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("can't sign token: %w", err)
	}
	return signed, nil
}

// Returns empty string (not error) if invalid — treats bad tokens as unauthenticated.
func VerifyToken(tokenStr, secret string) (string, time.Time, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	}, jwt.WithIssuer(tokenIssuer))
	if err != nil {
		return "", time.Time{}, nil
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return "", time.Time{}, nil
	}

	var issuedAt time.Time
	if claims.IssuedAt != nil {
		issuedAt = claims.IssuedAt.Time
	}
	return claims.UserID, issuedAt, nil
}

func RequireAuth(userID string) (string, error) {
	if userID == "" {
		return "", apperror.Unauthenticated("you must be logged in to perform this action")
	}
	return userID, nil
}
