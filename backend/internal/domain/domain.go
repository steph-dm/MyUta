// Package domain holds the vocabulary shared by every layer: genres, issues,
// machines, score details and the rules for comparing names.
package domain

import (
	"slices"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// Genre of a song.
type Genre string

const (
	GenreAnime     Genre = "ANIME"
	GenreClassical Genre = "CLASSICAL"
	GenreElectro   Genre = "ELECTRO"
	GenreFolk      Genre = "FOLK"
	GenreHiphop    Genre = "HIPHOP"
	GenreJazz      Genre = "JAZZ"
	GenrePop       Genre = "POP"
	GenreRock      Genre = "ROCK"
)

// Genres lists every valid genre. It is the only list in the backend.
var Genres = []Genre{GenreAnime, GenreClassical, GenreElectro, GenreFolk, GenreHiphop, GenreJazz, GenrePop, GenreRock}

func (g Genre) IsValid() bool { return slices.Contains(Genres, g) }

// Issue is a weakness the singer tags on a review.
type Issue string

const (
	IssueBridge         Issue = "BRIDGE"
	IssueChorus         Issue = "CHORUS"
	IssueExpressiveness Issue = "EXPRESSIVENESS"
	IssueIntro          Issue = "INTRO"
	IssueMelody         Issue = "MELODY"
	IssueOutro          Issue = "OUTRO"
	IssueRange          Issue = "RANGE"
	IssueReview         Issue = "REVIEW"
	IssueRhythm         Issue = "RHYTHM"
	IssueSpeed          Issue = "SPEED"
	IssueVerse          Issue = "VERSE"
)

// Issues lists every valid issue.
var Issues = []Issue{
	IssueBridge, IssueChorus, IssueExpressiveness, IssueIntro, IssueMelody, IssueOutro,
	IssueRange, IssueReview, IssueRhythm, IssueSpeed, IssueVerse,
}

func (i Issue) IsValid() bool { return slices.Contains(Issues, i) }

// MachineType identifies a scoring system. Scores from different machines are
// never mixed in averages or charts.
type MachineType string

const (
	MachineDAM      MachineType = "DAM"
	MachineJoysound MachineType = "JOYSOUND"
	MachineKStage   MachineType = "KSTAGE"
)

// MachineKind tells venue machines from home/online ones.
type MachineKind string

const (
	MachineKindVenue MachineKind = "VENUE"
	MachineKindHome  MachineKind = "HOME"
)

// Machine describes one scoring system.
type Machine struct {
	Code  MachineType
	Label string
	Kind  MachineKind
}

// Machines is the registry of supported machines, in display order. The
// database table machine_types holds the same rows (see docs/adding-a-machine.md).
var Machines = []Machine{
	{Code: MachineDAM, Label: "DAM", Kind: MachineKindVenue},
	{Code: MachineJoysound, Label: "JOYSOUND", Kind: MachineKindVenue},
	{Code: MachineKStage, Label: "K-STAGE", Kind: MachineKindHome},
}

func (m MachineType) IsValid() bool {
	return slices.ContainsFunc(Machines, func(x Machine) bool { return x.Code == m })
}

// ScoreDetails is the optional breakdown shown on a result screen. Values are
// percentages (0-100) except TotalPoints and Grade.
type ScoreDetails struct {
	Pitch        *float64 `json:"pitch,omitempty"`
	Stability    *float64 `json:"stability,omitempty"`
	Rhythm       *float64 `json:"rhythm,omitempty"`
	Expression   *float64 `json:"expression,omitempty"`
	Techniques   *float64 `json:"techniques,omitempty"`
	Articulation *float64 `json:"articulation,omitempty"`
	TotalPoints  *int     `json:"totalPoints,omitempty"`
	Grade        *string  `json:"grade,omitempty"`
}

// Percentages returns the percentage fields keyed by name, for validation.
func (d *ScoreDetails) Percentages() map[string]*float64 {
	return map[string]*float64{
		"pitch": d.Pitch, "stability": d.Stability, "rhythm": d.Rhythm,
		"expression": d.Expression, "techniques": d.Techniques, "articulation": d.Articulation,
	}
}

// IsEmpty reports whether no field is set.
func (d *ScoreDetails) IsEmpty() bool {
	if d == nil {
		return true
	}
	for _, v := range d.Percentages() {
		if v != nil {
			return false
		}
	}
	return d.TotalPoints == nil && (d.Grade == nil || strings.TrimSpace(*d.Grade) == "")
}

// CleanText trims a display string and collapses runs of white space.
func CleanText(s string) string {
	return strings.Join(strings.FieldsFunc(s, unicode.IsSpace), " ")
}

// NormalizeKey returns the comparison key for artist names and song titles:
// Unicode NFKC (full-width -> half-width), collapsed white space, lower case.
// It must stay in line with the SQL function myuta_key() (migration 005).
func NormalizeKey(s string) string {
	return strings.ToLower(CleanText(norm.NFKC.String(s)))
}

// SearchKey is NormalizeKey with katakana folded to hiragana, so that a search
// for あいどる finds アイドル. It matches the SQL function myuta_search_key().
func SearchKey(s string) string {
	r := []rune(NormalizeKey(s))
	for i, c := range r {
		if c >= 0x30A1 && c <= 0x30F6 {
			r[i] = c - 0x60
		}
	}
	return string(r)
}
