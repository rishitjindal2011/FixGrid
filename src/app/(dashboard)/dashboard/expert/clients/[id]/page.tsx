import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Phone } from "lucide-react";

import { ClientNotes } from "@/components/dashboard/expert/client-notes";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { UserAvatar } from "@/components/ui/avatar";
import { getCurrentUser } from "@/lib/auth/session";
import { slotStart } from "@/lib/bookings/actions-map";
import { getMyShop } from "@/lib/dashboard/claims";
import { getClient } from "@/lib/dashboard/expert";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Client",
  robots: { index: false, follow: false },
};

/**
 * One client's history with this shop.
 *
 * `getClient` returns null when the customer has never booked here, and that is
 * a privacy boundary rather than only a 404: `public.users` is world-readable,
 * so without it this route would be a lookup tool for any user id. Hence
 * `notFound()` rather than an "unknown client" screen.
 */
export default async function ExpertClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/clients");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const { id } = await params;
  const client = await getClient(shop.id, id);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/expert/clients"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All clients
        </Link>
      </div>

      <PageHeader
        eyebrow="Client"
        title={client.displayName}
        description={client.fullName && client.fullName !== client.displayName ? client.fullName : undefined}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench">
        <UserAvatar name={client.displayName} src={client.avatarUrl} size="lg" />
        {client.phone ? (
          <a
            href={`tel:${client.phone}`}
            className="inline-flex items-center gap-2 font-mono text-sm text-enamel hover:text-signal"
          >
            <Phone aria-hidden className="size-4" />
            {client.phone}
          </a>
        ) : (
          <span className="text-sm text-steel">No phone number on file</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Jobs booked" value={String(client.bookingCount)} />
        <StatTile label="Total spent" value={formatMoney(client.totalSpentPence)} />
        <StatTile
          label="Last seen"
          value={client.lastBookingAt ? formatRelative(client.lastBookingAt) : "—"}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm uppercase tracking-wide text-enamel">
          Booking history
        </h2>

        {client.bookings.length === 0 ? (
          <EmptyState
            title="No bookings"
            description="This client has no jobs with you yet."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {client.bookings.map((booking) => {
              const start = slotStart(booking.slot);
              const amount = booking.final_amount ?? booking.quoted_amount;

              return (
                <li key={booking.id}>
                  <Link
                    href={`/dashboard/expert/requests/${booking.reference}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-machined border border-hairline bg-chalk px-4 py-3 shadow-bench transition-shadow hover:shadow-lift"
                  >
                    <span className="flex flex-col">
                      <span className="font-mono text-xs text-steel">{booking.reference}</span>
                      <span className="text-sm text-enamel">
                        {booking.service?.name ?? "Repair"}
                      </span>
                    </span>

                    <span className="flex items-center gap-4">
                      <span className="font-mono text-xs text-steel">
                        {start ? formatDateTime(start, shop.timezone) : "No slot"}
                      </span>
                      <span className="font-mono text-sm text-enamel">
                        {formatMoney(amount)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ClientNotes fixerId={shop.id} customerId={client.id} notes={client.notes} />
    </div>
  );
}
