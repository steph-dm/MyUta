//go:build integration

package app_test

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/steph-dm/MyUta/backend/internal/app"
	"github.com/steph-dm/MyUta/backend/internal/domain"
	"github.com/steph-dm/MyUta/backend/internal/ocr"
	tu "github.com/steph-dm/MyUta/backend/internal/testutil"
)

const pw = "Correct-Horse-Battery-9"

func register(t *testing.T, c *tu.Client, email, name string) string {
	t.Helper()
	r := tu.MustOK(t, c.Do(`mutation($in: RegisterInput!){ register(input:$in){ id email name } }`,
		map[string]any{"in": map[string]any{"email": email, "password": pw, "name": name}}))
	return r.String("register", "id")
}

const logReview = `mutation($song: SongRefInput!, $review: ReviewInput!){
  logReview(song:$song, review:$review){ id date score machineType issues notes isPersonalBest song { id title artist { id name } } } }`

func newSong(title, artist string) map[string]any {
	return map[string]any{"song": map[string]any{"title": title, "artistName": artist, "genres": []string{"ANIME"}}}
}

func take(date string, score float64, machine string) map[string]any {
	return map[string]any{"date": date, "score": score, "machineType": machine, "issues": []string{}}
}

func TestAccountFlows(t *testing.T) {
	mailbox := &tu.Mailbox{}
	srv, _ := tu.Server(t, &app.Options{Mailer: mailbox})
	c := tu.NewClient(t, srv)

	if r := c.Do(`{ me { id } }`, nil); r.Get("me") != nil {
		t.Fatal("anonymous me is not null")
	}
	register(t, c, "  Taro@Example.COM ", "  やまだはなこさん ")
	me := tu.MustOK(t, c.Do(`{ me { email name emailVerified } }`, nil))
	if me.String("me", "email") != "taro@example.com" || me.String("me", "name") != "やまだはなこさん" {
		t.Fatalf("registration not normalised: %+v", me.Data)
	}
	if !strings.Contains(mailbox.Last().Text, "/verify-email?token=") {
		t.Fatal("no verification e-mail")
	}

	other := tu.NewClient(t, srv)
	if r := other.Do(`mutation($in: RegisterInput!){ register(input:$in){ id } }`, map[string]any{"in": map[string]any{
		"email": "TARO@example.com", "password": pw, "name": "x"}}); r.Reason() != "EMAIL_TAKEN" {
		t.Fatalf("same address in other case: %+v", r.Errors)
	}
	if r := other.Do(`mutation{ login(email:"taro@EXAMPLE.com", password:"Correct-Horse-Battery-9"){ id } }`, nil); len(r.Errors) > 0 {
		t.Fatalf("login with other case: %+v", r.Errors)
	}

	// verify the address with the e-mailed link
	link, _ := url.Parse(strings.Fields(mailbox.Last().Text[strings.Index(mailbox.Last().Text, "http"):])[0])
	tu.MustOK(t, c.Do(`mutation($t: String!){ verifyEmail(token:$t) }`, map[string]any{"t": link.Query().Get("token")}))
	if v, _ := c.Do(`{ me { emailVerified } }`, nil).Get("me", "emailVerified").(bool); !v {
		t.Fatal("address not verified")
	}

	// password change keeps this session, ends the other one
	tu.MustOK(t, c.Do(`mutation{ changePassword(currentPassword:"Correct-Horse-Battery-9", newPassword:"Another-long-password-1") }`, nil))
	if c.Do(`{ me { id } }`, nil).Get("me") == nil {
		t.Fatal("password change logged the user out")
	}
	if other.Do(`{ me { id } }`, nil).Get("me") != nil {
		t.Fatal("other session survived the password change")
	}
	if r := c.Do(`mutation{ changePassword(currentPassword:"wrong-password-xx", newPassword:"Another-long-password-2") }`, nil); r.Reason() != "WRONG_PASSWORD" {
		t.Fatalf("wrong current password: %+v", r.Errors)
	}

	// password reset
	anon := tu.NewClient(t, srv)
	tu.MustOK(t, anon.Do(`mutation{ requestPasswordReset(email:"nobody@example.com") }`, nil)) // no enumeration
	tu.MustOK(t, anon.Do(`mutation{ requestPasswordReset(email:"TARO@example.com") }`, nil))
	text := mailbox.Last().Text
	link, _ = url.Parse(strings.Fields(text[strings.Index(text, "http"):])[0])
	token := link.Query().Get("token")
	tu.MustOK(t, anon.Do(`mutation($t: String!){ resetPassword(token:$t, newPassword:"Reset-password-2026") }`, map[string]any{"t": token}))
	if r := anon.Do(`mutation($t: String!){ resetPassword(token:$t, newPassword:"Reset-password-2027") }`, map[string]any{"t": token}); r.Reason() != "INVALID_TOKEN" {
		t.Fatalf("token reused: %+v", r.Errors)
	}
	if c.Do(`{ me { id } }`, nil).Get("me") != nil {
		t.Fatal("sessions survived the password reset")
	}

	// logout revokes the session server-side
	tu.MustOK(t, c.Do(`mutation{ login(email:"taro@example.com", password:"Reset-password-2026"){ id } }`, nil))
	stolen := tu.NewClient(t, srv)
	u, _ := url.Parse(srv.URL)
	stolen.HTTP.Jar.SetCookies(u, c.HTTP.Jar.Cookies(u))
	tu.MustOK(t, c.Do(`mutation{ logout }`, nil))
	if stolen.Do(`{ me { id } }`, nil).Get("me") != nil {
		t.Fatal("copied cookie still valid after logout")
	}

	// e-mail change needs the password and is confirmed by e-mail
	tu.MustOK(t, c.Do(`mutation{ login(email:"taro@example.com", password:"Reset-password-2026"){ id } }`, nil))
	if r := c.Do(`mutation{ changeEmail(newEmail:"new@example.com", password:"nope-nope-nope"){ verificationSent } }`, nil); r.Reason() != "WRONG_PASSWORD" {
		t.Fatalf("e-mail change without password: %+v", r.Errors)
	}
	r := tu.MustOK(t, c.Do(`mutation{ changeEmail(newEmail:"New@Example.com", password:"Reset-password-2026"){ verificationSent user { email } } }`, nil))
	if r.Get("changeEmail", "verificationSent") != true || r.String("changeEmail", "user", "email") != "taro@example.com" {
		t.Fatalf("e-mail changed before confirmation: %+v", r.Data)
	}
	if mailbox.Last().To != "new@example.com" {
		t.Fatalf("confirmation sent to %s", mailbox.Last().To)
	}

	// profile
	r = tu.MustOK(t, c.Do(`mutation{ updateProfile(input:{name:" 花子 ", defaultMachineType:KSTAGE, language:ja}){ name defaultMachineType language } }`, nil))
	if r.String("updateProfile", "name") != "花子" || r.String("updateProfile", "defaultMachineType") != "KSTAGE" {
		t.Fatalf("profile: %+v", r.Data)
	}
	r = tu.MustOK(t, c.Do(`mutation{ updateProfile(input:{defaultMachineType:null}){ defaultMachineType language } }`, nil))
	if r.Get("updateProfile", "defaultMachineType") != nil || r.String("updateProfile", "language") != "ja" {
		t.Fatalf("clearing the default machine: %+v", r.Data)
	}

	// delete account
	if r := c.Do(`mutation{ deleteAccount(password:"wrong-wrong-wrong") }`, nil); r.Reason() != "WRONG_PASSWORD" {
		t.Fatalf("delete without password: %+v", r.Errors)
	}
	tu.MustOK(t, c.Do(`mutation{ deleteAccount(password:"Reset-password-2026") }`, nil))
	if c.Do(`{ me { id } }`, nil).Get("me") != nil {
		t.Fatal("deleted account still signed in")
	}
}

