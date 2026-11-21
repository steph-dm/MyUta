package domain

import "testing"

func TestNormalizeKey(t *testing.T) {
	same := []string{"YOASOBI", "yoasobi", "ＹＯＡＳＯＢＩ", "  YOASOBI  ", "Yoasobi"}
	for _, s := range same {
		if NormalizeKey(s) != "yoasobi" {
			t.Errorf("NormalizeKey(%q) = %q", s, NormalizeKey(s))
		}
	}
	if NormalizeKey("秦　 基博") != "秦 基博" {
		t.Errorf("spaces not collapsed: %q", NormalizeKey("秦　 基博"))
	}
	if SearchKey("アイドル") != SearchKey("あいどる") {
		t.Error("katakana and hiragana differ in search keys")
	}
	if NormalizeKey("アイドル") == NormalizeKey("あいどる") {
		t.Error("identity keys must keep the kana distinction")
	}
}

func TestRegistries(t *testing.T) {
	if !MachineKStage.IsValid() || MachineType("UTAU").IsValid() {
		t.Error("machine registry")
	}
	if len(Genres) != 8 || len(Issues) != 11 {
		t.Error("enum lists changed: update schema.graphql and the frontend too")
	}
	var d *ScoreDetails
	if !d.IsEmpty() {
		t.Error("nil details not empty")
	}
}
