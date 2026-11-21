// Package ocr reads a karaoke result screen from a photo or screenshot.
package ocr

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/scalar"
	"github.com/steph-dm/MyUta/backend/internal/validator"
)

// Result is what could be read. Every field the model was unsure about is nil.
type Result struct {
	SongTitle     string
	ArtistName    string
	SongTitleAlt  *string
	ArtistNameAlt *string
	Score         *float64
	Date          *time.Time
	MachineType   *domain.MachineType
	Notes         *string
	Genres        []domain.Genre
	Issues        []domain.Issue
	Details       *domain.ScoreDetails
}

// Extractor reads a result screen. A nil Extractor means OCR is disabled.
type Extractor interface {
	Extract(ctx context.Context, image []byte, language string) (*Result, error)
}

// Timeout stays well below the HTTP server's write timeout so the client
// always receives an answer.
const Timeout = 25 * time.Second

type Claude struct {
	apiKey   string
	model    string
	endpoint string
	http     *http.Client
	now      func() time.Time
}

// NewClaude returns nil when no API key is configured. The model is set with
// ANTHROPIC_MODEL; check Anthropic's model deprecation page when upgrading.
func NewClaude(apiKey, model string) Extractor {
	if apiKey == "" {
		return nil
	}
	return &Claude{
		apiKey:   apiKey,
		model:    model,
		endpoint: "https://api.anthropic.com/v1/messages",
		http:     &http.Client{Timeout: Timeout},
		now:      time.Now,
	}
}

var supportedImages = map[string]bool{"image/png": true, "image/jpeg": true, "image/webp": true, "image/gif": true}

const toolName = "record_karaoke_result"

