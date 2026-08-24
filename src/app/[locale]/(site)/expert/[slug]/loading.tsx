import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the real layout so the page doesn't jump when content lands. */
export default function ExpertLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-11 w-2/3" />
          <Skeleton className="mt-4 h-4 w-48" />
          <Skeleton className="mt-3 h-4 w-72" />
          <Skeleton className="mt-8 aspect-[16/9] w-full" />
          <Skeleton className="mt-10 h-10 w-64" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    </div>
  );
}
