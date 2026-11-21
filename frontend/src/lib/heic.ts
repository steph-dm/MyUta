/**
 * HEIC/HEIF photos (the default camera format on many phones) cannot be read by the
 * score reader or shown by most browsers, so they are converted to JPEG in the browser.
 * The converter (libheif compiled to WebAssembly, ~3 MB) is only downloaded when a HEIC
 * photo is actually attached.
 */
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/** True for HEIC/HEIF by MIME type, file name or the file's "ftyp" header (type is sometimes empty). */
export async function isHeicFile(file: Blob & { name?: string }): Promise<boolean> {
  if (/^image\/hei[cf](-sequence)?$/i.test(file.type)) return true;
  if (file.name && /\.hei[cf]$/i.test(file.name)) return true;
  if (file.type && file.type !== "application/octet-stream") return false;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = String.fromCharCode(...head);
  return ascii.slice(4, 8) === "ftyp" && HEIF_BRANDS.has(ascii.slice(8, 12));
}

/** Converts a HEIC/HEIF photo to a JPEG file with the same base name. */
export async function heicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import("heic-to/csp");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  const name = (file.name || "photo").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
}
