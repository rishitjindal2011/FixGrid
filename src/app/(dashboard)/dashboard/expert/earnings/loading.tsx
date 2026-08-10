import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same block rhythm as the earnings screen — header, three metric cards, the
 * revenue chart, then the two ledgers — so nothing jumps when the reads land.
 *
 * The chart block is 22rem rather than the chart's own 280px: it stands in for
 * the whole card, which carries its key and padding above the plot.
 */
export default function ExpertEarningsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36 w-full" />

      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>

      <div>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-3 h-[22rem] w-full" />
      </div>

      <div>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-3 h-64 w-full" />
      </div>

      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
    </div>
  );
}
