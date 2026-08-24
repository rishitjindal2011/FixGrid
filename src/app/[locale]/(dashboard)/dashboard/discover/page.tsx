import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { SearchX, Store } from "lucide-react";
import { z } from "zod";

import { DiscoverFilterRail } from "@/components/dashboard/discover-filters";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ExpertCard } from "@/components/dashboard/expert-card";
import { PageHeader } from "@/components/dashboard/page-header";
import type { SaveExpertState } from "@/components/dashboard/save-expert-button";
import { Button } from "@/components/ui/button";
import {
  DISCOVER_RESULT_LIMIT,
  DISCOVER_SORT_LABELS,
  countActiveDiscoverFilters,
  listDiscoverExperts,
  parseDiscoverParams,
} from "@/lib/dashboard/discover";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedShop } from "@/lib/dashboard/owned-shop";
import { getCategories } from "@/lib/queries/search";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Find an expert",
  robots: { index: false, follow: false },
};

const DISCOVER_PATH = "/dashboard/discover";

const SORT_OPTIONS = Object.entries(DISCOVER_SORT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SaveSchema = z.object({
  fixerId: z.string().uuid(),
  // What the client believed the state was. The server toggles away from that
  // rather than reading the row first: two rapid taps then land on one answer
  // instead of racing a read against a write.
  saved: z.enum(["0", "1"]),
});

/**
 * Save or unsave a shop.
 *
 * Defined here rather than in a lib module because it is this page's write and
 * nothing else uses it. `saved_experts` is keyed `(user_id, fixer_id)`, so the
 * insert is an upsert that ignores a duplicate — a stale "0" from a card that
 * was already hearted must not throw 23505 in the customer's face.
 */
async function toggleSavedExpert(
  _prev: SaveExpertState,
  formData: FormData,
): Promise<SaveExpertState> {
  "use server";

  const parsed = SaveSchema.safeParse({
    fixerId: formData.get("fixerId"),
    saved: formData.get("saved"),
  });

  if (!parsed.success) {
    return { saved: false, error: "We couldn't save that shop." };
  }

  const wasSaved = parsed.data.saved === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { saved: wasSaved, error: "Sign in to save shops." };
  }

  const { error } = wasSaved
    ? await supabase
        .from("saved_experts")
        .delete()
        .eq("user_id", user.id)
        .eq("fixer_id", parsed.data.fixerId)
    : await supabase
        .from("saved_experts")
        .upsert(
          { user_id: user.id, fixer_id: parsed.data.fixerId },
          { onConflict: "user_id,fixer_id", ignoreDuplicates: true },
        );

  if (error) {
    // The heart stays where the customer left it on failure — snapping it back
    // reads as "the shop vanished" rather than "that didn't save".
    if (error.code === "42501") {
      return { saved: wasSaved, error: "You do not have permission to do that." };
    }
    console.error("[discover] toggle saved failed", {
      code: error.code,
      message: error.message,
    });
    return { saved: wasSaved, error: "We couldn't save that shop. Try again in a moment." };
  }

  // The saved list is its own page, and the heart state is baked into the
  // cards here, so both have to re-read.
  revalidatePath(DISCOVER_PATH);
  revalidatePath("/dashboard/saved");

  return { saved: !wasSaved, error: null };
}

/**
 * The expert directory.
 *
 * Filter state lives entirely in the query string. That is what makes a
 * filtered view something a customer can send to a housemate, and what makes
 * the back button undo one filter rather than leaving the page — the rail only
 * pushes URLs, and this Server Component re-runs the query for each one.
 *
 * Both reads degrade to empty. Before the migration runs `shop_services` and
 * `saved_experts` do not exist, and a directory that 500s is worse than one
 * that says it found nothing.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseDiscoverParams(await searchParams);
  const activeCount = countActiveDiscoverFilters(filters);

  const user = await getCurrentUser();

  const [experts, categories, ownedShop] = await Promise.all([
    listDiscoverExperts(filters),
    getCategories(),
    user ? getOwnedShop(user.id) : Promise.resolve(null),
  ]);

  /*
   * Your own shop is not a search result.
   *
   * `search_fixers` has no notion of who is asking, so an owner browsing the
   * directory sees their own listing with a Book button on it — and the
   * `customer requests booking` policy refuses that insert with 42501, which
   * reaches them as a bare "You do not have permission to do that." The booking
   * page turns this away too; removing the card is what stops them walking into
   * it in the first place.
   */
  const visible = ownedShop
    ? experts.filter((expert) => expert.id !== ownedShop.id)
    : experts;

  const filtered = activeCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Discover"
        title="Find an expert"
        description="Every shop here is a real business with a real address. Filter down to what you need, then book a slot straight from the card."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/search">
              <Store aria-hidden />
              Browse the map
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        {/* Sticky only where there is height to spare; on a phone the rail is a
            collapsed disclosure and pinning it would eat the viewport. */}
        <aside className="lg:sticky lg:top-6">
          <DiscoverFilterRail
            categories={categories}
            filters={filters}
            sortOptions={SORT_OPTIONS}
            activeCount={activeCount}
          />
        </aside>

        <section aria-label="Shops">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
            <p className="text-sm text-steel" aria-live="polite">
              <span className="font-mono tabular-nums text-enamel">{visible.length}</span>{" "}
              {visible.length === 1 ? "shop" : "shops"}
              {filtered ? (
                <>
                  {" "}
                  matching{" "}
                  <span className="font-mono tabular-nums text-enamel">{activeCount}</span>{" "}
                  {activeCount === 1 ? "filter" : "filters"}
                </>
              ) : null}
            </p>

            {/* Named rather than implied: a full page of results at the cap
                looks identical to a complete list, and narrowing is the fix.
                Measured against the unfiltered count on purpose — dropping the
                owner's own card must not read as "there is no more to see". */}
            {experts.length >= DISCOVER_RESULT_LIMIT ? (
              <p className="text-xs text-steel-soft">
                Showing the first {DISCOVER_RESULT_LIMIT}. Narrow the filters to see more.
              </p>
            ) : null}
          </div>

          {visible.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((expert) => (
                <li key={expert.id} className="flex">
                  <ExpertCard expert={expert} toggleSaved={toggleSavedExpert} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={SearchX}
              title={filtered ? "Nothing matches those filters" : "No shops listed yet"}
              description={
                filtered
                  ? "Try dropping the price ceiling or the rating floor — most shops quote on inspection rather than listing a price for every job."
                  : "We're still signing up shops in your area. The public map covers a wider radius in the meantime."
              }
              action={
                filtered ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={DISCOVER_PATH}>Clear filters</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/search">Browse the map</Link>
                  </Button>
                )
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
