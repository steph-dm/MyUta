package apperror

import "fmt"

type Code string

const (
	CodeBadInput        Code = "BAD_USER_INPUT"
	CodeUnauthenticated Code = "UNAUTHENTICATED"
	CodeForbidden       Code = "FORBIDDEN"
	CodeNotFound        Code = "NOT_FOUND"
	CodeInternal        Code = "INTERNAL_SERVER_ERROR"
)

type AppError struct {
	Message string
	Code    Code
	Field   string
}

func (e *AppError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("[%s] %s (field: %s)", e.Code, e.Message, e.Field)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Extensions() map[string]any {
	ext := map[string]any{"code": string(e.Code)}
	if e.Field != "" {
		ext["field"] = e.Field
	}
	return ext
}

func BadInput(message, field string) *AppError {
	return &AppError{Message: message, Code: CodeBadInput, Field: field}
}

func Unauthenticated(message string) *AppError {
	return &AppError{Message: message, Code: CodeUnauthenticated}
}

func Forbidden(message string) *AppError {
	return &AppError{Message: message, Code: CodeForbidden}
}

func NotFound(entity string) *AppError {
	return &AppError{Message: fmt.Sprintf("%s not found", entity), Code: CodeNotFound}
}

func Internal(message string) *AppError {
	return &AppError{Message: message, Code: CodeInternal}
}
