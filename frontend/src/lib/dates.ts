/**
 * Review dates are calendar days ("2026-11-21") without a time zone. They are
 * never converted through Date objects for display, so no time zone can shift them.
 */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's calendar day in the user's own time zone. */
export function todayISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function isValidDay(value: string): boolean {
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** "2026-11-21" -> "2026/11/21" (the format used throughout the UI). */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "";
  const m = DAY_RE.exec(value);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : value;
}

/** Short label for chart axes, e.g. "Nov 21" / "11月21日". */
export function shortDay(value: string, locale: string): string {
  const m = DAY_RE.exec(value);
  if (!m) return value;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Adds days to a calendar day. */
export function addDays(value: string, days: number): string {
  const m = DAY_RE.exec(value);
  if (!m) return value;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return dt.toISOString().slice(0, 10);
}
