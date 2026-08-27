import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/seo/JsonLd";
import { FilterPanel } from "@/components/search/filter-panel";
import { ResultCard } from "@/components/search/result-card";
import { SearchMap, type SearchMapPin } from "@/components/search/search-map";
import { SelectionProvider } from "@/components/search/selection-context";
import { Button } from "@/components/ui/button";

import { getShopStatus } from "@/lib/hours";
import {
  countActiveFilters,
  getCategories,
  isFilterActive,
  parseSearchParams,
  searchFixers,
  toHoursInput,
  SEARCH_RESULT_LIMIT,
  type SearchFilters,
} from "@/lib/queries/search";
import { buildBreadcrumbs, buildWebPage, type Thing, type WithContext } from "@/lib/seo/jsonld";
import { absoluteUrl, SITE_KEYWORDS } from "@/lib/site";

// Results depend on the query string and on data that changes as shops are
// added, so this page is always rendered per-request.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Only the bare directory and single-category views are worth indexing.
 * Every other combination of rating, service flags and viewport is a
 * near-duplicate of one of those, and letting crawlers loose on them is the
 * classic faceted-navigation index-bloat trap.
 */
function isIndexable(filters: SearchFilters): boolean {
  return (
    filters.q === "" &&
    filters.minRating === 0 &&
    filters.minWarrantyDays === 0 &&
    filters.bbox === null &&
    !filters.services.inShop &&
    !filters.services.homeService &&
    !filters.services.pickupDrop
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const filters = parseSearchParams(await searchParams);
  const indexable = isIndexable(filters);

  let title = "Find a repair expert near you";
  let description =
    "Search local repair shops by category, rating and service type. See who is open right now, what they fix, and how to reach them.";
  // Every /search view carries the site keyword set; a category view leads with
  // its own, more specific terms so the tag echoes the page's actual topic.
  let keywords: string[] = SITE_KEYWORDS;

  if (filters.category) {
    const categories = await getCategories();
    const match = categories.find((category) => category.slug === filters.category);
    if (match) {
      title = `${match.name} repair shops near you`;
      description =
        match.description ??
        `Browse ${match.name.toLowerCase()} repair specialists. Compare ratings, opening hours and service options.`;
      const term = match.name.toLowerCase();
      keywords = [
        `${term} repair`,
        `${term} repair shops`,
        `${term} repair near me`,
        `${term} repair experts`,
        ...SITE_KEYWORDS,
      ];
    }
  }

  // The canonical drops every non-indexable parameter, so all the facet
  // permutations consolidate onto one address.
  const canonicalQuery = filters.category ? `?category=${filters.category}` : "";

  return {
    title,
    description,
    keywords,
    alternates: { canonical: absoluteUrl(`/search${canonicalQuery}`) },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(`/search${canonicalQuery}`),
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const filters = parseSearchParams(await searchParams);

  // Independent queries, so they run concurrently rather than in series.
  const [outcome, categories, t] = await Promise.all([
    searchFixers(filters),
    getCategories(),
    getTranslations("search"),
  ]);

  const activeCategory = filters.category
    ? categories.find((category) => category.slug === filters.category)
    : undefined;

  const pins: SearchMapPin[] = outcome.results
    .filter((result) => result.lat !== null && result.lng !== null)
    .map((result) => ({
      id: result.id,
      slug: result.slug,
      shopName: result.shop_name,
      address: result.address,
      lat: result.lat as number,
      lng: result.lng as number,
    }));

  const heading = activeCategory
    ? t("headingCategory", { category: activeCategory.name })
    : t("heading");

  /*
   * The count is an ICU plural in the catalogue rather than a `pluralize()` call,
   * because plural rules are per-language: Hindi and Marathi agree with English
   * here, but the rule set is the translator's to state, not ours to hardcode.
   *
   * The truncated branch is a separate message so the "+" lands on the digits and
   * not after the noun. Safe: `truncated` means the row cap was reached, so the
   * count there is SEARCH_RESULT_LIMIT and never 1.
   */
  const matchLabel = outcome.truncated
    ? t("matchingMore", { count: outcome.results.length })
    : t("matching", { count: outcome.results.length });

  const schemas: WithContext<Thing>[] = [];
  if (isIndexable(filters)) {
    schemas.push(
      buildWebPage({
        name: heading,
        description: activeCategory?.description ?? undefined,
        url: absoluteUrl(`/search${activeCategory ? `?category=${activeCategory.slug}` : ""}`),
      }),
    );
    const breadcrumbs = buildBreadcrumbs(
      activeCategory
        ? [
            { name: "Home", path: "/" },
            { name: "Experts", path: "/search" },
            { name: activeCategory.name, path: `/search?category=${activeCategory.slug}` },
          ]
        : [
            { name: "Home", path: "/" },
            { name: "Experts", path: "/search" },
          ],
    );
    if (breadcrumbs) schemas.push(breadcrumbs);
  }

  return (
    <>
      {schemas.length > 0 ? <JsonLd data={schemas} /> : null}

      <div className="mx-auto max-w-[92rem] px-4 py-8">
        <header className="mb-6">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-2 text-display">{heading}</h1>
          <p className="mt-2 text-sm text-steel">
            {outcome.failed ? t("unavailable") : matchLabel}
          </p>
        </header>

        <SelectionProvider>
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,26rem)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-machined bg-bench-sunk" />}>
                <FilterPanel
                  categories={categories}
                  activeCount={countActiveFilters(filters)}
                />
              </Suspense>
            </aside>

            <section aria-label={t("resultsLabel")}>
              {outcome.failed ? (
                <ErrorState />
              ) : outcome.results.length === 0 ? (
                <EmptyState hasFilters={isFilterActive(filters)} />
              ) : (
                <>
                  <ul className="space-y-3">
                    {outcome.results.map((result, index) => (
                      <ResultCard
                        key={result.id}
                        id={result.id}
                        slug={result.slug}
                        shopName={result.shop_name}
                        address={result.address}
                        photo={result.photos[0] ?? null}
                        verified={result.verified}
                        warrantyDays={result.default_warranty_days}
                        ratingAvg={Number(result.rating_avg)}
                        ratingCount={result.rating_count}
                        categories={result.categories}
                        hours={toHoursInput(result)}
                        initialStatus={getShopStatus(toHoursInput(result))}
                        index={index + 1}
                        hasCoordinates={result.lat !== null && result.lng !== null}
                      />
                    ))}
                  </ul>

                  {outcome.truncated ? (
                    <p className="mt-6 rounded-machined border border-dashed border-hairline p-4 text-center text-sm text-steel">
                      {t("truncated", { limit: SEARCH_RESULT_LIMIT })}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            {/* The map is decorative on small screens — the list already answers
                the question — so it only appears once there's room for both. */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 h-[calc(100vh-8rem)]">
                <Suspense fallback={<div className="size-full animate-pulse rounded-machined bg-bench-sunk" />}>
                  <SearchMap pins={pins} />
                </Suspense>
              </div>
            </aside>
          </div>
        </SelectionProvider>
      </div>
    </>
  );
}

async function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const t = await getTranslations("search.empty");

  return (
    // Same correction as the homepage hero: `schematic-fade` is a mask, so on
    // this container it faded the message itself — the one thing someone who
    // found nothing actually needs to read. The grid rides on its own layer.
    <div className="relative overflow-hidden rounded-machined border border-dashed border-hairline px-6 py-16 text-center">
      <div
        aria-hidden
        className="schematic schematic-fade pointer-events-none absolute inset-0"
      />

      <div className="relative">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-3 text-display-sm">{t("heading")}</h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-steel">
          {hasFilters
            ? "No shop matches every filter at once. Loosening the rating or warranty floor, or clearing the service type, usually helps."
            : "There are no repair shops in the registry for this area yet."}
        </p>
        {hasFilters ? (
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/search">Clear all filters</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

async function ErrorState() {
  const t = await getTranslations("search.error");

  return (
    <div className="rounded-machined border border-rust/30 bg-rust-wash px-6 py-12 text-center">
      <p className="eyebrow text-rust">{t("eyebrow")}</p>
      <h2 className="mt-3 text-display-sm">We couldn&apos;t run that search</h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-steel">
        The directory didn&apos;t respond. This is on our side, not yours — your filters are
        still in the address bar, so a refresh will retry exactly this search.
      </p>
    </div>
  );
}
