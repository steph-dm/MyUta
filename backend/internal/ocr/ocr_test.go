package ocr

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
)

var pngHeader = []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

func fake(t *testing.T, status int, body string) *Claude {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "k" {
			t.Error("api key header missing")
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return &Claude{apiKey: "k", model: "m", endpoint: srv.URL, http: srv.Client(),
		now: func() time.Time { return time.Date(2026, 11, 21, 12, 0, 0, 0, time.UTC) }}
}

func TestExtractParsesToolOutput(t *testing.T) {
	c := fake(t, 200, `{"stop_reason":"tool_use","content":[{"type":"tool_use","name":"record_karaoke_result","input":{
	  "isResultScreen":true,"songTitle":"♪アイドル","artistName":"YOASOBI","score":91.23456,"date":"2026-11-20",
	  "machineType":"KSTAGE","genres":["ANIME","NOPE"],"issues":["RHYTHM","RHYTHM"],"details":{"pitch":88.5,"grade":"A"}}}]}`)
	r, err := c.Extract(context.Background(), pngHeader, "ja")
	if err != nil {
		t.Fatal(err)
	}
	if r.SongTitle != "アイドル" || *r.Score != 91.235 || *r.MachineType != domain.MachineKStage ||
		r.Date.Format("2006-01-02") != "2026-11-20" || len(r.Genres) != 1 || len(r.Issues) != 1 || *r.Details.Pitch != 88.5 {
		t.Fatalf("unexpected result %+v", r)
	}
}

func TestUnknownMachineAndBadValuesBecomeNil(t *testing.T) {
	c := fake(t, 200, `{"stop_reason":"tool_use","content":[{"type":"tool_use","name":"record_karaoke_result","input":{
	  "isResultScreen":true,"songTitle":"x","artistName":"y","score":140,"date":"2099-01-01","machineType":"UTAU","genres":[],"issues":[]}}]}`)
	r, err := c.Extract(context.Background(), pngHeader, "en")
	if err != nil {
		t.Fatal(err)
	}
	if r.MachineType != nil || r.Score != nil || r.Date != nil {
		t.Fatalf("invalid values kept: %+v", r)
	}
}

func TestFailures(t *testing.T) {
	var ae *apperror.AppError
	if _, err := fake(t, 200, `{}`).Extract(context.Background(), []byte("plain text"), "en"); !errors.As(err, &ae) || ae.Reason != apperror.ReasonInvalidImage {
		t.Errorf("non-image accepted: %v", err)
	}
	if _, err := fake(t, 429, `{}`).Extract(context.Background(), pngHeader, "en"); !errors.As(err, &ae) || ae.Reason != apperror.ReasonUpstreamLimited {
		t.Errorf("rate limit not reported: %v", err)
	}
	if _, err := fake(t, 200, `{"stop_reason":"max_tokens","content":[]}`).Extract(context.Background(), pngHeader, "en"); !errors.As(err, &ae) || ae.Reason != apperror.ReasonOCRUnreadable {
		t.Errorf("truncated answer accepted: %v", err)
	}
	if _, err := fake(t, 200, `{"stop_reason":"tool_use","content":[{"type":"tool_use","name":"record_karaoke_result","input":{"isResultScreen":false,"songTitle":"","artistName":""}}]}`).Extract(context.Background(), pngHeader, "en"); !errors.As(err, &ae) || ae.Reason != apperror.ReasonOCRUnreadable {
		t.Errorf("non-result screen accepted: %v", err)
	}
}

func TestPromptAndTruncate(t *testing.T) {
	if !strings.Contains(prompt("ja"), "Japanese") || !strings.Contains(prompt("ja"), "KSTAGE") {
		t.Error("prompt lacks language or machine list")
	}
	if got := truncate("あいうえお", 2); got != "あい…" {
		t.Errorf("truncate broke runes: %q", got)
	}
}
