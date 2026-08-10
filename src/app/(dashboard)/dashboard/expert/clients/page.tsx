import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ClientTable, type ClientSort } from "@/components/dashboard/expert/client-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listClients } from "@/lib/dashboard/expert";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

const SORTS: ClientSort[] = ["recent", "jobs", "spend"];

/**
 * The client list.
 *
 * Search and sort are applied here rather than in the query because
 * `listClients` already aggregates the shop's whole booking history in memory
 * to produce the per-client totals — there is no second round-trip to save by
 * pushing a filter down, and a shop's client list is bounded by the number of
 * people who have ever booked with one shop.
 */
export default async function ExpertClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/clients");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  // An unrecognised ?sort= falls back rather than throwing: the value arrives
  // from whatever the browser sent, and a typo in a shared link should still
  // render a list.
  const sort: ClientSort = SORTS.includes(params.sort as ClientSort)
    ? (params.sort as ClientSort)
    : "recent";

  const all = await listClients(shop.id);

  const needle = query.toLowerCase();
  const filtered = needle
    ? all.filter((client) =>
        [client.displayName, client.fullName, client.phone]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(needle)),
      )
    : all;

  const clients = [...filtered].sort((a, b) => {
    if (sort === "jobs") return b.bookingCount - a.bookingCount;
    if (sort === "spend") return b.totalSpentPence - a.totalSpentPence;
    // Recency: a client with no booking date sorts last rather than first,
    // which is what an empty string would do in a plain string compare.
    if (!a.lastBookingAt) return 1;
    if (!b.lastBookingAt) return -1;
    return b.lastBookingAt.localeCompare(a.lastBookingAt);
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Clients"
        description={
          all.length === 0
            ? "Everyone who books with you, with their history and your private notes."
            : `${all.length} ${all.length === 1 ? "person has" : "people have"} booked with you.`
        }
      />

      <ClientTable clients={clients} query={query} sort={sort} />
    </div>
  );
}
