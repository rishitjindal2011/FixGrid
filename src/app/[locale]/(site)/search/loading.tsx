import { Skeleton } from "@/components/ui/skeleton";

/** Same three-column grid as the real page, so nothing shifts on arrival. */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[92rem] px-4 py-8">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-10 w-80" />
      <Skeleton className="mt-3 h-4 w-56" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <ul className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-40 w-full" />
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <Skeleton className="h-[calc(100vh-8rem)] w-full" />
        </div>
      </div>
    </div>
  );
}
