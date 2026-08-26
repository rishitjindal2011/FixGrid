import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";

import { ResultCard } from "@/components/search/result-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getShopStatus } from "@/lib/hours";
import {
  getCategories,
  getDirectoryStats,
  getFeaturedFixers,
  toHoursInput,
} from "@/lib/queries/search";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const revalidate = 900;

export const metadata: Metadata = {
  title: {
    absolute: `FixGrid — ${SITE_TAGLINE}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: `FixGrid — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    type: "website",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `FixGrid — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  keywords: [
    "local repair shops",
    "find repair expert",
    "phone repair",
    "appliance repair",
    "bike repair",
    "watch repair",
    "local fixers",
    "repair directory",
    "verified repair shops",
  ],
};

export default async function HomePage() {
  // NOTE: We intentionally do NOT redirect signed-in users from the home page
  // here. Doing so confuses Googlebot (it gets a redirect error and cannot
  // index the page). The middleware handles dashboard routing for logged-in
  // users on protected routes. Logged-in visitors on the public home page
  // simply see the marketing page — a fine UX tradeoff vs. a broken index.

  const [categories, featured, stats, t, tc] = await Promise.all([
    getCategories(),
    getFeaturedFixers(6),
    getDirectoryStats(),
    getTranslations("home"),
    getTranslations("common"),
  ]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-hairline">
        {/*
          The grid is a separate absolutely-positioned layer rather than a class on
          this section. `.schematic-fade` is a CSS mask, and a mask applies to the
          element's whole subtree — put it on the section and it fades the heading,
          the copy and the search field along with the graph paper. Masking a
          sibling layer keeps the decoration soft and the content at full contrast.
        */}
        <div
          aria-hidden
          className="schematic schematic-fade pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-32">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-4 text-display-lg">{t("heading")}</h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-steel">
            {t("intro")}
          </p>

          {/* Plain GET form — works with JS disabled and lands on the same URL
              the filter panel produces. */}
          <form
            action="/search"
            method="get"
            role="search"
            className="mx-auto mt-8 flex max-w-xl gap-2"
          >
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-steel-soft"
              />
              <label htmlFor="home-q" className="sr-only">
                {t("searchLabel")}
              </label>
              <input
                id="home-q"
                name="q"
                type="search"
                maxLength={80}
                placeholder={t("searchPlaceholder")}
                className="h-12 w-full rounded-machined border border-hairline bg-chalk pl-10 pr-3 text-base text-enamel shadow-bench outline-none placeholder:text-steel-soft focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/25"
              />
            </div>
            <Button type="submit" size="lg">
              {tc("search")}
            </Button>
          </form>

          {/*
            No longer claims "No booking fees".
            A platform fee is charged to the customer at booking (see
            `src/lib/bookings/actions.ts`), so the old line was false the moment
            the fee shipped. Translating a false claim into six languages would
            have multiplied the problem rather than surfaced it.
          */}
          <p className="mt-4 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {t("trustLine")}
          </p>
        </div>
      </section>

      {/* ── Real stats bar ───────────────────────────────────────────────── */}
      {(stats.shopCount > 0 || stats.categoryCount > 0) && (
        <section className="border-b border-hairline bg-enamel">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <dl className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {stats.shopCount > 0 && (
                <StatPill
                  value={stats.shopCount}
                  label={t("stats.shops")}
                  suffix={t("stats.shopsSuffix")}
                />
              )}
              {stats.categoryCount > 0 && (
                <StatPill
                  value={stats.categoryCount}
                  label={t("stats.categories")}
                  suffix={t("stats.categoriesSuffix")}
                />
              )}
              {stats.verifiedCount > 0 && (
                <StatPill
                  value={stats.verifiedCount}
                  label={t("stats.verified")}
                  suffix={t("stats.verifiedSuffix")}
                  className="col-span-2 sm:col-span-1"
                />
              )}
            </dl>
          </div>
        </section>
      )}

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="categories-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("categories.eyebrow")}</p>
              <h2 id="categories-heading" className="mt-2 text-display-sm">
                {t("categories.heading")}
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              {t("categories.all")}
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id} className="rounded-machined border border-hairline">
                <Link
                  href={`/search?category=${category.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 bg-chalk p-5 transition-colors hover:bg-signal-wash rounded-machined"
                >
                  <div>
                    <span className="font-display text-base uppercase tracking-[0.04em] text-enamel transition-colors group-hover:text-signal">
                      {category.name}
                    </span>
                    {category.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-steel">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft transition-colors group-hover:text-signal">
                    {t("categories.findShops")}
                    <ArrowRight aria-hidden className="size-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 12 && (
            <div className="mt-6 text-center">
              <Button asChild variant="outline" size="md">
                <Link href="/search">
                  {t("categories.browseAll", { count: categories.length })}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="border-y border-hairline bg-bench-sunk/50"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="eyebrow">{t("how.eyebrow")}</p>
            <h2 id="how-it-works-heading" className="mt-2 text-display-sm">
              {t("how.heading")}
            </h2>
            <p className="mx-auto mt-3 max-w-[50ch] text-sm leading-relaxed text-steel">
              {t("how.intro")}
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline sm:grid-cols-3">
            <HowItWorksCard
              step="01"
              icon={<Search aria-hidden className="size-5" />}
              title={t("how.step1Title")}
              body={t("how.step1Body")}
            />
            <HowItWorksCard
              step="02"
              icon={<Clock aria-hidden className="size-5" />}
              title={t("how.step2Title")}
              body={t("how.step2Body")}
            />
            <HowItWorksCard
              step="03"
              icon={<Phone aria-hidden className="size-5" />}
              title={t("how.step3Title")}
              body={t("how.step3Body")}
            />
          </div>
        </div>
      </section>

      {/* ── Featured shops ───────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("featured.eyebrow")}</p>
              <h2 id="featured-heading" className="mt-2 text-display-sm">
                {t("featured.heading")}
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              {t("featured.cta")}
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>

          <ul className="mt-6 grid gap-3 lg:grid-cols-2">
            {featured.map((fixer, index) => (
              <ResultCard
                key={fixer.id}
                id={fixer.id}
                slug={fixer.slug}
                shopName={fixer.shop_name}
                address={fixer.address}
                photo={fixer.photos[0] ?? null}
                verified={fixer.verified}
                warrantyDays={fixer.default_warranty_days}
                ratingAvg={Number(fixer.rating_avg)}
                ratingCount={fixer.rating_count}
                categories={fixer.categories}
                hours={toHoursInput(fixer)}
                initialStatus={getShopStatus(toHoursInput(fixer))}
                index={index + 1}
                hasCoordinates={false}
              />
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/search">{t("featured.cta")}</Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── Trust pillars ─────────────────────────────────────────────────── */}
      <section
        className="border-t border-hairline bg-enamel"
        aria-labelledby="why-fixgrid-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="eyebrow text-steel-soft">{t("why.eyebrow")}</p>
            <h2
              id="why-fixgrid-heading"
              className="mt-2 text-display-sm text-bench"
            >
              {t("why.heading")}
            </h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <TrustPillar
              icon={<MapPin aria-hidden className="size-5" />}
              title={t("why.localTitle")}
              body={t("why.localBody")}
            />
            <TrustPillar
              icon={<ShieldCheck aria-hidden className="size-5" />}
              title={t("why.verifiedTitle")}
              body={t("why.verifiedBody")}
            />
            <TrustPillar
              icon={<Zap aria-hidden className="size-5" />}
              title={t("why.liveTitle")}
              body={t("why.liveBody")}
            />
            <TrustPillar
              icon={<Wrench aria-hidden className="size-5" />}
              title={t("why.repairTitle")}
              body={t("why.repairBody")}
            />
          </div>
        </div>
      </section>

      {/* ── Expert CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Badge variant="verified" className="mb-3">{t("join.badge")}</Badge>
              <h2 className="text-display-sm">{t("join.heading")}</h2>
              {/*
                Was "Add your shop to the directory for free … without paying
                platform commission". Listing now costs a one-time fee and the
                shop earns a 5% rebate on submitted bills, so the free/no-
                commission framing was no longer true.
              */}
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-steel">
                {t("join.body")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Button asChild size="lg">
                <Link href="/join">
                  {t("join.cta")}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {t("join.note")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatPill({
  value,
  label,
  suffix,
  className,
}: {
  value: number;
  label: string;
  suffix: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-display-sm text-bench">
        {value.toLocaleString()}
        <span className="ml-2 font-sans text-sm font-normal normal-case tracking-normal text-steel-soft">
          {suffix}
        </span>
      </dd>
    </div>
  );
}

function HowItWorksCard({
  step,
  icon,
  title,
  body,
}: {
  step: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-chalk p-6">
      <div className="flex items-start justify-between">
        <span className="inline-flex size-10 items-center justify-center rounded-machined border border-hairline bg-bench text-signal">
          {icon}
        </span>
        <span className="font-mono text-[2rem] font-bold leading-none text-bench-sunk">
          {step}
        </span>
      </div>
      <div>
        <h3 className="text-base">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-steel">{body}</p>
      </div>
    </div>
  );
}

function TrustPillar({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="inline-flex size-10 items-center justify-center rounded-machined border border-enamel-lift bg-enamel-lift text-signal">
        {icon}
      </span>
      <h3 className="mt-4 text-base text-bench">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-steel-soft">{body}</p>
    </div>
  );
}
