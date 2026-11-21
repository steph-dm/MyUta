package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "0123456789abcdef0123456789abcdef"

func TestSessionTokenRoundTrip(t *testing.T) {
	tok, err := SignSession(secret, "u1", "s1", time.Now(), time.Now().Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	u, s, err := ParseSession(tok, secret)
	if err != nil || u != "u1" || s != "s1" {
		t.Fatalf("got %q %q %v", u, s, err)
	}
	if _, _, err := ParseSession(tok, secret+"x"); !errors.Is(err, ErrInvalidToken) {
		t.Fatal("wrong secret accepted")
	}
	expired, _ := SignSession(secret, "u1", "s1", time.Now().Add(-2*time.Hour), time.Now().Add(-time.Hour))
	if _, _, err := ParseSession(expired, secret); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestRejectsOtherAlgorithmsAndMissingExpiry(t *testing.T) {
	claims := Claims{SessionID: "s", RegisteredClaims: jwt.RegisteredClaims{Issuer: tokenIssuer, Subject: "u", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	hs512, _ := jwt.NewWithClaims(jwt.SigningMethodHS512, claims).SignedString([]byte(secret))
	if _, _, err := ParseSession(hs512, secret); err == nil {
		t.Error("HS512 token accepted")
	}
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, _, err := ParseSession(none, secret); err == nil {
		t.Error("alg=none token accepted")
	}
	claims.ExpiresAt = nil
	noExp, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if _, _, err := ParseSession(noExp, secret); err == nil {
		t.Error("token without expiry accepted")
	}
}

func TestPasswords(t *testing.T) {
	h, err := HashPassword("correct horse battery")
	if err != nil || !ComparePassword("correct horse battery", h) || ComparePassword("wrong", h) {
		t.Fatal("hash/compare broken")
	}
	start := time.Now()
	DummyCompare("x") // first call also builds the dummy hash
	if time.Since(start) < 50*time.Millisecond {
		t.Error("dummy compare is suspiciously fast")
	}
}
