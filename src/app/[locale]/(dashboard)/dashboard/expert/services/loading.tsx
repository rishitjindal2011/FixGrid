import { Skeleton } from "@/components/ui/skeleton";

/**
 * Header, count line, then the catalogue table — the same rhythm the page
 * settles into, so the rows do not jump when the two reads land.
 *
 * Six row placeholders because a shop's catalogue is typically that order of
 * size; a taller block would collapse visibly on almost every shop.
 */
export default function ExpertServicesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36 w-full" />

      <Skeleton className="h-4 w-40" />

      <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
        <div className="border-b border-hairline p-3">
          <Skeleton className="h-4 w-full" />
        </div>

        <div className="flex flex-col gap-4 p-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
