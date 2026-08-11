import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
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

  const [categories, featured, stats] = await Promise.all([
    getCategories(),
    getFeaturedFixers(6),
    getDirectoryStats(),
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
          <p className="eyebrow">Local repair directory</p>
          <h1 className="mt-4 text-display-lg">Someone near you can fix that</h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-steel">
            {SITE_DESCRIPTION}
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
                What needs fixing?
              </label>
              <input
                id="home-q"
                name="q"
                type="search"
                maxLength={80}
                placeholder="Cracked screen, leaking tap, torn seam…"
                className="h-12 w-full rounded-machined border border-hairline bg-chalk pl-10 pr-3 text-base text-enamel shadow-bench outline-none placeholder:text-steel-soft focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/25"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>

          <p className="mt-4 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            Live opening hours · Verified shops · No booking fees
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
                  label="Repair shops"
                  suffix="in the directory"
                />
              )}
              {stats.categoryCount > 0 && (
                <StatPill
                  value={stats.categoryCount}
                  label="Repair categories"
                  suffix="covered"
                />
              )}
              {stats.verifiedCount > 0 && (
                <StatPill
                  value={stats.verifiedCount}
                  label="Verified shops"
                  suffix="with confirmed details"
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
              <p className="eyebrow">Browse by type</p>
              <h2 id="categories-heading" className="mt-2 text-display-sm">
                What are you fixing?
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              All categories
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
                    Find shops
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
                  Browse all {categories.length} categories
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
            <p className="eyebrow">How it works</p>
            <h2 id="how-it-works-heading" className="mt-2 text-display-sm">
              Find your fixer in three steps
            </h2>
            <p className="mx-auto mt-3 max-w-[50ch] text-sm leading-relaxed text-steel">
              No account. No middleman. No booking fees. Just a straight line
              between you and the person who can fix your thing.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline sm:grid-cols-3">
            <HowItWorksCard
              step="01"
              icon={<Search aria-hidden className="size-5" />}
              title="Search by what broke"
              body="Filter by repair type, minimum rating, service option — in-shop, home visit or pickup — and location. Every predicate runs in the database, not on your device."
            />
            <HowItWorksCard
              step="02"
              icon={<Clock aria-hidden className="size-5" />}
              title="Check who's open now"
              body="Every listing shows a live opening-hours readout in the shop's own timezone. Not a stale table — the dot you see is accurate to the minute."
            />
            <HowItWorksCard
              step="03"
              icon={<Phone aria-hidden className="size-5" />}
              title="Call them directly"
              body="Phone numbers, directions and service options are all on the page. We don't sit between you and the repair — no platform fee, no delayed response."
            />
          </div>
        </div>
      </section>

      {/* ── Featured shops ───────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Top rated</p>
              <h2 id="featured-heading" className="mt-2 text-display-sm">
                Well-reviewed shops in the registry
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              Browse all
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
              <Link href="/search">Browse the full directory</Link>
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
            <p className="eyebrow text-steel-soft">Why FixGrid</p>
            <h2
              id="why-fixgrid-heading"
              className="mt-2 text-display-sm text-bench"
            >
              Built for the repair economy
            </h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <TrustPillar
              icon={<MapPin aria-hidden className="size-5" />}
              title="Local first"
              body="Every shop is a real business with a real address — not a national chain or a remote call centre."
            />
            <TrustPillar
              icon={<ShieldCheck aria-hidden className="size-5" />}
              title="Verified listings"
              body="Verified shops have had their address, phone number and opening hours confirmed by the FixGrid team."
            />
            <TrustPillar
              icon={<Zap aria-hidden className="size-5" />}
              title="Live status"
              body="Opening hours are stored per-day, per-timezone and rendered in real time — not cached from last month."
            />
            <TrustPillar
              icon={<Wrench aria-hidden className="size-5" />}
              title="Repair not replace"
              body="Every repair is an item that doesn't go to landfill. FixGrid exists because fixing things is worth doing."
            />
          </div>
        </div>
      </section>

      {/* ── Expert CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Badge variant="verified" className="mb-3">For repair shops</Badge>
              <h2 className="text-display-sm">
                Run a repair business?
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-steel">
                Add your shop to the directory for free. Set your hours, list
                your services and specialisms, and let customers find you
                without paying platform commission.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Button asChild size="lg">
                <Link href="/join">
                  List your shop — free
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                No commission · No subscription
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
