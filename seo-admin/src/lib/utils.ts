import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts last-wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a rating as a fixed one-decimal string, e.g. 4.5 → "4.5". */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** "12 reviews" / "1 review" — avoids the "1 reviews" tell. */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * Slugify arbitrary text for use in DOM ids (table_of_contents anchors).
 * Deterministic across server and client so hydration stays stable.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Truncate on a word boundary, appending an ellipsis only when it cuts. */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Google Maps turn-by-turn link, per spec §3.2. */
export function directionsUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({ api: "1", destination: `${lat},${lng}` });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Strip a phone number down to something `tel:` accepts. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Render a timestamp for admin tables.
 *
 * `timeZone: "UTC"` and an explicit locale are not cosmetic choices. These
 * strings are rendered on the server and hydrated on the client; if the format
 * depended on the ambient locale or zone, every row would be a hydration
 * mismatch on any machine not set to the server's. UTC also matches what
 * Postgres stores, so "updated 14:05" agrees with the database.
 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

/** Date only, same reasoning as `formatDateTime`. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
