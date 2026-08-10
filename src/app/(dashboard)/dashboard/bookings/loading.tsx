import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same block rhythm as the real page — header, a four-column board, a
 * table — so nothing jumps when the two reads land. The board skeleton is
 * `lg:grid-cols-4` for the same reason the board itself is: below that
 * breakpoint it is an accordion, which is one stack, not four.
 */
export default function BookingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />

      <div>
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-4 pt-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-72 w-full" />
      </div>
    </div>
  );
}
