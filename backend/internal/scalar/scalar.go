// Package scalar implements the GraphQL Date and DateTime scalars.
//
// Date is a calendar day ("2026-11-21") with no time zone: it is the day the
// singer picked, stored in a DATE column, and never shifted by time zones.
package scalar

import (
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
)

const DateLayout = "2006-01-02"

// ParseDate parses YYYY-MM-DD into midnight UTC.
func ParseDate(s string) (time.Time, error) {
	t, err := time.Parse(DateLayout, s)
	if err != nil {
		return time.Time{}, apperror.BadInput(apperror.ReasonDateInvalid, "date", "Date must look like 2026-11-21")
	}
	return t, nil
}

// FormatDate formats the calendar day of t (t is expected at midnight UTC).
func FormatDate(t time.Time) string { return t.UTC().Format(DateLayout) }

func MarshalDate(t time.Time) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		_, _ = io.WriteString(w, strconv.Quote(FormatDate(t)))
	})
}

func UnmarshalDate(v any) (time.Time, error) {
	s, ok := v.(string)
	if !ok {
		return time.Time{}, apperror.BadInput(apperror.ReasonDateInvalid, "date", "Date must be a string like 2026-11-21")
	}
	return ParseDate(s)
}

func MarshalDateTime(t time.Time) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		_, _ = io.WriteString(w, strconv.Quote(t.UTC().Format(time.RFC3339)))
	})
}

func UnmarshalDateTime(v any) (time.Time, error) {
	s, ok := v.(string)
	if !ok {
		return time.Time{}, apperror.BadInput(apperror.ReasonDateInvalid, "", "DateTime must be an RFC 3339 string")
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}, apperror.BadInput(apperror.ReasonDateInvalid, "", fmt.Sprintf("Invalid DateTime %q", s))
	}
	return t, nil
}
