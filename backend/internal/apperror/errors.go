// Package apperror defines the errors that are shown to API clients. Anything
// that is not an *AppError is reported to clients as an internal error.
package apperror

import (
	"fmt"
	"time"
)

// Code is the coarse error class (extensions.code).
type Code string

const (
	CodeBadInput        Code = "BAD_USER_INPUT"
	CodeUnauthenticated Code = "UNAUTHENTICATED"
	CodeForbidden       Code = "FORBIDDEN"
	CodeNotFound        Code = "NOT_FOUND"
	CodeConflict        Code = "CONFLICT"
	CodeRateLimited     Code = "RATE_LIMITED"
	CodeFeatureDisabled Code = "FEATURE_DISABLED"
	CodeUnavailable     Code = "SERVICE_UNAVAILABLE"
	CodeTooLarge        Code = "PAYLOAD_TOO_LARGE"
	CodeInternal        Code = "INTERNAL_SERVER_ERROR"
)

// Reason is a stable, machine-readable cause (extensions.reason). Clients
// translate reasons; they must never parse Message.
type Reason string

const (
	ReasonInvalidCredentials Reason = "INVALID_CREDENTIALS" //nolint:gosec // an error code, not a credential
	ReasonWrongPassword      Reason = "WRONG_PASSWORD"
	ReasonEmailTaken         Reason = "EMAIL_TAKEN"
	ReasonInvalidEmail       Reason = "INVALID_EMAIL"
	ReasonPasswordTooShort   Reason = "PASSWORD_TOO_SHORT"
	ReasonPasswordTooLong    Reason = "PASSWORD_TOO_LONG"
	ReasonNameLength         Reason = "NAME_LENGTH"
	ReasonTitleLength        Reason = "TITLE_LENGTH"
	ReasonArtistNameLength   Reason = "ARTIST_NAME_LENGTH"
	ReasonNotesLength        Reason = "NOTES_LENGTH"
	ReasonVariantLength      Reason = "VARIANT_LENGTH"
	ReasonScoreRange         Reason = "SCORE_RANGE"
	ReasonKeyChangeRange     Reason = "KEY_CHANGE_RANGE"
	ReasonDetailsRange       Reason = "DETAILS_RANGE"
	ReasonDateInvalid        Reason = "DATE_INVALID"
	ReasonDateInFuture       Reason = "DATE_IN_FUTURE"
	ReasonInvalidGenre       Reason = "INVALID_GENRE"
	ReasonInvalidIssue       Reason = "INVALID_ISSUE"
	ReasonInvalidMachine     Reason = "INVALID_MACHINE"
	ReasonInvalidLanguage    Reason = "INVALID_LANGUAGE"
	ReasonInvalidYouTubeURL  Reason = "INVALID_YOUTUBE_URL"
	ReasonSongRequired       Reason = "SONG_REQUIRED"
	ReasonDuplicateSong      Reason = "DUPLICATE_SONG"
	ReasonArtistExists       Reason = "ARTIST_EXISTS"
	ReasonSameArtist         Reason = "SAME_ARTIST"
	ReasonBatchSize          Reason = "BATCH_SIZE"
	ReasonPagination         Reason = "PAGINATION"
	ReasonInvalidImport      Reason = "INVALID_IMPORT"
	ReasonImportTooManyRows  Reason = "IMPORT_TOO_MANY_ROWS"
	ReasonInvalidToken       Reason = "INVALID_TOKEN"
	ReasonInvalidImage       Reason = "INVALID_IMAGE"
	ReasonOCRUnreadable      Reason = "OCR_UNREADABLE"
	ReasonUpstreamLimited    Reason = "UPSTREAM_RATE_LIMITED"
	ReasonUpstreamFailed     Reason = "UPSTREAM_FAILED"
	ReasonCSRFHeaderMissing  Reason = "CSRF_HEADER_MISSING"
	ReasonQueryTooDeep       Reason = "QUERY_TOO_DEEP"
	ReasonTooManyFields      Reason = "TOO_MANY_FIELDS"
	ReasonInvalidID          Reason = "INVALID_ID"
)

// AppError is an error that is safe to show to the client.
type AppError struct {
	Code    Code
	Reason  Reason
	Message string
	Field   string
	Extra   map[string]any
}

// Error returns only the human-readable message (never codes or fields).
func (e *AppError) Error() string { return e.Message }

// Extensions returns the GraphQL error extensions.
func (e *AppError) Extensions() map[string]any {
	ext := map[string]any{"code": string(e.Code)}
	if e.Reason != "" {
		ext["reason"] = string(e.Reason)
	}
	if e.Field != "" {
		ext["field"] = e.Field
	}
	for k, v := range e.Extra {
		ext[k] = v
	}
	return ext
}

// WithExtra returns a copy with one more extension value.
func (e *AppError) WithExtra(key string, value any) *AppError {
	c := *e
	c.Extra = map[string]any{}
	for k, v := range e.Extra {
		c.Extra[k] = v
	}
	c.Extra[key] = value
	return &c
}

func BadInput(reason Reason, field, message string) *AppError {
	return &AppError{Code: CodeBadInput, Reason: reason, Field: field, Message: message}
}

func Conflict(reason Reason, field, message string) *AppError {
	return &AppError{Code: CodeConflict, Reason: reason, Field: field, Message: message}
}

func Unauthenticated() *AppError {
	return &AppError{Code: CodeUnauthenticated, Message: "You must be signed in to do this"}
}

func InvalidCredentials() *AppError {
	return &AppError{Code: CodeUnauthenticated, Reason: ReasonInvalidCredentials, Message: "Invalid email or password"}
}

func WrongPassword(field string) *AppError {
	return BadInput(ReasonWrongPassword, field, "Password is incorrect")
}

func Forbidden(reason Reason, message string) *AppError {
	return &AppError{Code: CodeForbidden, Reason: reason, Message: message}
}

// NotFound is used both for missing objects and for objects owned by somebody
// else, so that ids cannot be probed.
func NotFound(entity string) *AppError {
	return &AppError{Code: CodeNotFound, Message: fmt.Sprintf("%s not found", entity)}
}

func RateLimited(retryAfter time.Duration) *AppError {
	secs := int((retryAfter + time.Second - 1) / time.Second)
	if secs < 1 {
		secs = 1
	}
	return &AppError{
		Code:    CodeRateLimited,
		Message: fmt.Sprintf("Too many attempts. Try again in %d seconds", secs),
		Extra:   map[string]any{"retryAfterSeconds": secs},
	}
}

func FeatureDisabled(feature string) *AppError {
	return &AppError{
		Code:    CodeFeatureDisabled,
		Message: "This feature is not enabled on this server",
		Extra:   map[string]any{"feature": feature},
	}
}

// Upstream reports a failure of an external service (OCR, YouTube, e-mail).
func Upstream(reason Reason, message string) *AppError {
	return &AppError{Code: CodeUnavailable, Reason: reason, Message: message}
}

func Unavailable() *AppError {
	return &AppError{Code: CodeUnavailable, Message: "The service is temporarily unavailable. Please retry"}
}

func TooLarge(limitBytes int64) *AppError {
	return &AppError{
		Code:    CodeTooLarge,
		Message: fmt.Sprintf("Request is too large (maximum %d MB)", limitBytes/(1<<20)),
		Extra:   map[string]any{"maxBytes": limitBytes},
	}
}
