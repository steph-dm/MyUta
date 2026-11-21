package service

import (
	"context"
	"errors"
	"io"
	"log/slog"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/ocr"
	"github.com/steph-dm/MyUta/backend/internal/ratelimit"
	"github.com/steph-dm/MyUta/backend/internal/youtube"
)

// MediaService wraps the optional external services.
type MediaService struct{ d Deps }

func (s *MediaService) YouTubeEnabled() bool { return s.d.YouTube != nil }
func (s *MediaService) OCREnabled() bool     { return s.d.OCR != nil }

func (s *MediaService) SearchYouTube(ctx context.Context, artist, song string) ([]*youtube.Result, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if s.d.YouTube == nil {
		return nil, apperror.FeatureDisabled("youtubeSearch")
	}
	if err := s.d.Limiter.Take(ratelimit.YouTubeSearch, id.UserID); err != nil {
		return nil, err
	}
	results, err := s.d.YouTube.Search(ctx, artist, song)
	switch {
	case errors.Is(err, youtube.ErrQuota):
		return nil, apperror.Upstream(apperror.ReasonUpstreamLimited, "Video search is unavailable for now (quota reached)")
	case err != nil:
		slog.ErrorContext(ctx, "youtube search failed", "error", err)
		return nil, apperror.Upstream(apperror.ReasonUpstreamFailed, "Video search failed")
	}
	return results, nil
}

// ExtractReview reads a result screen from an uploaded image.
func (s *MediaService) ExtractReview(ctx context.Context, image io.Reader) (*ocr.Result, error) {
	id, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if s.d.OCR == nil {
		return nil, apperror.FeatureDisabled("ocr")
	}
	if err := s.d.Limiter.Take(ratelimit.OCR, id.UserID); err != nil {
		return nil, err
	}
	data, err := io.ReadAll(io.LimitReader(image, config.MaxUploadBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > config.MaxUploadBytes {
		return nil, apperror.TooLarge(config.MaxUploadBytes)
	}
	if len(data) == 0 {
		return nil, apperror.BadInput(apperror.ReasonInvalidImage, "image", "No image provided")
	}
	lang := "en"
	if u, err := s.d.Store.GetUser(ctx, id.UserID); err == nil && u.Language != nil {
		lang = *u.Language
	}
	return s.d.OCR.Extract(ctx, data, lang)
}
