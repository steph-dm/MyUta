package graph

import (
	"github.com/steph-dm/MyUta/backend/internal/service"
	"github.com/steph-dm/MyUta/backend/pkg/middleware"
	"github.com/steph-dm/MyUta/backend/pkg/youtube"
)

//go:generate go tool gqlgen generate
type Resolver struct {
	AuthService   service.AuthServicer
	UserService   service.UserServicer
	ArtistService service.ArtistServicer
	SongService   service.SongServicer
	ReviewService service.ReviewServicer
	ExportService service.ExportServicer
	YouTube       youtube.Searcher
	OCR           service.OCRExtractor
	RateLimiter   *middleware.RateLimiter
	SecureCookie  bool
}
