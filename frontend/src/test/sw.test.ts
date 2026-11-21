// @vitest-environment node
import source from "../../public/sw.js?raw";
import { beforeEach, describe, expect, it } from "vitest";
import { installFakeCaches } from "./fakeCaches";

type Listener = (event: {
  request: Request;
  respondWith: (r: Promise<Response> | Response) => void;
}) => void;

/** Runs public/sw.js with a fake service-worker global and returns its fetch handler. */
function loadServiceWorker() {
  const listeners: Record<string, Listener> = {};
  const self = {
    location: new URL("https://myuta.example/"),
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  };
  const { caches, stores } = installFakeCaches({});
  new Function("self", "caches", source)(self, caches);
  const fetch = async (request: Request) => {
    let response: Promise<Response> | Response | undefined;
    listeners.fetch!({ request, respondWith: (r) => (response = r) });
    return response ? await response : undefined;
  };
  return { fetch, stores };
}

const share = (form: FormData) =>
  new Request("https://myuta.example/share-target", { method: "POST", body: form });

describe("service worker share target", () => {
  let sw: ReturnType<typeof loadServiceWorker>;
  beforeEach(() => (sw = loadServiceWorker()));

  it("stores the shared image and opens the takes page with its id", async () => {
    const form = new FormData();
    form.append("title", "Photo");
    form.append(
      "image",
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "カラオケ.png", { type: "image/png" }),
    );
    const res = await sw.fetch(share(form));
    expect(res?.status).toBe(303);
    const location = new URL(res!.headers.get("Location")!, "https://myuta.example");
    expect(location.pathname).toBe("/reviews");
    const id = location.searchParams.get("share")!;
    expect(id).toMatch(/^[a-z0-9]{8,40}$/);
    const stored = sw.stores.get("myuta-share")!.get(`/__share/${id}`)!;
    expect(stored.headers.get("Content-Type")).toBe("image/png");
    expect(decodeURIComponent(stored.headers.get("X-File-Name")!)).toBe("カラオケ.png");
    expect((await stored.arrayBuffer()).byteLength).toBe(4);
  });

  it("reports a share without an image", async () => {
    const form = new FormData();
    form.append("text", "just text");
    form.append("image", new File(["x"], "notes.txt", { type: "text/plain" }));
    const res = await sw.fetch(share(form));
    expect(res?.headers.get("Location")).toBe("https://myuta.example/reviews?share=none");
  });

  it("reports a body it cannot read", async () => {
    const res = await sw.fetch(
      new Request("https://myuta.example/share-target", {
        method: "POST",
        body: "garbage",
        headers: { "Content-Type": "multipart/form-data; boundary=x" },
      }),
    );
    expect(res?.headers.get("Location")).toBe("https://myuta.example/reviews?share=error");
  });

  it("never handles API requests", async () => {
    expect(
      await sw.fetch(new Request("https://myuta.example/graphql", { method: "POST", body: "{}" })),
    ).toBeUndefined();
    expect(await sw.fetch(new Request("https://myuta.example/export?format=csv"))).toBeUndefined();
  });
});
