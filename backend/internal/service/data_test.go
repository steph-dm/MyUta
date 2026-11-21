package service

import (
	"testing"
)

func TestCSVFormulaProtection(t *testing.T) {
	for _, s := range []string{"=HYPERLINK(\"x\")", "+1", "-2 key", "@SUM(A1)", "plain"} {
		if got := csvUnsafe(csvSafe(s)); got != s {
			t.Errorf("round trip %q -> %q", s, got)
		}
	}
	if csvSafe("=1+1") != "'=1+1" {
		t.Error("formula not neutralised")
	}
}

func TestParseImportDate(t *testing.T) {
	for in, want := range map[string]string{
		"2026-11-20":           "2026-11-20",
		"2026-11-20T00:00:00Z": "2026-11-20", // version-1 export
		"2026-03-22T20:45:00Z": "2026-03-22", // the UTC day, as the old UI showed it
	} {
		d, err := parseImportDate(in)
		if err != nil || d.Format("2006-01-02") != want {
			t.Errorf("parseImportDate(%q) = %v %v", in, d, err)
		}
	}
	if _, err := parseImportDate("yesterday"); err == nil {
		t.Error("bad date accepted")
	}
}

func TestParseCSVAcceptsOldAndNewHeaders(t *testing.T) {
	old := "\uFEFFdate,song,artist,score,machineType,genres,issues,notes,youtubeUrl\n" +
		"2026-01-02,\"'=evil\",YOASOBI,90.5,DAM,POP;ANIME,RHYTHM,\"a, note\",\n"
	doc, err := parseImport("x.csv", []byte(old))
	if err != nil || len(doc.Reviews) != 1 {
		t.Fatalf("old header: %v %+v", err, doc)
	}
	r := doc.Reviews[0]
	if r.row != 2 || len(r.Genres) != 2 || *r.Notes != "a, note" || r.MachineType != "DAM" {
		t.Errorf("row parsed wrong: %+v", r)
	}
	if _, err := parseImport("x.csv", []byte("a,b\n1,2\n")); err == nil {
		t.Error("CSV without required columns accepted")
	}
	if _, err := parseImport("x.json", []byte(`{"version":99,"reviews":[]}`)); err == nil {
		t.Error("future export version accepted")
	}
	if _, err := parseImport("x.json", []byte(`{"reviews": [`)); err == nil {
		t.Error("broken JSON accepted")
	}
}
