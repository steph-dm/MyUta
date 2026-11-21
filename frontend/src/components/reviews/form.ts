import type { MachineType, Issue, ReviewInput, ScoreDetailsInput } from "@/gql/graphql";
import { isValidDay, todayISO, addDays } from "@/lib/dates";

export const DETAIL_PERCENT_FIELDS = [
  "pitch",
  "stability",
  "rhythm",
  "expression",
  "techniques",
  "articulation",
] as const;
export type DetailField = (typeof DETAIL_PERCENT_FIELDS)[number] | "totalPoints" | "grade";

/** Form state of one take; numbers are kept as strings while typing. */
export interface ReviewFormValues {
  date: string;
  score: string;
  machineType: MachineType;
  keyChange: number;
  variant: string;
  issues: Issue[];
  notes: string;
  details: Partial<Record<DetailField, string>>;
}

export const emptyReview = (machine: MachineType): ReviewFormValues => ({
  date: todayISO(),
  score: "",
  machineType: machine,
  keyChange: 0,
  variant: "",
  issues: [],
  notes: "",
  details: {},
});

export type ReviewErrors = Partial<
  Record<"date" | "score" | "artist" | "song" | "genres" | "youtubeUrl" | "form", string>
>;

/** Client-side checks mirroring the server (the server checks again). */
export function validateReview(v: ReviewFormValues, t: (k: string) => string): ReviewErrors {
  const errors: ReviewErrors = {};
  const score = Number(v.score);
  if (v.score.trim() === "" || !Number.isFinite(score) || score < 0 || score > 100)
    errors.score = t("reviews:validation.score");
  // "today" may be tomorrow in UTC+14 terms; the server allows one day ahead.
  if (!isValidDay(v.date) || v.date > addDays(todayISO(), 1))
    errors.date = t("reviews:validation.date");
  return errors;
}

export function toReviewInput(v: ReviewFormValues): ReviewInput {
  const details: ScoreDetailsInput = {};
  let hasDetails = false;
  for (const f of DETAIL_PERCENT_FIELDS) {
    const raw = v.details[f]?.trim();
    if (raw) {
      details[f] = Number(raw);
      hasDetails = true;
    }
  }
  if (v.details.totalPoints?.trim()) {
    details.totalPoints = Math.round(Number(v.details.totalPoints));
    hasDetails = true;
  }
  if (v.details.grade?.trim()) {
    details.grade = v.details.grade.trim();
    hasDetails = true;
  }
  return {
    date: v.date,
    score: Math.round(Number(v.score) * 1000) / 1000,
    machineType: v.machineType,
    keyChange: v.keyChange,
    variant: v.variant.trim() || null,
    issues: v.issues,
    notes: v.notes.trim() || null,
    details: hasDetails ? details : null,
  };
}

interface ReviewLike {
  date: string;
  score: number;
  machineType: MachineType;
  keyChange: number;
  variant?: string | null;
  issues: Issue[];
  notes?: string | null;
  details?: Partial<Record<DetailField, number | string | null>> | null;
}

export function fromReview(r: ReviewLike): ReviewFormValues {
  const details: ReviewFormValues["details"] = {};
  for (const [k, val] of Object.entries(r.details ?? {})) {
    if (val !== null && val !== undefined && k !== "__typename")
      details[k as DetailField] = String(val);
  }
  return {
    date: r.date,
    score: String(r.score),
    machineType: r.machineType,
    keyChange: r.keyChange,
    variant: r.variant ?? "",
    issues: [...r.issues],
    notes: r.notes ?? "",
    details,
  };
}
