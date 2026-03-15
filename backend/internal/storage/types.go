package storage

type Genre string

const (
	GenrePop       Genre = "POP"
	GenreRock      Genre = "ROCK"
	GenreHiphop    Genre = "HIPHOP"
	GenreElectro   Genre = "ELECTRO"
	GenreJazz      Genre = "JAZZ"
	GenreClassical Genre = "CLASSICAL"
	GenreFolk      Genre = "FOLK"
	GenreAnime     Genre = "ANIME"
)

func (e Genre) IsValid() bool {
	switch e {
	case GenrePop, GenreRock, GenreHiphop, GenreElectro,
		GenreJazz, GenreClassical, GenreFolk, GenreAnime:
		return true
	}
	return false
}

func (e Genre) String() string { return string(e) }

type Issue string

const (
	IssueReview         Issue = "REVIEW"
	IssueMelody         Issue = "MELODY"
	IssueRhythm         Issue = "RHYTHM"
	IssueRange          Issue = "RANGE"
	IssueBridge         Issue = "BRIDGE"
	IssueChorus         Issue = "CHORUS"
	IssueVerse          Issue = "VERSE"
	IssueIntro          Issue = "INTRO"
	IssueOutro          Issue = "OUTRO"
	IssueSpeed          Issue = "SPEED"
	IssueExpressiveness Issue = "EXPRESSIVENESS"
)

func (e Issue) IsValid() bool {
	switch e {
	case IssueReview, IssueMelody, IssueRhythm, IssueRange,
		IssueBridge, IssueChorus, IssueVerse, IssueIntro,
		IssueOutro, IssueSpeed, IssueExpressiveness:
		return true
	}
	return false
}

func (e Issue) String() string { return string(e) }

type MachineType string

const (
	MachineTypeDAM      MachineType = "DAM"
	MachineTypeJoysound MachineType = "JOYSOUND"
)

func (e MachineType) IsValid() bool {
	switch e {
	case MachineTypeDAM, MachineTypeJoysound:
		return true
	}
	return false
}

func (e MachineType) String() string { return string(e) }
