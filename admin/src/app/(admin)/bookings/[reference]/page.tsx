import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Scale } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBooking } from "@/lib/queries/bookings";
import { formatDateTime, formatDuration, formatMoney, slotStart } from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  DELIVERY_MODE_LABELS,
  type BookingStatus,
} from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Booking",
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

function Money({ label, pence, currency }: { label: string; pence: number | null; currency: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline py-2 last:border-b-0">
      <span className="text-sm text-steel">{label}</span>
      <span className="font-mono text-sm text-enamel">{formatMoney(pence, currency)}</span>
    </div>
  );
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const booking = await getBooking(reference);
  if (!booking) notFound();

  const start = slotStart(booking.slot);
  const address = [
    booking.addressLine1,
    booking.addressLine2,
    booking.addressCity,
    booking.addressPostcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All bookings
        </Link>
      </div>

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <span className="font-mono">{booking.reference}</span>
            <Badge variant={STATUS_VARIANT[booking.status] ?? "neutral"}>
              {BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
          </span>
        }
        title={booking.serviceName ?? "Repair"}
        description={`${booking.customerName} · ${booking.shopName}`}
        actions={
          booking.disputeId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/disputes/${booking.disputeId}`}>
                <Scale aria-hidden className="size-4" />
                View claim
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              The job
            </h2>
            <dl>
              <Field label="Customer">
                <Link href={`/customers/${booking.customerId}`} className="hover:text-signal">
                  {booking.customerName}
                </Link>
              </Field>
              <Field label="Shop">
                <Link href={`/experts/${booking.shopId}`} className="hover:text-signal">
                  {booking.shopName}
                </Link>
              </Field>
              <Field label="Service">
                {booking.serviceName ?? "—"}
                {booking.serviceDurationMinutes ? (
                  <span className="ml-2 font-mono text-xs text-steel">
                    {formatDuration(booking.serviceDurationMinutes)}
                  </span>
                ) : null}
              </Field>
              <Field label="Slot">
                <span className="font-mono text-xs">
                  {start ? formatDateTime(start, booking.shopTimezone) : "—"}
                </span>
                <span className="ml-2 text-xs text-steel">({booking.shopTimezone})</span>
              </Field>
              <Field label="Delivery">{DELIVERY_MODE_LABELS[booking.deliveryMode]}</Field>
              <Field label="Address">
                {address || <span className="text-steel">—</span>}
              </Field>
              <Field label="Device">
                {booking.deviceDetails ? (
                  <span className="whitespace-pre-wrap">{booking.deviceDetails}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
              <Field label="Customer notes">
                {booking.customerNotes ? (
                  <span className="whitespace-pre-wrap">{booking.customerNotes}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
              {booking.cancellationReason ? (
                <Field label="Cancelled because">
                  <span className="whitespace-pre-wrap text-rust">
                    {booking.cancellationReason}
                  </span>
                </Field>
              ) : null}
            </dl>
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
              What happened
            </h2>
            {booking.events.length === 0 ? (
              <p className="text-sm text-steel">
                No events recorded. Every transition writes to `booking_events`, so an empty
                timeline means this booking has not moved since it was created.
              </p>
            ) : (
              <ol className="flex flex-col gap-0">
                {booking.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-hairline py-2 pl-4"
                  >
                    <span className="font-mono text-xs text-steel">
                      {formatDateTime(event.createdAt, booking.shopTimezone)}
                    </span>
                    <span className="text-sm text-enamel">
                      {event.fromStatus ? (
                        <>
                          {BOOKING_STATUS_LABELS[event.fromStatus]}
                          <span className="mx-1.5 text-steel-soft">→</span>
                        </>
                      ) : null}
                      {event.toStatus ? BOOKING_STATUS_LABELS[event.toStatus] : "—"}
                    </span>
                    {event.actorRole ? (
                      <span className="eyebrow text-steel-soft">{event.actorRole}</span>
                    ) : null}
                    {event.note ? (
                      <span className="w-full whitespace-pre-wrap text-sm text-steel">
                        {event.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">Money</h2>
            <Money label="Quoted" pence={booking.quotedPence} currency={booking.currency} />
            <Money label="Final" pence={booking.finalPence} currency={booking.currency} />
            <Money label="Platform fee" pence={booking.platformFeePence} currency={booking.currency} />
            <Money label="Tax" pence={booking.taxPence} currency={booking.currency} />

            {booking.payment ? (
              <div className="mt-3 border-t border-hairline pt-3">
                <p className="mb-1 eyebrow text-steel">Payment</p>
                <div className="flex items-center justify-between">
                  <Badge variant={booking.payment.status === "captured" ? "verified" : "neutral"}>
                    {booking.payment.status}
                  </Badge>
                  <span className="font-mono text-sm text-enamel">
                    {formatMoney(booking.payment.amountPence, booking.currency)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-steel">
                  {booking.payment.provider}
                  {booking.payment.capturedAt
                    ? ` · ${formatDateTime(booking.payment.capturedAt)}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="mt-3 border-t border-hairline pt-3 text-xs text-steel">
                No payment recorded against this booking.
              </p>
            )}
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              Warranty
            </h2>
            <dl>
              <Field label="Cover">{booking.warrantyDays} days</Field>
              <Field label="Completed">
                {booking.completedAt ? (
                  <span className="font-mono text-xs">{formatDateTime(booking.completedAt)}</span>
                ) : (
                  <span className="text-steel">Not yet</span>
                )}
              </Field>
              <Field label="Expires">
                {booking.warrantyExpiresAt ? (
                  <span className="font-mono text-xs">
                    {formatDateTime(booking.warrantyExpiresAt)}
                  </span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
