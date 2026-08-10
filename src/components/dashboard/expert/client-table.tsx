import Link from "next/link";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { formatMoney, formatRelative } from "@/lib/format";
import type { ExpertClient } from "@/lib/dashboard/expert";
import { cn } from "@/lib/utils";

/**
 * The client list.
 *
 * A server component, and the search box is a GET form rather than `useState`
 * for the reason the rest of the dashboard uses URL state: a shop that searches
 * "Patel", opens a client and hits back expects the search still there. Holding
 * it in component state loses it on every navigation.
 *
 * Sorting is likewise a link, not a handler. Three sort orders and a query
 * string cost nothing to render on the server, and the result is a page that can
 * be bookmarked and shared with a colleague.
 */

export type ClientSort = "recent" | "jobs" | "spend";

const SORTS: { key: ClientSort; label: string }[] = [
  { key: "recent", label: "Last seen" },
  { key: "jobs", label: "Jobs" },
  { key: "spend", label: "Spend" },
];

export function ClientTable({
  clients,
  query,
  sort,
}: {
  clients: ExpertClient[];
  query: string;
  sort: ClientSort;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <form method="get" className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="client-search" className="eyebrow text-steel">
              Search
            </label>
            <Input
              id="client-search"
              name="q"
              defaultValue={query}
              placeholder="Name or phone"
              className="w-full sm:w-64"
            />
          </div>
          {/* Preserved so searching does not silently reset the sort order. */}
          <input type="hidden" name="sort" value={sort} />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <nav aria-label="Sort clients" className="flex items-center gap-1">
          <span className="eyebrow mr-1 text-steel-soft">Sort</span>
          {SORTS.map((option) => {
            const active = option.key === sort;
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            params.set("sort", option.key);

            return (
              <Link
                key={option.key}
                href={`/dashboard/expert/clients?${params.toString()}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-machined px-2.5 py-1 font-display text-xs uppercase tracking-wide transition-colors",
                  active
                    ? "bg-enamel text-bench"
                    : "text-steel hover:bg-bench hover:text-enamel",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {clients.length === 0 ? (
        query ? (
          <EmptyState
            title="No client matches that"
            description={`Nothing for "${query}". Clear the search to see everyone who has booked with you.`}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/expert/clients">Clear search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No clients yet"
            description="Anyone who books with you appears here, with their history and your private notes on them."
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/expert/requests">See open requests</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-machined border border-hairline bg-chalk shadow-bench">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-bench-sunk text-left">
                <th scope="col" className="eyebrow px-4 py-2.5 text-steel">Client</th>
                <th scope="col" className="eyebrow px-4 py-2.5 text-right text-steel">Jobs</th>
                <th scope="col" className="eyebrow px-4 py-2.5 text-right text-steel">Spent</th>
                <th scope="col" className="eyebrow px-4 py-2.5 text-right text-steel">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {clients.map((client) => (
                <tr key={client.id} className="transition-colors hover:bg-bench">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/expert/clients/${client.id}`}
                      className="flex items-center gap-3 text-enamel hover:text-signal"
                    >
                      <UserAvatar
                        name={client.displayName}
                        src={client.avatarUrl}
                        className="size-8 shrink-0"
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{client.displayName}</span>
                        {client.phone ? (
                          <span className="font-mono text-xs text-steel">{client.phone}</span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-enamel">
                    {client.bookingCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-enamel">
                    {formatMoney(client.totalSpentPence)}
                  </td>
                  <td className="px-4 py-3 text-right text-steel">
                    {client.lastBookingAt ? formatRelative(client.lastBookingAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
