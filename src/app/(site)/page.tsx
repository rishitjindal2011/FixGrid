import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";

import { ResultCard } from "@/components/search/result-card";
import { Button } from "@/components/ui/button";
import { getShopStatus } from "@/lib/hours";
import { getCategories, getFeaturedFixers, toHoursInput } from "@/lib/queries/search";
import { absoluteUrl, SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/site";
import { isSignedIn } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 900;

export const metadata: Metadata = {
  title: {
    absolute: `FixGrid — ${SITE_TAGLINE}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
};

export default async function HomePage() {
  const signedIn = await isSignedIn();
  if (signedIn) {
    redirect("/dashboard");
  }

  const [categories, featured] = await Promise.all([getCategories(), getFeaturedFixers(6)]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/*
        The grid is a separate absolutely-positioned layer rather than a class on
        this section. `.schematic-fade` is a CSS mask, and a mask applies to the
        element's whole subtree — put it on the section and it fades the heading,
        the copy and the search field along with the graph paper, which is
        exactly what it used to do here. Masking a sibling layer keeps the
        decoration soft and the content at full contrast.
      */}
      <section className="relative border-b border-hairline">
        <div
          aria-hidden
          className="schematic schematic-fade pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <p className="eyebrow">Local repair directory</p>
          <h1 className="mt-4 text-display-lg">Someone near you can fix that</h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-steel">
            {SITE_DESCRIPTION}
          </p>

          {/* A plain GET form, so the hero works with JavaScript disabled and
              lands on exactly the same URL the filter panel would produce. */}
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

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="mt-2 text-display-sm">What are you fixing?</h2>
            </div>
            <Link
              href="/search"
              className="hidden shrink-0 items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel transition-colors hover:text-signal sm:inline-flex"
            >
              All categories
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>

          <ul className="mt-6 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id}>
                <Link
                  href={`/search?category=${category.slug}`}
                  className="group flex h-full flex-col justify-between gap-2 bg-chalk p-5 transition-colors hover:bg-signal-wash"
                >
                  <span className="font-display text-base uppercase tracking-[0.04em] text-enamel">
                    {category.name}
                  </span>
                  {category.description ? (
                    <span className="line-clamp-2 text-sm leading-relaxed text-steel">
                      {category.description}
                    </span>
                  ) : null}
                  <span className="mt-1 inline-flex items-center gap-1 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft transition-colors group-hover:text-signal">
                    Find shops
                    <ArrowRight aria-hidden className="size-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Featured shops ───────────────────────────────────────────────── */}
      {featured.length > 0 ? (
        <section className="border-y border-hairline bg-bench-sunk/50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="eyebrow">Top rated</p>
            <h2 className="mt-2 text-display-sm">Well-reviewed shops in the registry</h2>

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
          </div>
        </section>
      ) : null}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 text-display-sm">Three things, no account needed</h2>

        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <HowItWorks
            icon={<Search aria-hidden className="size-5" />}
            title="Search by what broke"
            body="Filter by category, rating and whether they come to you, collect the item, or work in-shop."
          />
          <HowItWorks
            icon={<MapPin aria-hidden className="size-5" />}
            title="See who's open now"
            body="Every listing carries a live opening-hours readout in the shop's own timezone, not a stale table."
          />
          <HowItWorks
            icon={<ShieldCheck aria-hidden className="size-5" />}
            title="Call them directly"
            body="Phone numbers and directions are on the page. We don't sit between you and the repair."
          />
        </div>
      </section>
    </>
  );
}

function HowItWorks({
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
      <span className="inline-flex size-10 items-center justify-center rounded-machined border border-hairline bg-chalk text-signal">
        {icon}
      </span>
      <h3 className="mt-4 text-base">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-steel">{body}</p>
    </div>
  );
}
