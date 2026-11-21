import type { MachineType } from "@/gql/graphql";

/**
 * Everything the UI needs to know about a scoring machine. Adding a machine to
 * the schema makes TypeScript require an entry here (see docs/adding-a-machine.md).
 * Class names are complete strings so Tailwind can find them.
 */
export interface MachineMeta {
  label: string;
  short: string;
  kind: "venue" | "home";
  /** Badge colours. */
  badge: string;
  /** Selected button colours. */
  button: string;
  /** Section border. */
  border: string;
  /** Icon/text accent. */
  accent: string;
  /** Chart and score-card colour. */
  hex: string;
  /** Score thresholds for "great / good / ok"; below the last one is "low". */
  bands: readonly [number, number, number];
}

export const MACHINES: Record<MachineType, MachineMeta> = {
  DAM: {
    label: "DAM",
    short: "DAM",
    kind: "venue",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    border: "border-blue-200 dark:border-blue-800",
    accent: "text-blue-600 dark:text-blue-400",
    hex: "#2563eb",
    bands: [90, 80, 70],
  },
  JOYSOUND: {
    label: "JOYSOUND",
    short: "JOY",
    kind: "venue",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    button: "bg-rose-600 text-white hover:bg-rose-700",
    border: "border-rose-200 dark:border-rose-800",
    accent: "text-rose-600 dark:text-rose-400",
    hex: "#e11d48",
    bands: [90, 80, 70],
  },
  KSTAGE: {
    label: "K-STAGE",
    short: "K-ST",
    kind: "home",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    button: "bg-teal-600 text-white hover:bg-teal-700",
    border: "border-teal-200 dark:border-teal-800",
    accent: "text-teal-600 dark:text-teal-400",
    hex: "#0d9488",
    // K-STAGE accuracy percentages run lower than venue machine scores.
    bands: [85, 70, 55],
  },
};

export const MACHINE_TYPES = Object.keys(MACHINES) as MachineType[];

export type ScoreBand = "great" | "good" | "ok" | "low";

export function scoreBand(score: number, machine: MachineType): ScoreBand {
  const [great, good, ok] = MACHINES[machine].bands;
  if (score >= great) return "great";
  if (score >= good) return "good";
  if (score >= ok) return "ok";
  return "low";
}

export const BAND_HEX: Record<ScoreBand, string> = {
  great: "#22c55e",
  good: "#3b82f6",
  ok: "#eab308",
  low: "#ef4444",
};

export const BAND_BADGE: Record<ScoreBand, string> = {
  great: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ok: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** Groups items by machine in registry order, largest group first, empty groups last. */
export function groupByMachine<T extends { machineType: MachineType }>(items: readonly T[]) {
  return MACHINE_TYPES.map((type) => ({
    type,
    meta: MACHINES[type],
    items: items.filter((i) => i.machineType === type),
  })).sort((a, b) => b.items.length - a.items.length);
}
