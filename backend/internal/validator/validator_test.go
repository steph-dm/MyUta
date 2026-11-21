package validator

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/steph-dm/MyUta/backend/internal/apperror"
	"github.com/steph-dm/MyUta/backend/internal/domain"
)

func reason(err error) apperror.Reason {
	var ae *apperror.AppError
	if errors.As(err, &ae) {
		return ae.Reason
	}
	return ""
}

func TestNameCountsCharactersNotBytes(t *testing.T) {
	for _, n := range []string{"たなかたろう", "やまだはなこさん", "東京カラオケ部長", "ｶﾗｵｹだいすき", strings.Repeat("歌", 30)} {
		if _, err := Name(n); err != nil {
			t.Errorf("Name(%q) rejected: %v", n, err)
		}
	}
	if _, err := Name(strings.Repeat("歌", 31)); reason(err) != apperror.ReasonNameLength {
		t.Errorf("31 characters accepted")
	}
	if got, _ := Name("  花子 \u3000 さん "); got != "花子 さん" {
		t.Errorf("name not cleaned: %q", got)
	}
}

func TestTitlesAndNotesCountCharacters(t *testing.T) {
	if _, err := SongTitle(strings.Repeat("あ", 200)); err != nil {
		t.Errorf("200-character Japanese title rejected: %v", err)
	}
	if _, err := SongTitle(strings.Repeat("あ", 201)); reason(err) != apperror.ReasonTitleLength {
		t.Errorf("201 characters accepted")
	}
	notes := strings.Repeat("あ", 1000)
	if _, err := Notes(&notes); err != nil {
		t.Errorf("1000-character Japanese notes rejected: %v", err)
	}
	blank := "   "
	if n, _ := Notes(&blank); n != nil {
		t.Errorf("blank notes not removed")
	}
}

func TestPasswordPolicyIsLengthBased(t *testing.T) {
	for _, p := range []string{"Correct-Horse-Battery-9", "karaoke_night_2026", "correct horse battery staple", "ひみつのパスワードですよね"} {
		if err := Password(p, "password"); err != nil {
			t.Errorf("Password(%q) rejected: %v", p, err)
		}
	}
	if reason(Password("Short-1!", "password")) != apperror.ReasonPasswordTooShort {
		t.Error("short password accepted")
	}
	if reason(Password(strings.Repeat("あ", 25), "password")) != apperror.ReasonPasswordTooLong { // 75 bytes
		t.Error("password over 72 bytes accepted")
	}
}

func TestEmail(t *testing.T) {
	if NormalizeEmail("  Taro@Example.COM ") != "taro@example.com" {
		t.Error("e-mail not normalised")
	}
	for _, ok := range []string{"a@b.cc", "taro.tanaka+karaoke@example.co.jp"} {
		if err := Email(ok); err != nil {
			t.Errorf("Email(%q): %v", ok, err)
		}
	}
	for _, bad := range []string{"a@b", "a b@example.com", "Taro <t@example.com>", "@example.com"} {
		if Email(bad) == nil {
			t.Errorf("Email(%q) accepted", bad)
		}
	}
}

func TestYouTubeURL(t *testing.T) {
	cases := map[string]string{
		"https://www.youtube.com/watch?v=abc12345678":                     "abc12345678",
		"https://www.youtube.com/watch?feature=share&v=abc12345678":       "abc12345678",
		"https://youtu.be/abc12345678?t=10":                               "abc12345678",
		"https://m.youtube.com/watch?v=abc12345678":                       "abc12345678",
		"https://music.youtube.com/watch?v=abc12345678":                   "abc12345678",
		"https://www.youtube.com/shorts/abc12345678":                      "abc12345678",
		"https://www.youtube.com/live/abc12345678":                        "abc12345678",
		"https://www.youtube.com/embed/abc12345678":                       "abc12345678",
		"https://youtube.com.evil.example/watch?v=abc12345678":            "",
		"javascript:alert(document.domain)//youtube.com/watch?v=abc12345": "",
		"www.youtube.com/watch?v=abc12345678":                             "",
		"https://www.youtube.com/watch?v=<script>":                        "",
	}
	for in, want := range cases {
		if got := VideoID(in); got != want {
			t.Errorf("VideoID(%q) = %q, want %q", in, got, want)
		}
	}
	bad := "javascript:alert(1)"
	if _, err := YouTubeURL(&bad); reason(err) != apperror.ReasonInvalidYouTubeURL {
		t.Error("javascript: URL accepted")
	}
}

func TestScoreAndDate(t *testing.T) {
	if s, _ := Score(88.12345); s != 88.123 {
		t.Errorf("score not rounded: %v", s)
	}
	if _, err := Score(100.5); reason(err) != apperror.ReasonScoreRange {
		t.Error("score above 100 accepted")
	}
	now := time.Date(2026, 11, 21, 23, 30, 0, 0, time.UTC)
	tomorrowJST := time.Date(2026, 11, 22, 0, 0, 0, 0, time.UTC)
	if err := PerformedOn(tomorrowJST, now); err != nil {
		t.Errorf("today in Japan rejected: %v", err)
	}
	if reason(PerformedOn(time.Date(2026, 11, 24, 0, 0, 0, 0, time.UTC), now)) != apperror.ReasonDateInFuture {
		t.Error("future date accepted")
	}
	if err := PerformedOn(time.Date(2001, 5, 1, 0, 0, 0, 0, time.UTC), now); err != nil {
		t.Errorf("old date rejected: %v", err)
	}
}

func TestEnumsAndDetails(t *testing.T) {
	g, err := Genres([]domain.Genre{domain.GenrePop, domain.GenrePop, domain.GenreRock})
	if err != nil || len(g) != 2 {
		t.Errorf("genres not de-duplicated: %v %v", g, err)
	}
	if _, err := Issues([]domain.Issue{"NOPE"}); reason(err) != apperror.ReasonInvalidIssue {
		t.Error("invalid issue accepted")
	}
	if reason(MachineType("UTAU", "machineType")) != apperror.ReasonInvalidMachine {
		t.Error("invalid machine accepted")
	}
	if MachineType(domain.MachineKStage, "machineType") != nil {
		t.Error("K-STAGE rejected")
	}
	bad := 120.0
	if _, err := Details(&domain.ScoreDetails{Pitch: &bad}); reason(err) != apperror.ReasonDetailsRange {
		t.Error("breakdown over 100 accepted")
	}
	if d, _ := Details(&domain.ScoreDetails{}); d != nil {
		t.Error("empty breakdown not removed")
	}
	if KeyChange(13) == nil || KeyChange(-12) != nil {
		t.Error("key change bounds wrong")
	}
}
