import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

/**
 * Locale-aware replacements for `next/link` and `next/navigation`.
 *
 * Every internal link and redirect in the app should come from here rather than
 * from `next/*`. A bare `next/link` to `/search` sends a Hindi visitor to the
 * English page and drops them out of their locale mid-session — the kind of bug
 * that only shows up when someone is actually browsing in Hindi.
 *
 * These respect `localePrefix: "as-needed"`, so for English they emit exactly
 * the same hrefs the app emitted before this existed.
 *
 * `redirect` is the notable one: `src/app/[locale]/(dashboard)/dashboard/layout.tsx`
 * is the auth gate for ~30 routes and must bounce to the locale's own `/login`.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
