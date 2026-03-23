package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Result struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	ChannelTitle string `json:"channelTitle"`
	Duration     string `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

type Searcher interface {
	Search(ctx context.Context, artist, song string) ([]*Result, error)
}

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func NewClient(apiKey string) Searcher {
	if apiKey == "" {
		return nil
	}
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) Search(ctx context.Context, artist, song string) ([]*Result, error) {
	query := artist + " " + song

	searchURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=%s&key=%s",
		url.QueryEscape(query), c.apiKey,
	)

	searchResp, err := c.doGet(ctx, searchURL)
	if err != nil {
		return nil, fmt.Errorf("can't search youtube: %w", err)
	}

	var searchData struct {
		Items []struct {
			ID struct {
				VideoID string `json:"videoId"`
			} `json:"id"`
		} `json:"items"`
	}
	defer func() { _ = searchResp.Body.Close() }()
	if err := json.NewDecoder(searchResp.Body).Decode(&searchData); err != nil {
		return nil, fmt.Errorf("can't decode search response: %w", err)
	}

	if len(searchData.Items) == 0 {
		return []*Result{}, nil
	}

	ids := make([]string, len(searchData.Items))
	for i, item := range searchData.Items {
		ids[i] = item.ID.VideoID
	}

	videosURL := fmt.Sprintf(
		"https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=%s&key=%s",
		strings.Join(ids, ","), c.apiKey,
	)

	videosResp, err := c.doGet(ctx, videosURL)
	if err != nil {
		return nil, fmt.Errorf("can't get video details: %w", err)
	}
	defer func() { _ = videosResp.Body.Close() }()

	var videosData struct {
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

	if err := json.NewDecoder(videosResp.Body).Decode(&videosData); err != nil {
		return nil, fmt.Errorf("can't decode video details: %w", err)
	}

	results := make([]*Result, 0, len(videosData.Items))
	for _, v := range videosData.Items {
		results = append(results, &Result{
			VideoID:      v.ID,
			Title:        v.Snippet.Title,
			ChannelTitle: v.Snippet.ChannelTitle,
			Duration:     parseISODuration(v.ContentDetails.Duration),
			ThumbnailURL: v.Snippet.Thumbnails.Default.URL,
		})
	}

	return results, nil
}

func (c *Client) doGet(ctx context.Context, rawURL string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("can't create request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("can't execute request: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return resp, nil
}

// parseISODuration converts ISO 8601 duration (e.g. "PT4M33S") to "4:33".
var isoDurationRe = regexp.MustCompile(`PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?`)

func parseISODuration(iso string) string {
	m := isoDurationRe.FindStringSubmatch(iso)
	if m == nil {
		return "0:00"
	}

	h, _ := strconv.Atoi(m[1])
	mins, _ := strconv.Atoi(m[2])
	s, _ := strconv.Atoi(m[3])

	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, mins, s)
	}
	return fmt.Sprintf("%d:%02d", mins, s)
}
