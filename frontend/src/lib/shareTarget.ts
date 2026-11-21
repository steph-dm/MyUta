/**
 * Images received through the Web Share Target (see public/sw.js). The service worker
 * stores the shared file in the "myuta-share" cache and opens /reviews?share=<id>.
 */
export const SHARE_CACHE = "myuta-share";
const MAX_AGE_MS = 60 * 60 * 1000; // unused shares are dropped after an hour
const ID_RE = /^[a-z0-9]{8,40}$/;

/** Values of ?share= that are not an id but a problem reported by the service worker or nginx. */
export type ShareProblem = "none" | "error" | "unavailable" | "expired";

export function shareProblem(param: string): ShareProblem | null {
  if (param === "none" || param === "error" || param === "unavailable") return param;
  return ID_RE.test(param) ? null : "error";
}

/**
 * Returns the shared image and removes it from the cache (it is used once).
 * Also removes shares older than an hour that were never picked up.
 */
export async function takeSharedImage(id: string): Promise<File | null> {
  if (!ID_RE.test(id) || typeof caches === "undefined") return null;
  const cache = await caches.open(SHARE_CACHE);
  const key = `/__share/${id}`;
  const res = await cache.match(key);
  await cache.delete(key);
  for (const req of await cache.keys()) {
    const old = await cache.match(req);
    const at = Number(old?.headers.get("X-Shared-At") ?? 0);
    if (!at || Date.now() - at > MAX_AGE_MS) await cache.delete(req);
  }
  if (!res) return null;
  const blob = await res.blob();
  const type = res.headers.get("Content-Type") ?? blob.type;
  if (!type.startsWith("image/")) return null;
  const name = decodeURIComponent(res.headers.get("X-File-Name") ?? "shared-image");
  return new File([blob], name, { type });
}
