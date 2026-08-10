import { Skeleton } from "@/components/ui/skeleton";

/**
 * The same header-plus-two-panes grid as the real inbox, so arriving content
 * does not shove the page around. The right pane is desktop-only here for the
 * same reason it is there: on a phone the list is the whole screen.
 */
export default function MessagesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex gap-3 border-b border-hairline p-3 last:border-b-0">
              <Skeleton className="size-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="mt-2 h-2.5 w-20" />
                <Skeleton className="mt-2.5 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="hidden h-100 w-full lg:block" />
      </div>
    </div>
  );
}
