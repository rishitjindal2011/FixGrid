"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Tab shell only. Both panels are server-rendered and passed in as children,
 * so review markup and JSON-LD stay on the server and neither panel's content
 * ships as client JS.
 */
export function ExpertTabs({
  about,
  reviews,
  reviewCount,
}: {
  about: React.ReactNode;
  reviews: React.ReactNode;
  reviewCount: number;
}) {
  // `?tab=reviews` has to actually land on reviews — the sign-in round-trip
  // from the review gate returns here and would otherwise drop the visitor back
  // on About, having forgotten why they signed in. Read on the client rather
  // than from the page's `searchParams`, because touching those in the page
  // would opt this route out of static generation.
  const requested = useSearchParams().get("tab") === "reviews" ? "reviews" : "about";

  // Keyed rather than controlled: on a prerendered route the param is only
  // legible after hydration, and keying lets the resolved value re-seed
  // `defaultValue` without an effect that writes state on every param change.
  // Tab clicks stay uncontrolled; only a change of `?tab=` resets the choice,
  // which is what arriving on a new URL should do.
  return (
    <Tabs key={requested} defaultValue={requested}>
      <TabsList>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="reviews">
          Reviews
          <span className="ml-2 font-mono text-xs tabular-nums text-steel-soft">
            {reviewCount}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="about">{about}</TabsContent>
      <TabsContent value="reviews">{reviews}</TabsContent>
    </Tabs>
  );
}
