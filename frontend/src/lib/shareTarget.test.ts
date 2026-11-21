import { beforeEach, describe, expect, it } from "vitest";
import { installFakeCaches } from "@/test/fakeCaches";
import { SHARE_CACHE, shareProblem, takeSharedImage } from "./shareTarget";

describe("shared images", () => {
  beforeEach(() => installFakeCaches());

  const put = async (id: string, at = Date.now(), type = "image/jpeg") => {
    const cache = await caches.open(SHARE_CACHE);
    await cache.put(
      `/__share/${id}`,
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "Content-Type": type,
          "X-File-Name": encodeURIComponent("写真 1.jpg"),
          "X-Shared-At": String(at),
        },
      }),
    );
  };

  it("returns the image once, with its name and type", async () => {
    await put("abc12345xyz");
    const file = await takeSharedImage("abc12345xyz");
    expect(file?.name).toBe("写真 1.jpg");
    expect(file?.type).toBe("image/jpeg");
    expect(await takeSharedImage("abc12345xyz")).toBeNull();
  });

  it("drops shares older than an hour and rejects odd ids or non-images", async () => {
    await put("old0000000", Date.now() - 2 * 60 * 60 * 1000);
    await put("txt0000000", Date.now(), "text/plain");
    await takeSharedImage("other00000");
    const cache = await caches.open(SHARE_CACHE);
    expect((await cache.keys()).map((r) => new URL(r.url).pathname)).toEqual([
      "/__share/txt0000000",
    ]);
    expect(await takeSharedImage("txt0000000")).toBeNull();
    expect(await takeSharedImage("../etc")).toBeNull();
  });

  it("classifies problem values", () => {
    expect(shareProblem("unavailable")).toBe("unavailable");
    expect(shareProblem("none")).toBe("none");
    expect(shareProblem("abc12345xyz")).toBeNull();
    expect(shareProblem("<script>")).toBe("error");
  });
});
