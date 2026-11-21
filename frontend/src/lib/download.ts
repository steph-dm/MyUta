/** Saves a blob through a temporary link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Keeps letters of every script (Japanese titles stay readable); removes characters file systems reject. */
export function safeFilename(name: string, fallback: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]+|\p{Cc}+/gu, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

/** Filename from a Content-Disposition header (RFC 5987 form first). */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain?.[1] ?? fallback;
}
