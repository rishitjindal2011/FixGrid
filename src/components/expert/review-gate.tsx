"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ReviewForm } from "@/components/expert/review-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ReviewWithAuthor } from "@/lib/types/database";

/**
 * Decides what the current visitor may do about reviews, in the browser.
 *
 * Why client-side: `/expert/[slug]` is ISR (`revalidate = 600`) and is the
 * page the whole SEO effort exists to rank. Reading cookies during render —
 * which is what a server-side session check does — opts the route out of static
 * generation entirely, turning every profile into a per-request render. Trading
 * that away for an authoring affordance most visitors never use is the wrong
 * bargain, so the static shell ships to everyone and only this control resolves
 * per session.
 *
 * The list itself stays server-rendered and arrives as `children`, so review
 * text and its markup are in the HTML for crawlers regardless of this gate.
 *
 * Nothing here is a security boundary. The RLS policies decide what may be
 * written; this only decides what to offer.
 */

type Viewer =
  | { state: "loading" }
  | { state: "anonymous" }
  | { state: "owner" }
  | { state: "customer"; userId: string };

export function ReviewGate({
  fixerId,
  slug,
  ownerId,
  reviews,
  children,
}: {
  fixerId: string;
  slug: string;
  ownerId: string | null;
  reviews: ReviewWithAuthor[];
  children: React.ReactNode;
}) {
  const [viewer, setViewer] = useState<Viewer>({ state: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // `onAuthStateChange` fires once with the current session on subscribe, so
    // it covers the initial read as well as later sign-in/sign-out — no
    // separate getSession() call, and no stale UI if the user signs out in
    // another tab.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const userId = session?.user.id;
      if (!userId) return setViewer({ state: "anonymous" });
      if (ownerId && userId === ownerId) return setViewer({ state: "owner" });
      setViewer({ state: "customer", userId });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [ownerId]);

  return (
    <div className="space-y-8">
      <ReviewAction
        viewer={viewer}
        fixerId={fixerId}
        slug={slug}
        reviews={reviews}
      />
      {children}
    </div>
  );
}

function ReviewAction({
  viewer,
  fixerId,
  slug,
  reviews,
}: {
  viewer: Viewer;
  fixerId: string;
  slug: string;
  reviews: ReviewWithAuthor[];
}) {
  switch (viewer.state) {
    // Reserve the space the resolved control will occupy. Collapsing to nothing
    // and then expanding shoves the review list down under the reader's cursor.
    case "loading":
      return <div aria-hidden className="h-24 rounded-machined bg-bench-sunk/60" />;

    case "owner":
      return (
        <p className="rounded-machined border border-hairline bg-bench-sunk px-4 py-3 text-sm text-steel">
          This is your shop, so you can&apos;t review it.
        </p>
      );

    case "customer": {
      const existing = reviews.find((review) => review.customer_id === viewer.userId);
      return (
        <ReviewForm
          fixerId={fixerId}
          slug={slug}
          existing={existing ? { rating: existing.rating, text: existing.text } : undefined}
        />
      );
    }

    case "anonymous":
      return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
          <div>
            <p className="font-display text-lg uppercase text-enamel">Used this shop?</p>
            <p className="mt-1 text-sm text-steel">
              Sign in to leave a review. It takes a minute.
            </p>
          </div>
          {/* `next` returns them to this profile on the reviews tab, rather than
              to the home page having forgotten why they signed in. */}
          <Button asChild variant="outline">
            <Link href={`/login?next=${encodeURIComponent(`/expert/${slug}?tab=reviews`)}`}>
              Sign in to review
            </Link>
          </Button>
        </div>
      );
  }
}