func TestReviewsSongsArtists(t *testing.T) {
	srv, _ := tu.Server(t, nil)
	c := tu.NewClient(t, srv)
	register(t, c, "a@example.com", "a")

	// several takes per day, per machine (F-01); one transaction creates artist + song
	var songID string
	for _, m := range []string{"DAM", "DAM", "JOYSOUND", "KSTAGE"} {
		r := tu.MustOK(t, c.Do(logReview, map[string]any{"song": newSong("アイドル", " ＹＯＡＳＯＢＩ "), "review": take("2026-11-20", 88.12345, m)}))
		songID = r.String("logReview", "song", "id")
		if r.String("logReview", "date") != "2026-11-20" || r.Number("logReview", "score") != 88.123 {
			t.Fatalf("take stored wrong: %+v", r.Data)
		}
	}
	r := tu.MustOK(t, c.Do(logReview, map[string]any{"song": newSong("アイドル", "yoasobi"), "review": take("2026-11-21", 91, "DAM")}))
	if r.String("logReview", "song", "id") != songID {
		t.Fatal("same song under another spelling created a new song")
	}

	// failed take leaves nothing behind (F-06)
	bad := take("2099-01-01", 50, "DAM")
	if r := c.Do(logReview, map[string]any{"song": newSong("新曲", "新アーティスト"), "review": bad}); r.Reason() != "DATE_IN_FUTURE" {
		t.Fatalf("future date: %+v", r.Errors)
	}
	if n := c.Do(`{ artists { totalCount } }`, nil).Number("artists", "totalCount"); n != 1 {
		t.Fatalf("failed take created an artist (%v artists)", n)
	}

	// lists include songs and artists by owner (F-05), search ignores width and kana
	r = tu.MustOK(t, c.Do(`{ songs(filter:{search:"あいどる"}){ totalCount items { reviewCount isFavorite } } artists(filter:{search:"yoasobi"}){ items { name songCount reviewCount } } }`, nil))
	if r.Number("songs", "totalCount") != 1 || r.Number("songs", "items", 0, "reviewCount") != 5 || r.Number("artists", "items", 0, "reviewCount") != 5 {
		t.Fatalf("lists: %+v", r.Data)
	}

	// filters, sorting, pagination
	r = tu.MustOK(t, c.Do(`{ reviews(filter:{machineType:DAM}, sort:SCORE_DESC, limit:2){ totalCount items { score isPersonalBest } } }`, nil))
	if r.Number("reviews", "totalCount") != 3 || r.Number("reviews", "items", 0, "score") != 91 || r.Get("reviews", "items", 0, "isPersonalBest") != true || r.Get("reviews", "items", 1, "isPersonalBest") != false {
		t.Fatalf("filtered reviews: %+v", r.Data)
	}
	if r := c.Do(`{ reviews(limit:500){ totalCount } }`, nil); r.Reason() != "PAGINATION" {
		t.Fatalf("page size not limited: %+v", r.Errors)
	}

	// goals
	r = tu.MustOK(t, c.Do(`mutation($s: ID!){ setSongGoal(songId:$s, machineType:DAM, targetScore:90){ goals { targetScore bestScore achieved } } }`, map[string]any{"s": songID}))
	if r.Get("setSongGoal", "goals", 0, "achieved") != true {
		t.Fatalf("goal: %+v", r.Data)
	}

	// favourites are idempotent and race-free (F-04g)
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Do(`mutation($s: ID!){ setSongFavorite(songId:$s, favorite:true){ isFavorite } }`, map[string]any{"s": songID})
		}()
	}
	wg.Wait()
	if n := len(c.Do(`{ myFavoriteSongs { id } }`, nil).Get("myFavoriteSongs").([]any)); n != 1 {
		t.Fatalf("favourite count %d", n)
	}

	// renaming onto an existing artist offers a merge (F-15)
	other := tu.MustOK(t, c.Do(logReview, map[string]any{"song": newSong("うっせぇわ", "Ado"), "review": take("2026-11-19", 80, "DAM")}))
	adoID := other.String("logReview", "song", "artist", "id")
	otherSong := other.String("logReview", "song", "id")
	yoasobiID := r.String("setSongGoal", "id")
	_ = yoasobiID
	rr := c.Do(`mutation($id: ID!){ updateArtist(id:$id, name:"YOASOBI"){ id } }`, map[string]any{"id": adoID})
	if rr.Reason() != "ARTIST_EXISTS" || rr.Errors[0].Extensions["existingArtistId"] == nil {
		t.Fatalf("rename conflict: %+v", rr.Errors)
	}
	target := rr.Errors[0].Extensions["existingArtistId"].(string)

	// duplicate title on update (F-04a)
	if r := c.Do(`mutation($id: ID!){ updateSong(id:$id, input:{title:"アイドル", artistName:"YOASOBI", genres:[POP]}){ id } }`, map[string]any{"id": otherSong}); r.Reason() != "DUPLICATE_SONG" {
		t.Fatalf("duplicate title: %+v", r.Errors)
	}

	r = tu.MustOK(t, c.Do(`mutation($s: ID!, $t: ID!){ mergeArtists(sourceId:$s, targetId:$t){ songCount reviewCount } }`, map[string]any{"s": adoID, "t": target}))
	if r.Number("mergeArtists", "songCount") != 2 || r.Number("mergeArtists", "reviewCount") != 6 {
		t.Fatalf("merge: %+v", r.Data)
	}

	// delete a song, then the artist (cascade)
	tu.MustOK(t, c.Do(`mutation($id: ID!){ deleteSong(id:$id) }`, map[string]any{"id": otherSong}))
	tu.MustOK(t, c.Do(`mutation($id: ID!){ deleteArtist(id:$id) }`, map[string]any{"id": target}))
	r = tu.MustOK(t, c.Do(`{ dashboardStats { totalReviews totalSongs totalArtists machineStats { machineType } } }`, nil))
	if r.Number("dashboardStats", "totalReviews") != 0 || r.Number("dashboardStats", "totalArtists") != 0 {
		t.Fatalf("cascade: %+v", r.Data)
	}
}

