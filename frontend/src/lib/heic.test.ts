import { describe, expect, it } from "vitest";
import { isHeicFile } from "./heic";

const header = (brand: string) => {
  const b = new Uint8Array(16);
  b.set([0, 0, 0, 24], 0);
  b.set(
    [...("ftyp" + brand)].map((c) => c.charCodeAt(0)),
    4,
  );
  return b;
};

describe("isHeicFile", () => {
  it("recognises HEIC by type, extension or file header", async () => {
    expect(await isHeicFile(new File(["x"], "a.jpg", { type: "image/heic" }))).toBe(true);
    expect(await isHeicFile(new File(["x"], "IMG_0001.HEIC", { type: "" }))).toBe(true);
    expect(await isHeicFile(new File([header("heic")], "shared", { type: "" }))).toBe(true);
    expect(
      await isHeicFile(new File([header("mif1")], "shared", { type: "application/octet-stream" })),
    ).toBe(true);
  });
  it("leaves other images alone", async () => {
    expect(await isHeicFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBe(false);
    expect(await isHeicFile(new File([header("isom")], "video", { type: "" }))).toBe(false);
  });
});
