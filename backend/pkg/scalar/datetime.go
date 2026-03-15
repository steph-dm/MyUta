package scalar

import (
	"database/sql/driver"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
)

type DateTime struct {
	time.Time
}

func (dt *DateTime) Scan(src any) error {
	switch v := src.(type) {
	case time.Time:
		dt.Time = v
		return nil
	case []byte:
		t, err := time.Parse(time.RFC3339Nano, string(v))
		if err != nil {
			t, err = time.Parse("2006-01-02 15:04:05.999999-07", string(v))
			if err != nil {
				return fmt.Errorf("can't parse datetime %q: %w", string(v), err)
			}
		}
		dt.Time = t
		return nil
	case string:
		t, err := time.Parse(time.RFC3339Nano, v)
		if err != nil {
			t, err = time.Parse("2006-01-02 15:04:05.999999-07", v)
			if err != nil {
				return fmt.Errorf("can't parse datetime %q: %w", v, err)
			}
		}
		dt.Time = t
		return nil
	case nil:
		dt.Time = time.Time{}
		return nil
	default:
		return fmt.Errorf("DateTime.Scan: unsupported type %T", src)
	}
}

func (dt DateTime) Value() (driver.Value, error) {
	if dt.IsZero() {
		return nil, nil
	}
	return dt.Time, nil
}

func MarshalDateTime(t DateTime) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		io.WriteString(w, strconv.Quote(t.Format(time.RFC3339)))
	})
}

func UnmarshalDateTime(v any) (DateTime, error) {
	switch v := v.(type) {
	case string:
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			t, err = time.Parse("2006-01-02T15:04:05", v)
			if err != nil {
				t, err = time.Parse("2006-01-02", v)
				if err != nil {
					return DateTime{}, fmt.Errorf("DateTime must be a valid ISO 8601 string, got: %s", v)
				}
			}
		}
		return DateTime{Time: t}, nil
	case int64:
		return DateTime{Time: time.Unix(v, 0)}, nil
	case float64:
		return DateTime{Time: time.Unix(int64(v), 0)}, nil
	default:
		return DateTime{}, fmt.Errorf("DateTime must be a string or number, got: %T", v)
	}
}

func Now() DateTime {
	return DateTime{Time: time.Now()}
}

func FromTime(t time.Time) DateTime {
	return DateTime{Time: t}
}
