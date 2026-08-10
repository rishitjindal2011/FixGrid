"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The settings sub-nav.
 *
 * Client only because it reads `usePathname` — the four pages are otherwise
 * server-rendered, and routing through `<Link>` keeps the layout (and this
 * strip) from re-mounting between tabs.
 *
 * Deliberately links rather than Radix `Tabs`: these are four real routes with
 * their own URLs, and a tablist would hand a keyboard user roving-tabindex
 * semantics for controls that are actually navigation. `aria-current="page"`
 * is the honest announcement here, not `aria-selected`.
 */

interface SettingsTab {
  href: string;
  label: string;
  /** Announced after the label — "Account, deletes your account" reads better
   *  than a bare word on a destructive destination. */
  description: string;
}

const TABS: SettingsTab[] = [
  { href: "/dashboard/settings/profile", label: "Profile", description: "your details" },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    description: "what we email and text you",
  },
  {
    href: "/dashboard/settings/addresses",
    label: "Addresses",
    description: "where we send engineers",
  },
  { href: "/dashboard/settings/security", label: "Security", description: "password and sessions" },
  { href: "/dashboard/settings/danger", label: "Account", description: "closing your account" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="border-b border-hairline">
      {/* Horizontal scroll rather than wrap: four condensed labels overflow a
          375px viewport, and a second row of tabs reads as a second nav. The
          negative margin lets the focus ring of the first tab clear the edge. */}
      <ul className="-mx-1 flex items-center gap-5 overflow-x-auto px-1 sm:gap-6">
        {TABS.map((tab) => {
          // Exact match only. No settings page has children, so a prefix test
          // would buy nothing and would light "Profile" on a future
          // /settings/profile/avatar that belongs to its own tab.
          const active = pathname === tab.href;

          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // Underline sits on the link so switching tabs never changes
                  // the row's height.
                  "-mb-px block whitespace-nowrap border-b-2 pb-3 pt-2 font-display uppercase tracking-wide transition-colors",
                  "text-base sm:text-lg",
                  active
                    ? "border-signal text-enamel"
                    : "border-transparent text-steel hover:text-enamel",
                )}
              >
                {tab.label}
                <span className="sr-only">, {tab.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
