import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Genre, Issue, MachineType } from "../types";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ]/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDateValue(date: string | Date): Date {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }

  if (DATE_ONLY_RE.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const isoMatch = ISO_DATETIME_RE.exec(date);
  if (isoMatch) {
    const [year, month, day] = isoMatch[1].split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(date);
}

export function formatDateYYYYMMDD(
  date: string | Date | null | undefined,
): string {
  if (!date) return "";
  const d = parseDateValue(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

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

export function getIssueColor(issue: Issue): string {
  return ISSUE_COLORS[issue] || "bg-secondary text-secondary-foreground";
}

const GENRE_COLORS: Record<Genre, string> = {
  ANIME:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  CLASSICAL:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ELECTRO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  FOLK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  HIPHOP: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  JAZZ: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  POP: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  ROCK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function getGenreColor(genre: Genre): string {
  return GENRE_COLORS[genre] || "bg-secondary text-secondary-foreground";
}

const MACHINE_BADGE_COLORS: Record<MachineType, string> = {
  DAM: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  JOYSOUND: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

export function getMachineBadgeColor(type: MachineType): string {
  return MACHINE_BADGE_COLORS[type] || "";
}

const MACHINE_BUTTON_COLORS: Record<MachineType, string> = {
  DAM: "bg-blue-600 hover:bg-blue-700",
  JOYSOUND: "bg-rose-600 hover:bg-rose-700",
};

export function getMachineButtonColor(type: MachineType): string {
  return MACHINE_BUTTON_COLORS[type] || "";
}
