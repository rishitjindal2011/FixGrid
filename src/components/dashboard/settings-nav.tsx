"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
  /** Key into `dashboard.settingsNav.tabs`. */
  labelKey: string;
  /** Announced after the label — "Account, closing your account" reads better
   *  than a bare word on a destructive destination. Key into the same tabs
   *  namespace. */
  descKey: string;
}

const TABS: SettingsTab[] = [
  { href: "/dashboard/settings/profile", labelKey: "profile", descKey: "profileHint" },
  {
    href: "/dashboard/settings/notifications",
    labelKey: "notifications",
    descKey: "notificationsHint",
  },
  {
    href: "/dashboard/settings/addresses",
    labelKey: "addresses",
    descKey: "addressesHint",
  },
  { href: "/dashboard/settings/security", labelKey: "security", descKey: "securityHint" },
  { href: "/dashboard/settings/danger", labelKey: "account", descKey: "accountHint" },
];

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("dashboard.settingsNav");

  return (
    <nav aria-label={t("aria")} className="border-b border-hairline">
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
                {t(`tabs.${tab.labelKey}`)}
                <span className="sr-only">, {t(`tabs.${tab.descKey}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
