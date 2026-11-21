import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Page sizes offered by tables; the first one is the default. */
export const PAGE_SIZES = [10, 25, 50] as const;
