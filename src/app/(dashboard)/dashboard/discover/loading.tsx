import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the two-column discover layout — rail on the left, card grid on the
 * right — so the grid does not shunt sideways when the query lands.
 */
export default function DiscoverLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-28 w-full" />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <Skeleton className="h-12 w-full lg:h-[32rem]" />

        <div>
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-4 pt-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
