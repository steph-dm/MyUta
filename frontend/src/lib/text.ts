/**
 * Comparison keys for names and titles; the same rules as the backend
 * (domain.NormalizeKey / SearchKey): NFKC (full-width -> half-width),
 * collapsed spaces, lower case; search additionally treats katakana as hiragana.
 */
export function normalizeKey(s: string): string {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function searchKey(s: string): string {
  return normalizeKey(s).replace(/[\u30a1-\u30f6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/** True when `query` matches `text` ignoring case, width, spacing and kana type. */
export function matches(text: string, query: string): boolean {
  return searchKey(text).includes(searchKey(query));
}

/** Locale-aware comparison for sorting labels. */
export function compareText(a: string, b: string, locale: string): number {
  return a.localeCompare(b, locale);
}
