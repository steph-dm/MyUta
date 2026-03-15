package storage

type ExportReview struct {
	Date        string   `json:"date"`
	Score       float64  `json:"score"`
	MachineType string   `json:"machineType"`
	Issues      []string `json:"issues"`
	Notes       *string  `json:"notes"`
	Song        string   `json:"song"`
	Artist      string   `json:"artist"`
	Genres      []string `json:"genres"`
	YouTubeURL  *string  `json:"youtubeUrl"`
}

type ExportFavorite struct {
	Song       string   `json:"song"`
	Artist     string   `json:"artist"`
	Genres     []string `json:"genres"`
	YouTubeURL *string  `json:"youtubeUrl"`
}

type DashboardStats struct {
	TotalReviews      int
	DAMAvgScore       *float64
	JoysoundAvgScore  *float64
	SessionsThisMonth int
	SessionsPrevMonth int
	MostPracticed     *MostPracticedSong
	CommonIssues      []*IssueStat
}

type MostPracticedSong struct {
	SongID     string
	Title      string
	ArtistName string
	Count      int
}

type IssueStat struct {
	Issue Issue
	Count int
}

type ImportResult struct {
	ReviewsImported int
	ReviewsSkipped  int
	Errors          []string
}
