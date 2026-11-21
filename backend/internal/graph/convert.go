package graph

import (
	"github.com/steph-dm/MyUta/backend/internal/config"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/graph/model"
	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/internal/storage"
	"github.com/steph-dm/MyUta/backend/internal/validator"
)

func page(limit, offset *int, defaultLimit int) storage.Page {
	p := storage.Page{Limit: defaultLimit}
	if limit != nil {
		p.Limit = *limit
	}
	if offset != nil {
		p.Offset = *offset
	}
	return p
}

func str(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func boolean(b *bool) bool { return b != nil && *b }

func langPtr(l *model.Language) *string {
	if l == nil {
		return nil
	}
	s := string(*l)
	return &s
}

func songInput(in *model.SongInput) *service.SongInput {
	if in == nil {
		return nil
	}
	return &service.SongInput{
		Title: in.Title, ArtistName: in.ArtistName, Genres: in.Genres,
		YouTubeURL: in.YoutubeURL, GeneratedYoutube: boolean(in.GeneratedYoutube),
	}
}

func reviewInput(in model.ReviewInput) service.ReviewInput {
	key := 0
	if in.KeyChange != nil {
		key = *in.KeyChange
	}
	return service.ReviewInput{
		Date: in.Date, Score: in.Score, MachineType: in.MachineType, KeyChange: key,
		Variant: in.Variant, Issues: in.Issues, Notes: in.Notes, Details: in.Details,
	}
}

func reviewFilter(f *model.ReviewFilter) storage.ReviewFilter {
	if f == nil {
		return storage.ReviewFilter{}
	}
	return storage.ReviewFilter{
		MachineType: f.MachineType, SongID: f.SongID, ArtistID: f.ArtistID, Search: str(f.Search),
		Genres: f.Genres, DateFrom: f.DateFrom, DateTo: f.DateTo,
	}
}

func songFilter(f *model.SongFilter) storage.SongFilter {
	if f == nil {
		return storage.SongFilter{}
	}
	return storage.SongFilter{Search: str(f.Search), Genres: f.Genres, FavoritesOnly: boolean(f.FavoritesOnly), ArtistID: f.ArtistID}
}

func artistFilter(f *model.ArtistFilter) storage.ArtistFilter {
	if f == nil {
		return storage.ArtistFilter{}
	}
	return storage.ArtistFilter{Search: str(f.Search), FavoritesOnly: boolean(f.FavoritesOnly)}
}

func serverInfo(s *service.Services) *model.ServerInfo {
	machines := make([]*domain.Machine, len(domain.Machines))
	for i := range domain.Machines {
		machines[i] = &domain.Machines[i]
	}
	return &model.ServerInfo{
		OcrEnabled:           s.Media.OCREnabled(),
		YoutubeSearchEnabled: s.Media.YouTubeEnabled(),
		MailEnabled:          s.Account.MailEnabled(),
		PasswordMinLength:    validator.PasswordMinChars,
		PasswordMaxBytes:     validator.PasswordMaxBytes,
		MaxUploadBytes:       int(config.MaxUploadBytes),
		MaxImportRows:        config.MaxImportRows,
		Machines:             machines,
	}
}
