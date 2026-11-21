import { describe, expect, it } from "vitest";
import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import i18n from "@/i18n";
import { addDays, formatDay, isValidDay, todayISO } from "./dates";
import { errorMessage, fieldErrors, UploadError } from "./errors";
import { BAND_HEX, groupByMachine, MACHINES, MACHINE_TYPES, scoreBand } from "./machines";
import { matches, normalizeKey, searchKey } from "./text";
import { filenameFromDisposition, safeFilename } from "./download";
import { initials } from "./avatar";
import { videoId } from "./youtube";
import { safeNext } from "@/components/auth/ProtectedRoute";

describe("youtube links (same rules as the backend validator)", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc12345678", "abc12345678"],
    ["https://www.youtube.com/watch?feature=share&v=abc12345678", "abc12345678"],
    ["https://youtu.be/abc12345678?t=10", "abc12345678"],
    ["https://m.youtube.com/watch?v=abc12345678", "abc12345678"],
    ["https://music.youtube.com/watch?v=abc12345678", "abc12345678"],
    ["https://www.youtube.com/shorts/abc12345678", "abc12345678"],
    ["https://www.youtube.com/live/abc12345678", "abc12345678"],
    ["https://youtube.com.evil.example/watch?v=abc12345678", null],
    ["javascript:alert(document.domain)//youtube.com/watch?v=abc12345", null],
    ["www.youtube.com/watch?v=abc12345678", null],
  ])("%s", (url, id) => expect(videoId(url)).toBe(id));
});

describe("text keys", () => {
  it("ignores width, case and spacing like the server", () => {
    expect(normalizeKey(" ＹＯＡＳＯＢＩ ")).toBe("yoasobi");
    expect(normalizeKey("秦　 基博")).toBe("秦 基博");
  });
  it("search ignores hiragana/katakana", () => {
    expect(searchKey("アイドル")).toBe(searchKey("あいどる"));
    expect(matches("アイドル", "いど")).toBe(true);
  });
});

describe("dates are calendar days, never shifted by time zones", () => {
  it("formats and validates", () => {
    expect(formatDay("2026-03-22")).toBe("2026/03/22");
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(todayISO(new Date(2026, 10, 21, 23, 59))).toBe("2026-11-21");
  });
});

describe("machines", () => {
  it("has metadata for every machine and per-machine bands", () => {
    expect(MACHINE_TYPES).toEqual(["DAM", "JOYSOUND", "KSTAGE"]);
    expect(scoreBand(86, "DAM")).toBe("good");
    expect(scoreBand(86, "KSTAGE")).toBe("great");
    expect(BAND_HEX.great).toMatch(/^#/);
    expect(MACHINES.KSTAGE.label).toBe("K-STAGE");
  });
  it("groups with the busiest machine first and empty ones kept", () => {
    const groups = groupByMachine([
      { machineType: "JOYSOUND" as const },
      { machineType: "JOYSOUND" as const },
      { machineType: "DAM" as const },
    ]);
    expect(groups.map((g) => [g.type, g.items.length])).toEqual([
      ["JOYSOUND", 2],
      ["DAM", 1],
      ["KSTAGE", 0],
    ]);
  });
});

describe("errors are translated by reason/code, never by parsing messages", () => {
  const t = i18n.t.bind(i18n);
  const apollo = (extensions: Record<string, unknown>) =>
    new ApolloError({ graphQLErrors: [new GraphQLError("server text", { extensions })] });

  it("uses the reason", () => {
    expect(
      errorMessage(apollo({ code: "CONFLICT", reason: "EMAIL_TAKEN", field: "email" }), t),
    ).toBe("This e-mail address is already registered.");
    expect(
      fieldErrors(apollo({ code: "CONFLICT", reason: "EMAIL_TAKEN", field: "email" }), t),
    ).toEqual({ email: "This e-mail address is already registered." });
  });
  it("falls back to the code, with values", () => {
    expect(errorMessage(apollo({ code: "RATE_LIMITED", retryAfterSeconds: 42 }), t)).toContain(
      "42",
    );
    expect(
      errorMessage(
        new UploadError([
          { message: "x", extensions: { code: "PAYLOAD_TOO_LARGE", maxBytes: 10485760 } },
        ]),
        t,
      ),
    ).toContain("10 MB");
  });
  it("never shows unknown server text", () => {
    expect(errorMessage(apollo({ code: "SOMETHING_NEW" }), t)).toBe(t("common:errors.generic"));
    expect(errorMessage(new Error("boom"), t)).toBe(t("common:errors.generic"));
  });
});

describe("misc helpers", () => {
  it("keeps Japanese in file names", () => {
    expect(safeFilename("アイドル / YOASOBI", "x")).toBe("アイドル-YOASOBI");
    expect(safeFilename("///", "fallback")).toBe("fallback");
    expect(
      filenameFromDisposition(`attachment; filename="a.csv"; filename*=UTF-8''%E6%AD%8C.csv`, "x"),
    ).toBe("歌.csv");
  });
  it("initials of Japanese names", () => {
    expect(initials("田中太郎")).toBe("田中");
    expect(initials("Taro Tanaka")).toBe("TT");
  });
  it("only allows same-site redirect targets", () => {
    expect(safeNext("/songs/1?x=1")).toBe("/songs/1?x=1");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
