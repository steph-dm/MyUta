// Service worker: app shell caching and the Web Share Target.
// API calls (/graphql, /export) are never cached.
const CACHE = "myuta-shell-v3";
const SHARE_CACHE = "myuta-share"; // images received from the Share menu, picked up by the app
const SHELL = ["/", "/index.html", "/favicon.svg", "/manifest.json", "/theme-init.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Share target (manifest.json "share_target"): Android posts the shared image here as
 * multipart/form-data. The image is kept in a cache under a random id and the app is
 * opened on the takes page with ?share=<id>, where it is attached to the "Log a take"
 * dialog. Only the first image is used.
 */
const openTakes = (share) =>
  Response.redirect(new URL(`/reviews?share=${share}`, self.location.origin).href, 303);

async function receiveShare(request) {
  try {
    const form = await request.formData();
    const file = form
      .getAll("image")
      .find(
        (f) =>
          typeof f === "object" &&
          f !== null &&
          typeof f.type === "string" &&
          f.type.startsWith("image/"),
      );
    if (!file) return openTakes("none");
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const cache = await caches.open(SHARE_CACHE);
    await cache.put(
      `/__share/${id}`,
      new Response(file, {
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name || "shared-image"),
          "X-Shared-At": String(Date.now()),
        },
      }),
    );
    return openTakes(id);
  } catch {
    return openTakes("error");
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(receiveShare(event.request));
    return;
  }

  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/graphql") || url.pathname.startsWith("/export")) return;

  // Hashed assets never change: cache first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages: network first, cached shell when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/index.html")));
  }
});
