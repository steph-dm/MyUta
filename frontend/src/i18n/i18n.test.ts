import { describe, expect, it } from "vitest";
import i18n from "@/i18n";

describe("language", () => {
  it("keeps <html lang> in sync and loads Japanese on demand", async () => {
    await i18n.changeLanguage("ja");
    await i18n.loadNamespaces("common");
    expect(document.documentElement.lang).toBe("ja");
    expect(i18n.t("common:nav.songs")).toBe("曲");
    await i18n.changeLanguage("en");
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("unusual browser locales", () => {
  it("never hands Intl an invalid tag (regression: 'en-US@posix' crashed the songs page)", async () => {
    const { intlLocale } = await import("@/i18n");
    await i18n.changeLanguage("en-US@posix");
    expect(i18n.resolvedLanguage).toBe("en");
    expect(() => "a".localeCompare("b", intlLocale())).not.toThrow();
    expect(intlLocale()).toBe("en-US");
    await i18n.changeLanguage("ja-JP");
    expect(intlLocale()).toBe("ja-JP");
    await i18n.changeLanguage("en");
  });
});
