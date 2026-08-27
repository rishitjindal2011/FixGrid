import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real layout — header, four tiles, escrow panel, table — so the
 * page does not jump when the billing reads land.
 */
export default function BillingLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-[104px] w-full" />
        ))}
      </div>

      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>

      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-64 w-full" />
      </div>
    </div>
  );
}
