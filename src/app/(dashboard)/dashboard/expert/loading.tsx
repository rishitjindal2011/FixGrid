import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same block rhythm as the real dashboard — header, four tiles, the request
 * queue, then today beside the month — so nothing jumps when the reads land.
 *
 * This boundary covers the ownership gate as well as the page. A user with no
 * shop is redirected to /join from here, so the only resolution that renders
 * beneath this skeleton is the dashboard itself.
 */
export default function ExpertDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36 w-full" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>

      <div>
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-col gap-3 pt-3">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-3 h-64 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-72 w-full" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[4.5rem] w-full" />
        ))}
      </div>
    </div>
  );
}
