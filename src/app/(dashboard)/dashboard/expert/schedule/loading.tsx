import { Skeleton } from "@/components/ui/skeleton";

/**
 * Header, the calendar toolbar, then the grid with the two editors under it —
 * the same block rhythm the page settles into, so nothing jumps when the four
 * reads land.
 *
 * The grid placeholder is tall because the week view is: ten hour rows at
 * 3.25rem each plus its own header and legend. Sizing it to the empty case
 * instead would collapse visibly on every shop that has work booked.
 */
export default function ExpertScheduleLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36 w-full" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-10" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="size-10" />
            <Skeleton className="ml-1 h-5 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <Skeleton className="h-[26rem] w-full" />
      </div>

      <Skeleton className="h-[34rem] w-full" />

      <Skeleton className="h-80 w-full" />
    </div>
  );
}
