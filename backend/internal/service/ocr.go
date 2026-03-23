package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/storage"
)

type OCRExtractor interface {
	ExtractReview(ctx context.Context, imageBase64 string) (*ExtractedReview, error)
}

type ClaudeOCR struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

const defaultAnthropicModel = "claude-haiku-4-5-20251001"

func NewClaudeOCR(apiKey, model string) OCRExtractor {
	if apiKey == "" {
		return nil
	}
	if strings.TrimSpace(model) == "" {
		model = defaultAnthropicModel
	}
	return &ClaudeOCR{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

var (
	validGenres = map[string]bool{
		"POP": true, "ROCK": true, "HIPHOP": true, "ELECTRO": true,
		"JAZZ": true, "CLASSICAL": true, "FOLK": true, "ANIME": true,
	}
	validIssues = map[string]bool{
		"REVIEW": true, "MELODY": true, "RHYTHM": true, "RANGE": true,
		"BRIDGE": true, "CHORUS": true, "VERSE": true, "INTRO": true,
		"OUTRO": true, "SPEED": true, "EXPRESSIVENESS": true,
	}
)

const extractionPrompt = `You are analyzing a Japanese karaoke machine score screen screenshot.
First, determine if this is a DAM or JOYSOUND screen based on the branding visible on screen.

Extract the following information and return ONLY valid JSON (no markdown, no code blocks):

{
  "songTitle": "the song title",
  "artistName": "the artist name",
  "songTitleAlt": "alternate name or null",
  "artistNameAlt": "alternate name or null",
  "score": 80.761,
  "date": "2026-02-14",
  "machineType": "DAM",
  "notes": "concise English note about strengths and weaknesses",
  "genres": ["ANIME"],
  "issues": []
}

Rules:
- songTitle: The song title. Return it exactly as shown on screen.
- artistName: The artist name. Return it exactly as shown. Remove any ♪ prefix.
- songTitleAlt: If the song title is in Japanese/Korean/Chinese, provide the commonly known English or romanized name. If the title is already in English/romaji, set to null.
- artistNameAlt: If the artist name is in Japanese/Korean/Chinese, provide the commonly known English or romanized name. If the name is already in English/romaji, provide the Japanese/Korean/Chinese name instead. If you're not sure, set to null.
- score: The total score as a number with up to 3 decimal places.
- date: The date visible on screen, formatted as YYYY-MM-DD.
- machineType: "DAM" or "JOYSOUND" based on branding visible on screen.
- notes: Write a concise English-only note (1-3 sentences max) summarizing the performance. If no useful info visible, set to null.
- genres: Infer the song's genre. Use ONLY values from: ["POP","ROCK","HIPHOP","ELECTRO","JAZZ","CLASSICAL","FOLK","ANIME"]. Return 1-2 genres max.
- issues: Map any weaknesses to issue tags. Use ONLY values from: ["REVIEW","MELODY","RHYTHM","RANGE","BRIDGE","CHORUS","VERSE","INTRO","OUTRO","SPEED","EXPRESSIVENESS"]. If no weaknesses, return [].

Return ONLY the JSON object, nothing else.`

func (c *ClaudeOCR) ExtractReview(ctx context.Context, imageBase64 string) (*ExtractedReview, error) {
	mediaType, err := detectMediaType(imageBase64)
	if err != nil {
		return nil, err
	}
	cleanBase64 := imageBase64
	if idx := strings.Index(imageBase64, ","); idx != -1 {
		cleanBase64 = imageBase64[idx+1:]
	}

	body := map[string]any{
		"model":      c.model,
		"max_tokens": 1024,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{
						"type": "image",
						"source": map[string]any{
							"type":       "base64",
							"media_type": mediaType,
							"data":       cleanBase64,
						},
					},
					{
						"type": "text",
						"text": extractionPrompt,
					},
				},
			},
		},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("can't marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("can't create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OCR service unavailable")
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("OCR service rate limited, try again later")
	}
	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("OCR service configuration error")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OCR service returned an error")
	}

	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("can't decode Claude response: %w", err)
	}

	var text string
	for _, block := range apiResp.Content {
		if block.Type == "text" {
			text = strings.TrimSpace(block.Text)
			break
		}
	}

	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var parsed ExtractedReview
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, fmt.Errorf("can't parse Claude response: %s", text[:min(len(text), 200)])
	}

	if parsed.SongTitle == "" || parsed.ArtistName == "" || parsed.Date == "" {
		return nil, fmt.Errorf("missing required fields in extracted data")
	}

	parsed.Score = math.Round(parsed.Score*1000) / 1000

	if parsed.MachineType != storage.MachineTypeDAM && parsed.MachineType != storage.MachineTypeJoysound {
		parsed.MachineType = storage.MachineTypeJoysound
	}

	filtered := make([]storage.Genre, 0, len(parsed.Genres))
	for _, g := range parsed.Genres {
		if validGenres[string(g)] {
			filtered = append(filtered, g)
		}
	}
	if len(filtered) == 0 {
		filtered = []storage.Genre{storage.GenrePop}
	}
	parsed.Genres = filtered

	seen := make(map[storage.Issue]bool)
	filteredIssues := make([]storage.Issue, 0, len(parsed.Issues))
	for _, i := range parsed.Issues {
		if validIssues[string(i)] && !seen[i] {
			seen[i] = true
			filteredIssues = append(filteredIssues, i)
		}
	}
	parsed.Issues = filteredIssues

	if parsed.Notes != nil && strings.TrimSpace(*parsed.Notes) == "" {
		parsed.Notes = nil
	}
	if parsed.ArtistNameAlt != nil && strings.TrimSpace(*parsed.ArtistNameAlt) == "" {
		parsed.ArtistNameAlt = nil
	}
	if parsed.SongTitleAlt != nil && strings.TrimSpace(*parsed.SongTitleAlt) == "" {
		parsed.SongTitleAlt = nil
	}

	return &parsed, nil
}

func detectMediaType(base64 string) (string, error) {
	switch {
	case strings.HasPrefix(base64, "data:image/png"):
		return "image/png", nil
	case strings.HasPrefix(base64, "data:image/jpeg"),
		strings.HasPrefix(base64, "data:image/jpg"):
		return "image/jpeg", nil
	case strings.HasPrefix(base64, "data:image/webp"):
		return "image/webp", nil
	case strings.HasPrefix(base64, "data:image/gif"):
		return "image/gif", nil
	case strings.HasPrefix(base64, "data:image/"):
		return "image/jpeg", nil
	default:
		return "", fmt.Errorf("can't detect media type: unsupported format, expected png/jpeg/webp/gif")
	}
}
