/** Shared by the avatar component and the score card. */
export const AVATAR_COLORS = [
  { className: "bg-blue-500", hex: "#3b82f6" },
  { className: "bg-sky-500", hex: "#0ea5e9" },
  { className: "bg-green-500", hex: "#22c55e" },
  { className: "bg-orange-500", hex: "#f97316" },
  { className: "bg-rose-500", hex: "#f43f5e" },
  { className: "bg-slate-500", hex: "#64748b" },
] as const;

export function initials(name: string, email = ""): string {
  const source = (name || email).trim();
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  // Japanese names often have no spaces: use the first two characters.
  if (words.length === 1) return Array.from(words[0]!).slice(0, 2).join("").toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join("")
    .toUpperCase();
}

export function avatarColor(name: string) {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]!;
}
