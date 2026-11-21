import type { Genre, Issue } from "@/gql/graphql";

export const GENRES: readonly Genre[] = [
  "ANIME",
  "CLASSICAL",
  "ELECTRO",
  "FOLK",
  "HIPHOP",
  "JAZZ",
  "POP",
  "ROCK",
];

export const ISSUES: readonly Issue[] = [
  "BRIDGE",
  "CHORUS",
  "EXPRESSIVENESS",
  "INTRO",
  "MELODY",
  "OUTRO",
  "RANGE",
  "REVIEW",
  "RHYTHM",
  "SPEED",
  "VERSE",
];

const ISSUE_COLORS: Record<Issue, string> = {
  BRIDGE:
    "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700",
  CHORUS:
    "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700",
  EXPRESSIVENESS:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700",
  INTRO:
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700",
  MELODY:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  OUTRO:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
  RANGE:
    "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
  REVIEW:
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  RHYTHM:
    "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-200 dark:border-rose-700",
  SPEED:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
  VERSE:
    "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900 dark:text-lime-200 dark:border-lime-700",
};

const GENRE_COLORS: Record<Genre, string> = {
  ANIME: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  CLASSICAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ELECTRO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  FOLK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  HIPHOP: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  JAZZ: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  POP: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  ROCK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** Canvas colours for the shared score card. */
export const GENRE_HEX: Record<Genre, { bg: string; text: string }> = {
  ANIME: { bg: "#f5d0fe", text: "#86198f" },
  CLASSICAL: { bg: "#d1fae5", text: "#065f46" },
  ELECTRO: { bg: "#cffafe", text: "#155e75" },
  FOLK: { bg: "#ffedd5", text: "#9a3412" },
  HIPHOP: { bg: "#fef3c7", text: "#92400e" },
  JAZZ: { bg: "#e0f2fe", text: "#075985" },
  POP: { bg: "#fce7f3", text: "#9d174d" },
  ROCK: { bg: "#fee2e2", text: "#991b1b" },
};

export const issueColor = (i: Issue) => ISSUE_COLORS[i];
export const genreColor = (g: Genre) => GENRE_COLORS[g];
