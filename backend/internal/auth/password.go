package auth

import (
	"fmt"
	"sync"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

func ComparePassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

var (
	dummyOnce sync.Once
	dummyHash []byte
)

// DummyCompare spends the same time as a real comparison. It is used when the
// account does not exist so that response times do not reveal registered e-mails.
func DummyCompare(password string) {
	dummyOnce.Do(func() {
		dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), bcryptCost)
	})
	_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
}
