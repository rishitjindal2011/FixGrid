import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same block rhythm as the real page — header, four tiles, two card
 * stacks — so the layout does not jump when the reads land.
 */
export default function WarrantyLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>

      <div>
        <Skeleton className="h-5 w-44" />
        <div className="flex flex-col gap-3 pt-3">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-3 pt-3">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