func TestTenantIsolation(t *testing.T) {
	srv, _ := tu.Server(t, nil)
	alice, bob := tu.NewClient(t, srv), tu.NewClient(t, srv)
	register(t, alice, "alice@example.com", "alice")
	register(t, bob, "bob@example.com", "bob")
	r := tu.MustOK(t, alice.Do(logReview, map[string]any{"song": newSong("糸", "中島みゆき"), "review": take("2026-11-01", 90, "DAM")}))
	songID, reviewID := r.String("logReview", "song", "id"), r.String("logReview", "id")
	artistID := r.String("logReview", "song", "artist", "id")

	if r := bob.Do(`query($id: ID!){ song(id:$id){ id } review(id:"`+reviewID+`"){ id } }`, map[string]any{"id": songID}); r.Get("song") != nil || r.Get("review") != nil {
		t.Fatal("bob can read alice's data")
	}
	for _, q := range []string{
		`mutation($id: ID!){ deleteSong(id:$id) }`,
		`mutation($id: ID!){ setSongFavorite(songId:$id, favorite:true){ id } }`,
		`mutation($id: ID!){ setSongGoal(songId:$id, machineType:DAM, targetScore:95){ id } }`,
		`mutation($id: ID!){ updateSong(id:$id, input:{title:"x", artistName:"y", genres:[]}){ id } }`,
	} {
		if r := bob.Do(q, map[string]any{"id": songID}); r.Code() != "NOT_FOUND" {
			t.Errorf("%s: %+v", q, r.Errors)
		}
	}
	if r := bob.Do(`mutation($id: ID!){ deleteArtist(id:$id) }`, map[string]any{"id": artistID}); r.Code() != "NOT_FOUND" {
		t.Errorf("delete artist: %+v", r.Errors)
	}
	if r := bob.Do(logReview, map[string]any{"song": map[string]any{"songId": songID}, "review": take("2026-11-02", 1, "DAM")}); r.Code() != "NOT_FOUND" {
		t.Errorf("review on another user's song: %+v", r.Errors)
	}
	if n := bob.Do(`mutation($ids: [ID!]!){ deleteReviews(ids:$ids) }`, map[string]any{"ids": []string{reviewID}}).Number("deleteReviews"); n != 0 {
		t.Error("bob deleted alice's review")
	}
	if n := alice.Do(`{ reviews { totalCount } }`, nil).Number("reviews", "totalCount"); n != 1 {
		t.Errorf("alice lost data: %v", n)
	}
}

