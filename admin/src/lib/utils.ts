import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts last-wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "12 bookings" / "1 booking" — avoids the "1 bookings" tell. */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * Shorten a UUID for display: `7f3c1a2e-…` → `7f3c1a2e`.
 *
 * Admin tables are full of ids that have no human-facing reference (a payout, a
 * ledger entry). Showing all 36 characters costs a whole column and nobody
 * reads past the first block; the full value stays in the `title` attribute and
 * in the row's link.
 */
export function shortId(id: string): string {
  return id.split("-")[0] ?? id;
}
