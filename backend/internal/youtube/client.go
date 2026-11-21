// Package youtube searches YouTube Data API v3 for song videos.
package youtube

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"

	"github.com/steph-dm/MyUta/backend/internal/domain"
)

const apiBase = "https://www.googleapis.com/youtube/v3"

// Result is one video.
type Result struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	ChannelTitle string `json:"channelTitle"`
	Duration     string `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

// Searcher finds videos for a song. A nil Searcher means search is disabled.
type Searcher interface {
	Search(ctx context.Context, artist, song string) ([]*Result, error)
}

// ErrQuota is returned when YouTube refuses the request because of quota.
var ErrQuota = errors.New("youtube quota exceeded")

type Client struct {
	apiKey string
	http   *http.Client
	cache  *expirable.LRU[string, []*Result]
	base   string
}

// NewClient returns nil when no key is configured.
func NewClient(apiKey string) Searcher {
	if apiKey == "" {
		return nil
	}
	return &Client{
		apiKey: apiKey,
		http:   &http.Client{Timeout: 10 * time.Second},
		// search.list costs 100 quota units; identical searches are answered from memory.
		cache: expirable.NewLRU[string, []*Result](1000, nil, 24*time.Hour),
		base:  apiBase,
	}
}

func (c *Client) Search(ctx context.Context, artist, song string) ([]*Result, error) {
	query := strings.TrimSpace(domain.CleanText(artist) + " " + domain.CleanText(song))
	cacheKey := domain.NormalizeKey(query)
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached, nil
	}

	params := url.Values{
		"part":            {"snippet"},
		"type":            {"video"},
		"videoEmbeddable": {"true"}, // results are played in an embedded player
		"maxResults":      {"5"},
		"q":               {query},
	}
	var search struct {
		Items []struct {
			ID struct {
				VideoID string `json:"videoId"`
			} `json:"id"`
		} `json:"items"`
	}
	if err := c.get(ctx, "/search", params, &search); err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(search.Items))
	for _, it := range search.Items {
		if it.ID.VideoID != "" {
			ids = append(ids, it.ID.VideoID)
		}
	}
	if len(ids) == 0 {
		c.cache.Add(cacheKey, []*Result{})
		return []*Result{}, nil
	}

	var videos struct {
		Items []struct {
			ID      string `json:"id"`
			Snippet struct {
				Title        string `json:"title"`
				ChannelTitle string `json:"channelTitle"`
				Thumbnails   struct {
					Default struct {
						URL string `json:"url"`
					} `json:"default"`
				} `json:"thumbnails"`
			} `json:"snippet"`
			ContentDetails struct {
				Duration string `json:"duration"`
			} `json:"contentDetails"`
		} `json:"items"`
	}
	if err := c.get(ctx, "/videos", url.Values{"part": {"contentDetails,snippet"}, "id": {strings.Join(ids, ",")}}, &videos); err != nil {
		return nil, err
	}
	byID := make(map[string]*Result, len(videos.Items))
	for _, v := range videos.Items {
		byID[v.ID] = &Result{
			VideoID:      v.ID,
			Title:        v.Snippet.Title,
			ChannelTitle: v.Snippet.ChannelTitle,
			Duration:     FormatDuration(v.ContentDetails.Duration),
			ThumbnailURL: v.Snippet.Thumbnails.Default.URL,
		}
	}
	// keep the relevance order of the search, not the order of the details call
	results := make([]*Result, 0, len(ids))
	for _, id := range ids {
		if r, ok := byID[id]; ok {
			results = append(results, r)
		}
	}
	c.cache.Add(cacheKey, results)
	return results, nil
}

func (c *Client) get(ctx context.Context, path string, params url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+path+"?"+params.Encode(), nil)
	if err != nil {
		return fmt.Errorf("youtube request: %w", err)
	}
	// The key goes in a header, never in the URL: URLs end up in error messages and logs.
	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	resp, err := c.http.Do(req)
	if err != nil {
		var uerr *url.Error
		if errors.As(err, &uerr) {
			err = uerr.Err // drop the URL from the message
		}
		return fmt.Errorf("youtube %s: %w", path, err)
	}
	defer func() { _ = resp.Body.Close() }()
	switch {
	case resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests:
		return ErrQuota
	case resp.StatusCode != http.StatusOK:
		return fmt.Errorf("youtube %s: status %d", path, resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("youtube %s: decode: %w", path, err)
	}
	return nil
}

var isoDurationRe = regexp.MustCompile(`^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$`)

// FormatDuration converts ISO 8601 ("PT4M33S", "P1DT2H") to "4:33" / "26:00:00".
// Live streams report "P0D" and are shown as "LIVE".
func FormatDuration(iso string) string {
	m := isoDurationRe.FindStringSubmatch(iso)
	if m == nil {
		return ""
	}
	n := func(s string) int { v, _ := strconv.Atoi(s); return v }
	days, h, mins, s := n(m[1]), n(m[2]), n(m[3]), n(m[4])
	h += days * 24
	if h == 0 && mins == 0 && s == 0 {
		return "LIVE"
	}
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, mins, s)
	}
	return fmt.Sprintf("%d:%02d", mins, s)
}
