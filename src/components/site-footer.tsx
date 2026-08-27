import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SITE_NAME } from "@/lib/site";

/**
 * Footer columns.
 *
 * The structure is data, the wording is not. Each entry carries a message KEY
 * rather than a label, because this constant is evaluated once at module scope
 * where there is no request and therefore no locale — resolving the text here
 * would freeze the first visitor's language for everyone.
 */
const COLUMNS = [
  {
    key: "findARepair",
    links: [
      { key: "browseAll", href: "/search" },
      // Slugs must match `CATEGORY_SEEDS` in scripts/seed-content.ts and the
      // `repair` path_prefix in scripts/seed-seo-pages.ts — these resolve to real
      // CMS category pages (/repair/<slug>), not the old broken /repair/*-repair
      // slugs that filtered the directory down to nothing.
      { key: "phones", href: "/repair/phones" },
      { key: "laptops", href: "/repair/laptops" },
      { key: "appliances", href: "/repair/appliances" },
      { key: "bicycles", href: "/repair/bicycles" },
      { key: "desktops", href: "/repair/desktops" },
      { key: "consoles", href: "/repair/consoles" },
    ],
  },
  {
    key: "resources",
    links: [
      { key: "blog", href: "/blog" },
      { key: "tablets", href: "/repair/tablets" },
      { key: "audio", href: "/repair/audio-equipment" },
      { key: "watches", href: "/repair/watches" },
      { key: "cameras", href: "/repair/cameras" },
    ],
  },
  {
    key: "forShops",
    links: [
      { key: "listYourShop", href: "/join" },
      { key: "verification", href: "/verification" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "about", href: "/about" },
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
      // Listed beside the other two rather than buried in the terms, because the
      // question it answers — "do I get my money back" — is the one people go
      // looking for, and a policy nobody can find is a policy nobody read.
      { key: "refunds", href: "/refunds" },
    ],
  },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="mt-24 border-t border-hairline bg-chalk">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl uppercase text-enamel">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-steel">
              {t("tagline")}
            </p>
          </div>

          {COLUMNS.map((column) => {
            const heading = t(`${column.key}.heading`);
            return (
              <nav key={column.key} aria-label={heading}>
                <p className="eyebrow">{heading}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-steel transition-colors hover:text-signal"
                      >
                        {t(`${column.key}.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col-reverse items-start gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-eyebrow uppercase text-steel-soft">
            {t("rights", { year: new Date().getFullYear(), siteName: SITE_NAME })}
          </p>
          <LanguageSwitcher className="-ml-2 sm:ml-0" />
        </div>
      </div>
    </footer>
  );
}
