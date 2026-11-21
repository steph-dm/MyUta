package youtube

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
)

func TestSearch(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Header.Get("X-Goog-Api-Key") != "k" || r.URL.Query().Get("key") != "" {
			t.Errorf("API key not sent as header only: %s", r.URL)
		}
		switch r.URL.Path {
		case "/search":
			if r.URL.Query().Get("videoEmbeddable") != "true" {
				t.Error("videoEmbeddable filter missing")
			}
			_, _ = w.Write([]byte(`{"items":[{"id":{"videoId":"b"}},{"id":{"videoId":"a"}}]}`))
		case "/videos":
			// returned in a different order than the search
			_, _ = w.Write([]byte(`{"items":[
			  {"id":"a","snippet":{"title":"A"},"contentDetails":{"duration":"PT4M33S"}},
			  {"id":"b","snippet":{"title":"B"},"contentDetails":{"duration":"P0D"}}]}`))
		}
	}))
	defer srv.Close()
	c := &Client{apiKey: "k", http: srv.Client(), cache: expirable.NewLRU[string, []*Result](10, nil, time.Hour), base: srv.URL}
	res, err := c.Search(context.Background(), "YOASOBI", "アイドル")
	if err != nil {
		t.Fatal(err)
	}
	if len(res) != 2 || res[0].VideoID != "b" || res[0].Duration != "LIVE" || res[1].Duration != "4:33" {
		t.Fatalf("results: %+v %+v", res[0], res[1])
	}
	if _, err := c.Search(context.Background(), "yoasobi", " アイドル "); err != nil || calls.Load() != 2 {
		t.Fatalf("identical search not served from cache (calls=%d)", calls.Load())
	}
}

func TestQuotaAndErrorsHideKey(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusForbidden) }))
	defer srv.Close()
	c := &Client{apiKey: "secret-key", http: srv.Client(), cache: expirable.NewLRU[string, []*Result](10, nil, time.Hour), base: srv.URL}
	if _, err := c.Search(context.Background(), "a", "b"); !errors.Is(err, ErrQuota) {
		t.Fatalf("got %v", err)
	}
	c.base = "http://127.0.0.1:1"
	_, err := c.Search(context.Background(), "x", "y")
	if err == nil || strings.Contains(err.Error(), "secret-key") {
		t.Fatalf("error leaks the key or is nil: %v", err)
	}
}

func TestFormatDuration(t *testing.T) {
	for in, want := range map[string]string{"PT4M33S": "4:33", "PT1H2M3S": "1:02:03", "P1DT2H": "26:00:00", "P0D": "LIVE", "PT45S": "0:45", "junk": ""} {
		if got := FormatDuration(in); got != want {
			t.Errorf("FormatDuration(%q) = %q, want %q", in, got, want)
		}
	}
}
