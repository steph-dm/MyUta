// Package testutil provides throwaway databases and an HTTP client for the
// integration tests (build tag "integration").
//
// Set TEST_DATABASE_URL to a PostgreSQL URL whose user may create databases,
// e.g. postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable.
// Each call to FreshDB creates a new database and drops it afterwards.
package testutil

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/uptrace/bun"

	"github.com/steph-dm/MyUta/backend/internal/app"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/database"
	"github.com/steph-dm/MyUta/backend/internal/mail"
)

// AdminURL returns TEST_DATABASE_URL or skips the test.
func AdminURL(t *testing.T) string {
	t.Helper()
	u := os.Getenv("TEST_DATABASE_URL")
	if u == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	return u
}

// FreshDB creates an empty database (no migrations) and returns its URL.
func FreshDB(t *testing.T) string {
	t.Helper()
	admin := AdminURL(t)
	ctx := context.Background()
	adb, err := database.Connect(ctx, admin)
	if err != nil {
		t.Fatal(err)
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	name := "myuta_test_" + hex.EncodeToString(b)
	if _, err := adb.ExecContext(ctx, "CREATE DATABASE "+name+" ENCODING 'UTF8' TEMPLATE template0"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = adb.ExecContext(context.Background(), "DROP DATABASE IF EXISTS "+name+" WITH (FORCE)")
		_ = adb.Close()
	})
	u, _ := url.Parse(admin)
	u.Path = "/" + name
	return u.String()
}

// MigratedDB returns a connection to a fresh, fully migrated database.
func MigratedDB(t *testing.T) *bun.DB {
	t.Helper()
	dsn := FreshDB(t)
	db, err := database.Connect(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := database.Migrate(context.Background(), db.DB); err != nil {
		t.Fatal(err)
	}
	return db
}

// Mailbox captures e-mails instead of sending them.
type Mailbox struct {
	mu   sync.Mutex
	Sent []mail.Message
}

func (m *Mailbox) Send(_ context.Context, msg mail.Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Sent = append(m.Sent, msg)
	return nil
}

func (m *Mailbox) Last() mail.Message {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.Sent) == 0 {
		return mail.Message{}
	}
	return m.Sent[len(m.Sent)-1]
}

// Server starts the full application on a fresh database.
func Server(t *testing.T, opts *app.Options) (*httptest.Server, *app.App) {
	t.Helper()
	db := MigratedDB(t)
	cfg := &config.Config{
		Environment: config.EnvTest, JWTSecret: "integration-test-secret-0123456789abcdef",
		SessionTTL: 7 * 24 * time.Hour, FrontendURL: "http://frontend.test",
	}
	if opts == nil {
		opts = &app.Options{}
	}
	a := app.New(cfg, db, opts)
	t.Cleanup(a.Limiter.Close)
	srv := httptest.NewServer(a.Handler)
	t.Cleanup(srv.Close)
	return srv, a
}

// Client is a browser-like client with its own cookie jar.
type Client struct {
	t    *testing.T
	base string
	HTTP *http.Client
}

func NewClient(t *testing.T, srv *httptest.Server) *Client {
	jar, _ := cookiejar.New(nil)
	return &Client{t: t, base: srv.URL, HTTP: &http.Client{Jar: jar}}
}

// Response is a decoded GraphQL response.
type Response struct {
	Data   map[string]any
	Errors []struct {
		Message    string         `json:"message"`
		Extensions map[string]any `json:"extensions"`
	}
	Status int
}

// Code returns extensions.code of the first error ("" when none).
func (r *Response) Code() string {
	if len(r.Errors) == 0 {
		return ""
	}
	s, _ := r.Errors[0].Extensions["code"].(string)
	return s
}

// Reason returns extensions.reason of the first error.
func (r *Response) Reason() string {
	if len(r.Errors) == 0 {
		return ""
	}
	s, _ := r.Errors[0].Extensions["reason"].(string)
	return s
}

// Get walks the data with a path like "logReview.song.id".
func (r *Response) Get(path ...any) any {
	var cur any = r.Data
	for _, p := range path {
		switch k := p.(type) {
		case string:
			m, _ := cur.(map[string]any)
			cur = m[k]
		case int:
			l, _ := cur.([]any)
			if k >= len(l) {
				return nil
			}
			cur = l[k]
		}
	}
	return cur
}

func (r *Response) String(path ...any) string { s, _ := r.Get(path...).(string); return s }
func (r *Response) Number(path ...any) float64 {
	f, _ := r.Get(path...).(float64)
	return f
}

// Do runs a GraphQL operation.
func (c *Client) Do(query string, vars map[string]any) *Response {
	c.t.Helper()
	body, _ := json.Marshal(map[string]any{"query": query, "variables": vars})
	req, _ := http.NewRequest(http.MethodPost, c.base+"/graphql", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MyUta-Client", "test")
	return c.send(req)
}

// Upload runs a mutation with one file in variable varName.
func (c *Client) Upload(query, varName, filename string, data []byte) *Response {
	c.t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	ops, _ := json.Marshal(map[string]any{"query": query, "variables": map[string]any{varName: nil}})
	_ = w.WriteField("operations", string(ops))
	_ = w.WriteField("map", fmt.Sprintf(`{"0":["variables.%s"]}`, varName))
	fw, _ := w.CreateFormFile("0", filename)
	_, _ = fw.Write(data)
	_ = w.Close()
	req, _ := http.NewRequest(http.MethodPost, c.base+"/graphql", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("X-MyUta-Client", "test")
	return c.send(req)
}

// Get performs a plain GET with the client header (e.g. /export).
func (c *Client) GetRaw(path string) (*http.Response, []byte) {
	c.t.Helper()
	req, _ := http.NewRequest(http.MethodGet, c.base+path, nil)
	req.Header.Set("X-MyUta-Client", "test")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	b, _ := io.ReadAll(resp.Body)
	return resp, b
}

func (c *Client) send(req *http.Request) *Response {
	c.t.Helper()
	resp, err := c.HTTP.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	out := &Response{Status: resp.StatusCode}
	b, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(b, out); err != nil {
		c.t.Fatalf("decode %s: %v", b, err)
	}
	return out
}

// MustOK fails the test when the response has errors.
func MustOK(t *testing.T, r *Response) *Response {
	t.Helper()
	if len(r.Errors) > 0 {
		t.Fatalf("unexpected errors: %+v", r.Errors)
	}
	return r
}
