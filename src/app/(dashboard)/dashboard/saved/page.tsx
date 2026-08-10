import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Heart, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ExpertCard } from "@/components/dashboard/expert-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { toggleSavedExpert } from "@/lib/bookings/actions";
import { listSavedExperts } from "@/lib/dashboard/customer";

export const metadata: Metadata = {
  title: "Saved shops",
  robots: { index: false, follow: false },
};

/**
 * Shops this customer has hearted.
 *
 * The `saved_experts` table and its toggle action have existed since the
 * marketplace migration, and the heart was already rendered on every card in
 * Discover — but nothing ever listed the result back. Saving something you can
 * never find again is worse than not offering to save it at all.
 *
 * `listSavedExperts` already joins through to `fixer_profiles`, so this reuses
 * the same `ExpertCard` as Discover rather than a bespoke row: a saved shop and
 * a searched shop are the same object, and two presentations of it would drift.
 */
export default async function SavedExpertsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/saved");

  const saved = await listSavedExperts(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your account"
        title="Saved shops"
        description={
          saved.length > 0
            ? "The shops you have kept. Book again without searching."
            : "Shops you save are kept here, ready for the next repair."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/discover">
              <Search aria-hidden />
              Find an expert
            </Link>
          </Button>
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any shop to keep it here. Handy for the ones you would use again."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/discover">Browse shops</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((shop) => (
            <li key={shop.id}>
              {/*
                `isSaved` is true for every card here by definition, so
                un-hearting one revalidates and drops it from the list — which is
                what a favourites screen should do.

                The fields `listSavedExperts` does not fetch are filled with
                neutral values rather than a second query per card: this page
                answers "which shops did I keep", and a price-from or category
                list would cost one round-trip each to say something the shop's
                own page says better.
              */}
              <ExpertCard
                expert={{
                  id: shop.id,
                  slug: shop.slug,
                  shopName: shop.shopName,
                  address: shop.address,
                  verified: shop.verified,
                  ratingAvg: shop.ratingAvg,
                  ratingCount: shop.ratingCount,
                  acceptsBookings: shop.acceptsBookings,
                  responseHours: 0,
                  priceFromPence: null,
                  categories: [],
                  isSaved: true,
                }}
                toggleSaved={toggleSavedExpert}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
