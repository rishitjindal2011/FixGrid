import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Store } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { TopUpWalletDialog } from "@/components/admin/top-up-wallet-dialog";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { getCustomer } from "@/lib/queries/customers";
import { getWalletBalance } from "@/lib/wallet";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { BookingStatus } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Customer",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Partial<Record<BookingStatus, "neutral" | "verified" | "signal" | "danger">> = {
  requested: "signal",
  accepted: "signal",
  in_progress: "signal",
  completed: "verified",
  closed: "neutral",
  disputed: "danger",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="eyebrow w-36 shrink-0 text-steel">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The balance and the session are independent of the customer read, so all
  // three go together rather than as three serialised round-trips.
  const [customer, wallet, session] = await Promise.all([
    getCustomer(id),
    getWalletBalance("user", id),
    getSession(),
  ]);
  if (!customer) notFound();

  // Top-ups are owner-only. The action re-checks this for itself — hiding the
  // button is a courtesy so an editor is not offered something that will refuse.
  const canTopUp = session?.role === "owner";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All customers
        </Link>
      </div>

      <PageHeader
        eyebrow="Customer"
        title={customer.displayName}
        description={
          customer.fullName && customer.fullName !== customer.displayName
            ? customer.fullName
            : undefined
        }
        actions={
          canTopUp ? (
            <TopUpWalletDialog
              ownerKind="user"
              ownerId={id}
              ownerName={customer.displayName}
              balanceMinor={wallet.balanceMinor}
            />
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label="Balance"
          value={formatMoney(wallet.balanceMinor)}
          // The one figure on this page that is money the customer still has,
          // rather than money already spent. Everything a booking charges comes
          // out of it, so a zero here explains a failed booking.
          hint="Available to spend"
        />
        <StatTile label="Bookings" value={String(customer.bookingCount)} />
        <StatTile label="Spent" value={formatMoney(customer.totalSpentPence)} />
        <StatTile
          label="Claims raised"
          value={String(customer.disputeCount)}
          tone={customer.disputeCount > 0 ? "signal" : "neutral"}
        />
        <StatTile
          label="Last seen"
          value={customer.lastBookingAt ? formatRelative(customer.lastBookingAt) : "—"}
        />
      </div>

      {customer.ownedShops.length > 0 ? (
        <section className="rounded-machined border border-hairline bg-bench-sunk p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm uppercase tracking-wide text-enamel">
            <Store aria-hidden className="size-4 text-steel" />
            Also runs a shop
          </h2>
          <p className="mb-2 text-sm text-steel">
            A customer account and an expert are the same login. Anything done here affects both
            sides of this person&apos;s use of the platform.
          </p>
          <ul className="flex flex-wrap gap-2">
            {customer.ownedShops.map((shop) => (
              <li key={shop.id}>
                <Link
                  href={`/experts/${shop.id}`}
                  className="inline-flex rounded-machined border border-hairline bg-chalk px-3 py-1.5 text-sm text-enamel hover:border-steel-soft hover:text-signal"
                >
                  {shop.shopName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">Account</h2>
        <dl>
          <Field label="Account id">
            <span className="font-mono text-xs">{customer.id}</span>
          </Field>
          <Field label="Signed up">{formatDateTime(customer.createdAt)}</Field>
          <Field label="Phone">
            {customer.phone ? (
              <span className="font-mono">{customer.phone}</span>
            ) : (
              <span className="text-steel">—</span>
            )}
          </Field>
          <Field label="Timezone">
            <span className="font-mono text-xs">{customer.timezone ?? "—"}</span>
          </Field>
          <Field label="Prefers">{customer.preferredContact ?? "—"}</Field>
          <Field label="Marketing">{customer.marketingOptIn ? "Opted in" : "Opted out"}</Field>
        </dl>
      </section>

      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
          Booking history
        </h2>
        {customer.bookings.length === 0 ? (
          <p className="text-sm text-steel">This account has never booked anything.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
              >
                <span className="flex flex-col">
                  <Link
                    href={`/bookings/${booking.reference}`}
                    className="font-mono text-xs text-enamel hover:text-signal"
                  >
                    {booking.reference}
                  </Link>
                  <span className="text-sm text-steel">{booking.shopName ?? "Unknown shop"}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs text-steel">
                    {formatRelative(booking.createdAt)}
                  </span>
                  <span className="font-mono text-sm text-enamel">
                    {formatMoney(booking.amountPence)}
                  </span>
                  <Badge variant={STATUS_VARIANT[booking.status] ?? "neutral"}>
                    {booking.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
          Reviews written
        </h2>
        {customer.reviews.length === 0 ? (
          <p className="text-sm text-steel">No reviews.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customer.reviews.map((review) => (
              <li key={review.id} className="border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-enamel">{review.shopName ?? "Unknown shop"}</span>
                  <span className="font-mono text-sm text-enamel">{review.rating}/5</span>
                </div>
                {review.text ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-steel">{review.text}</p>
                ) : null}
                <p className="mt-1 font-mono text-xs text-steel-soft">
                  {formatRelative(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* No suspension control: `public.users` has no such column. Adding one is a
          migration, and this app owns none. See the note at the bottom of
          src/lib/actions/admin.ts. */}
    </div>
  );
}
