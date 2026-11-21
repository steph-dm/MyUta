/**
 * YouTube link handling. Must accept exactly what the backend accepts
 * (internal/validator: YouTubeURL / VideoID).
 */
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);
const ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

export function videoId(link: string | null | undefined): string | null {
  if (!link) return null;
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return null;
  }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || !HOSTS.has(u.hostname.toLowerCase()))
    return null;
  const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
  let id: string | null = null;
  if (u.hostname.toLowerCase() === "youtu.be") id = parts[0] ?? null;
  else if (parts[0] === "watch") id = u.searchParams.get("v");
  else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  return id && ID_RE.test(id) ? id : null;
}

export const isValidYouTubeUrl = (link: string) => videoId(link) !== null;

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