func (c *Claude) Extract(ctx context.Context, image []byte, language string) (*Result, error) {
	mediaType := http.DetectContentType(image) // sniffed from the bytes, not trusted from the client
	if !supportedImages[mediaType] {
		return nil, apperror.BadInput(apperror.ReasonInvalidImage, "image", "The file is not a PNG, JPEG, WebP or GIF image")
	}

	body := map[string]any{
		"model":       c.model,
		"max_tokens":  1024,
		"tools":       []any{tool()},
		"tool_choice": map[string]any{"type": "tool", "name": toolName},
		"messages": []any{map[string]any{
			"role": "user",
			"content": []any{
				map[string]any{"type": "image", "source": map[string]any{
					"type": "base64", "media_type": mediaType, "data": base64.StdEncoding.EncodeToString(image),
				}},
				map[string]any{"type": "text", "text": prompt(language)},
			},
		}},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("ocr: marshal: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("ocr: request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.http.Do(req)
	if err != nil {
		slog.WarnContext(ctx, "ocr request failed", "error", err)
		return nil, apperror.Upstream(apperror.ReasonUpstreamFailed, "The screenshot reader is not reachable. Please retry")
	}
	defer func() { _ = resp.Body.Close() }()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	switch {
	case resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == 529:
		return nil, apperror.Upstream(apperror.ReasonUpstreamLimited, "The screenshot reader is busy. Try again in a minute")
	case resp.StatusCode != http.StatusOK:
		slog.ErrorContext(ctx, "ocr upstream error", "status", resp.StatusCode, "body", truncate(string(raw), 300))
		return nil, apperror.Upstream(apperror.ReasonUpstreamFailed, "The screenshot reader returned an error")
	}

	var apiResp struct {
		StopReason string `json:"stop_reason"`
		Content    []struct {
			Type  string          `json:"type"`
			Name  string          `json:"name"`
			Input json.RawMessage `json:"input"`
		} `json:"content"`
	}
	if err := json.Unmarshal(raw, &apiResp); err != nil {
		return nil, fmt.Errorf("ocr: decode response: %w", err)
	}
	if apiResp.StopReason != "tool_use" {
		slog.WarnContext(ctx, "ocr unexpected stop reason", "stop_reason", apiResp.StopReason)
		return nil, apperror.BadInput(apperror.ReasonOCRUnreadable, "image", "The result could not be read from this image")
	}
	for _, block := range apiResp.Content {
		if block.Type == "tool_use" && block.Name == toolName {
			return c.parse(block.Input)
		}
	}
	return nil, apperror.BadInput(apperror.ReasonOCRUnreadable, "image", "The result could not be read from this image")
}

type rawResult struct {
	IsResultScreen bool                 `json:"isResultScreen"`
	SongTitle      string               `json:"songTitle"`
	ArtistName     string               `json:"artistName"`
	SongTitleAlt   *string              `json:"songTitleAlt"`
	ArtistNameAlt  *string              `json:"artistNameAlt"`
	Score          *float64             `json:"score"`
	Date           *string              `json:"date"`
	MachineType    *string              `json:"machineType"`
	Notes          *string              `json:"notes"`
	Genres         []string             `json:"genres"`
	Issues         []string             `json:"issues"`
	Details        *domain.ScoreDetails `json:"details"`
}

func (c *Claude) parse(input json.RawMessage) (*Result, error) {
	var r rawResult
	if err := json.Unmarshal(input, &r); err != nil {
		return nil, fmt.Errorf("ocr: decode tool input %s: %w", truncate(string(input), 200), err)
	}
	if !r.IsResultScreen || strings.TrimSpace(r.SongTitle) == "" || strings.TrimSpace(r.ArtistName) == "" {
		return nil, apperror.BadInput(apperror.ReasonOCRUnreadable, "image", "No karaoke result was found in this image")
	}
	out := &Result{
		SongTitle:     domain.CleanText(strings.TrimPrefix(strings.TrimSpace(r.SongTitle), "♪")),
		ArtistName:    domain.CleanText(strings.TrimPrefix(strings.TrimSpace(r.ArtistName), "♪")),
		SongTitleAlt:  nonBlank(r.SongTitleAlt),
		ArtistNameAlt: nonBlank(r.ArtistNameAlt),
		Notes:         nonBlank(r.Notes),
	}
	if r.Score != nil {
		if s, err := validator.Score(*r.Score); err == nil {
			out.Score = &s
		}
	}
	if r.Date != nil {
		if d, err := scalar.ParseDate(strings.TrimSpace(*r.Date)); err == nil && validator.PerformedOn(d, c.now()) == nil {
			out.Date = &d
		}
	}
	if r.MachineType != nil {
		if m := domain.MachineType(strings.ToUpper(strings.TrimSpace(*r.MachineType))); m.IsValid() {
			out.MachineType = &m // unknown machines stay nil: the user chooses
		}
	}
	for _, g := range r.Genres {
		if gg := domain.Genre(g); gg.IsValid() {
			out.Genres = append(out.Genres, gg)
		}
	}
	for _, i := range r.Issues {
		if ii := domain.Issue(i); ii.IsValid() {
			out.Issues = append(out.Issues, ii)
		}
	}
	out.Genres, _ = validator.Genres(out.Genres)
	out.Issues, _ = validator.Issues(out.Issues)
	if d, err := validator.Details(r.Details); err == nil {
		out.Details = d
	}
	return out, nil
}

func prompt(language string) string {
	lang := "English"
	if language == "ja" {
		lang = "Japanese"
	}
	machines := make([]string, 0, len(domain.Machines))
	for _, m := range domain.Machines {
		machines = append(machines, fmt.Sprintf("%s (%s)", m.Code, m.Label))
	}
	return "This image should show the result screen of a karaoke scoring system. " +
		"Read it and call the tool " + toolName + ". Rules:\n" +
		"- isResultScreen: false if the image is not a karaoke result screen.\n" +
		"- songTitle / artistName: exactly as shown (without a leading ♪).\n" +
		"- songTitleAlt / artistNameAlt: the commonly used romanised or original-script name, or null if unsure.\n" +
		"- score: the total score as a percentage 0-100 with up to 3 decimals (for game-style screens use the accuracy percentage, not the point total), or null.\n" +
		"- date: YYYY-MM-DD only if a date is visible on screen, otherwise null.\n" +
		"- machineType: one of " + strings.Join(machines, ", ") + " based on the branding, or null if you are not sure.\n" +
		"- details: category percentages shown on screen (pitch, stability, rhythm, expression, techniques, articulation), totalPoints and grade if shown; omit what is not shown.\n" +
		"- notes: 1-3 short sentences in " + lang + " about strengths and weaknesses visible on screen, or null.\n" +
		"- genres: 1-2 genres for the song; issues: weaknesses visible on screen, or an empty list."
}

func tool() map[string]any {
	genres := make([]string, len(domain.Genres))
	for i, g := range domain.Genres {
		genres[i] = string(g)
	}
	issues := make([]string, len(domain.Issues))
	for i, is := range domain.Issues {
		issues[i] = string(is)
	}
	machines := make([]any, 0, len(domain.Machines)+1)
	for _, m := range domain.Machines {
		machines = append(machines, string(m.Code))
	}
	machines = append(machines, nil)
	pct := map[string]any{"type": []string{"number", "null"}, "minimum": 0, "maximum": 100}
	str := map[string]any{"type": []string{"string", "null"}}
	return map[string]any{
		"name":        toolName,
		"description": "Record the values read from a karaoke result screen.",
		"input_schema": map[string]any{
			"type":     "object",
			"required": []string{"isResultScreen", "songTitle", "artistName", "score", "date", "machineType", "genres", "issues"},
			"properties": map[string]any{
				"isResultScreen": map[string]any{"type": "boolean"},
				"songTitle":      map[string]any{"type": "string"},
				"artistName":     map[string]any{"type": "string"},
				"songTitleAlt":   str,
				"artistNameAlt":  str,
				"score":          pct,
				"date":           map[string]any{"type": []string{"string", "null"}, "description": "YYYY-MM-DD"},
				"machineType":    map[string]any{"enum": machines},
				"notes":          str,
				"genres":         map[string]any{"type": "array", "items": map[string]any{"enum": genres}, "maxItems": 2},
				"issues":         map[string]any{"type": "array", "items": map[string]any{"enum": issues}},
				"details": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"pitch": pct, "stability": pct, "rhythm": pct, "expression": pct,
						"techniques": pct, "articulation": pct,
						"totalPoints": map[string]any{"type": []string{"integer", "null"}},
						"grade":       str,
					},
				},
			},
		},
	}
}

func nonBlank(s *string) *string {
	if s == nil {
		return nil
	}
	t := domain.CleanText(*s)
	if t == "" {
		return nil
	}
	return &t
}

// truncate cuts at a rune boundary so logs stay valid UTF-8.
func truncate(s string, maxRunes int) string {
	if utf8.RuneCountInString(s) <= maxRunes {
		return s
	}
	r := []rune(s)
	return string(r[:maxRunes]) + "…"
}

// ErrDisabled is returned by services when no extractor is configured.
var ErrDisabled = errors.New("ocr disabled")