type fakeOCR struct{}

func (fakeOCR) Extract(_ context.Context, img []byte, lang string) (*ocr.Result, error) {
	m := domain.MachineKStage
	s := 87.5
	return &ocr.Result{SongTitle: "アイドル", ArtistName: "YOASOBI", Score: &s, MachineType: &m, Notes: &lang}, nil
}

func TestImportExportAndUploads(t *testing.T) {
	srv, _ := tu.Server(t, &app.Options{OCR: fakeOCR{}})
	c := tu.NewClient(t, srv)
	register(t, c, "io@example.com", "io")
	tu.MustOK(t, c.Do(logReview, map[string]any{"song": newSong("=cmd", "-artist"), "review": take("2026-11-01", 90, "DAM")}))

	resp, csv := c.GetRaw("/export?format=csv")
	if resp.StatusCode != http.StatusOK || !strings.HasPrefix(string(csv), "\uFEFF") || !strings.Contains(string(csv), "'=cmd,'-artist") {
		t.Fatalf("CSV export: %d %q", resp.StatusCode, csv)
	}
	_, js := c.GetRaw("/export?format=json")
	if !strings.Contains(string(js), `"version": 2`) {
		t.Fatalf("JSON export: %s", js)
	}

	const imp = `mutation($f: Upload!){ importData(file:$f){ reviewsImported reviewsDuplicate reviewsSkipped errors { row field code } } }`
	r := tu.MustOK(t, c.Upload(imp, "f", "export.json", js))
	if r.Number("importData", "reviewsDuplicate") != 1 || r.Number("importData", "reviewsImported") != 0 {
		t.Fatalf("re-import: %+v", r.Data)
	}
	r = tu.MustOK(t, c.Upload(imp, "f", "export.csv", csv))
	if r.Number("importData", "reviewsDuplicate") != 1 {
		t.Fatalf("CSV re-import: %+v", r.Data)
	}
	v1 := `{"reviews":[
	 {"date":"2026-10-01T00:00:00Z","score":90.1,"machineType":"DAM","issues":["RHYTHM","RHYTHM"],"notes":"  ","song":"群青","artist":"YOASOBI","genres":["POP"],"youtubeUrl":"javascript:alert(1)"},
	 {"date":"2026-10-02T00:00:00Z","score":85,"machineType":"UTAU","issues":[],"song":"怪物","artist":"YOASOBI","genres":["POP"]},
	 {"date":"2012-10-02T00:00:00Z","score":85,"machineType":"DAM","issues":[],"song":"夜に駆ける","artist":"YOASOBI","genres":["POP"]}]}`
	r = tu.MustOK(t, c.Upload(imp, "f", "old.json", []byte(v1)))
	if r.Number("importData", "reviewsImported") != 1 || r.Number("importData", "reviewsSkipped") != 2 ||
		r.String("importData", "errors", 0, "code") != "INVALID_YOUTUBE_URL" || r.Number("importData", "errors", 1, "row") != 2 {
		t.Fatalf("v1 import: %+v", r.Data)
	}
	if n := c.Do(`{ songs(filter:{search:"群青"}){ totalCount } }`, nil).Number("songs", "totalCount"); n != 0 {
		t.Fatal("rejected row created a song")
	}
	if r := c.Upload(imp, "f", "junk.txt", []byte("not an export")); r.Reason() != "INVALID_IMPORT" {
		t.Fatalf("junk import: %+v", r.Errors)
	}

	r = tu.MustOK(t, c.Upload(`mutation($i: Upload!){ extractReviewFromImage(image:$i){ score machineType notes } }`, "i", "shot.png", []byte("\x89PNG")))
	if r.String("extractReviewFromImage", "machineType") != "KSTAGE" {
		t.Fatalf("OCR upload: %+v", r.Data)
	}
	if r := c.Do(`query{ serverInfo { ocrEnabled youtubeSearchEnabled mailEnabled machines { code label kind } } }`, nil); r.Get("serverInfo", "ocrEnabled") != true || r.Get("serverInfo", "mailEnabled") != false {
		t.Fatalf("serverInfo: %+v", r.Data)
	}
	if r := c.Do(`mutation{ searchYoutube(artist:"a", song:"b"){ videoId } }`, nil); r.Code() != "FEATURE_DISABLED" {
		t.Fatalf("disabled search: %+v", r.Errors)
	}
}
