import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Prev/next only, plus a position readout.
 *
 * Numbered pagination is a lot of markup for a list nobody browses by page
 * number — with 1500+ generated pages, "page 37" is meaningless. Filtering is
 * how you find a page here; pagination is just how you scroll.
 *
 * Rendered as links rather than buttons so middle-click and open-in-new-tab
 * work, and so the whole thing functions without JavaScript.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const base =
    "inline-flex h-9 items-center gap-1.5 rounded-machined border border-hairline px-3 font-display text-sm uppercase tracking-wide transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4">
      {hasPrev ? (
        <Link href={buildHref(page - 1)} rel="prev" className={cn(base, "bg-chalk text-enamel hover:bg-bench")}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </Link>
      ) : (
        <span aria-disabled className={cn(base, "cursor-not-allowed bg-bench text-steel-soft")}>
          <ChevronLeft className="size-4" aria-hidden />
          Previous
        </span>
      )}

      <p className="font-mono text-xs tabular-nums text-steel">
        Page {page} of {pageCount}
      </p>

      {hasNext ? (
        <Link href={buildHref(page + 1)} rel="next" className={cn(base, "bg-chalk text-enamel hover:bg-bench")}>
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled className={cn(base, "cursor-not-allowed bg-bench text-steel-soft")}>
          Next
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
