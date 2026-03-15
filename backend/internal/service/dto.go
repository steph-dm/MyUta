package service

import "github.com/steph-dm/MyUta/backend/internal/storage"

type ExtractedReview struct {
	SongTitle     string              `json:"songTitle"`
	ArtistName    string              `json:"artistName"`
	SongTitleAlt  *string             `json:"songTitleAlt"`
	ArtistNameAlt *string             `json:"artistNameAlt"`
	Score         float64             `json:"score"`
	Date          string              `json:"date"`
	MachineType   storage.MachineType `json:"machineType"`
	Notes         *string             `json:"notes"`
	Genres        []storage.Genre     `json:"genres"`
	Issues        []storage.Issue     `json:"issues"`
}
