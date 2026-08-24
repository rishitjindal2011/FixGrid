import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same block rhythm as the queue itself — header, a section heading, then
 * tall request cards — so nothing jumps when the three reads land.
 *
 * Three cards rather than one: a shop opening this screen usually has a handful
 * waiting, and a single placeholder would collapse the page height and then
 * shove the footer down.
 */
export default function ExpertRequestsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />

      <div>
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-col gap-3 pt-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
