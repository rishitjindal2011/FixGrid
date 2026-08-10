import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";

import { ClaimForm } from "@/components/dashboard/claim-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listCustomerBookings, type CustomerBooking } from "@/lib/dashboard/customer";
import { listDisputes, listWarranties, type DisputeEntry } from "@/lib/dashboard/warranty";
import { daysUntil, formatDateLong, formatRelative } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Raise a warranty claim",
  robots: { index: false, follow: false },
};

/**
 * Why this booking cannot be claimed on, in the customer's words.
 *
 * The three tests mirror `openDispute` exactly — status `completed`, a warranty
 * stamp present, and the window still open — because that action is what will
 * reject the submission otherwise. `disputed` is deliberately *not* treated as
 * eligible here even though a claim already exists against it: `openDispute`
 * only accepts `completed`, so rendering a form for a booking already in
 * dispute would produce a form that always fails. The caller turns that case
 * into a link to the claim instead.
 */
function ineligibleReason(booking: CustomerBooking, now: Date): string | null {
  if (booking.status !== "completed") {
    return `This booking is ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()}. A warranty claim can only be raised once the shop has marked the repair complete.`;
  }

  if (!booking.warranty_expires_at) {
    return "No warranty window was recorded for this repair, so there is nothing to claim against. Message the shop — they may still put it right.";
  }

  if (new Date(booking.warranty_expires_at).getTime() <= now.getTime()) {
    return `The warranty on this repair closed on ${formatDateLong(booking.warranty_expires_at)}. Claims can only be raised while the window is open.`;
  }

  return null;
}

function Refusal({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-machined border border-hairline bg-bench text-steel">
          <ShieldAlert aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg uppercase tracking-wide text-enamel">{title}</h2>
          <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">{detail}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-5">
        {action}
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/warranty">Back to warranty</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/messages">Message the shop</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The claim form, reached from a warranty card as `?booking=FIX-XXXXXX`.
 *
 * Keyed on the human reference rather than the id: it is what appears on the
 * card, in the confirmation email and on the shop's paperwork, so a customer
 * who types the URL by hand has a chance of getting it right. Nothing is
 * granted by knowing one — the lookup runs inside the customer's own booking
 * list, so a reference belonging to somebody else simply is not found.
 */
export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/warranty/new");

  const now = new Date();
  const { booking: requested } = await searchParams;
  const reference = requested?.trim().toUpperCase() ?? "";

  const header = (
    <PageHeader
      eyebrow="Warranty"
      title="Raise a claim"
      description="Tell us what failed and what would put it right. The shop and our team both see the claim, and the payment stays held until it is settled."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/warranty">
            <ArrowLeft aria-hidden />
            Warranty
          </Link>
        </Button>
      }
    />
  );

  // No reference: offer the repairs that are actually claimable rather than a
  // form with nothing to attach to.
  if (!reference) {
    // `listWarranties` counts a disputed booking as covered — it is, the window
    // is still open — so the claims are read alongside to tell "you can claim on
    // this" apart from "you already did". Settled claims count too: they leave
    // the booking in `disputed`, which `openDispute` refuses.
    const [covered, claims] = await Promise.all([
      listWarranties(user.id, now),
      listDisputes(user.id),
    ]);

    // Newest-first from `listDisputes`, so the first write per booking wins.
    const claimByBooking = new Map<string, DisputeEntry>();
    for (const claim of claims) {
      if (!claimByBooking.has(claim.bookingId)) claimByBooking.set(claim.bookingId, claim);
    }

    const active = covered.filter((entry) => entry.active);

    return (
      <div className="flex flex-col gap-6">
        {header}

        {active.length > 0 ? (
          <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
            <h2 className="font-display text-lg uppercase tracking-wide text-enamel">
              Which repair?
            </h2>
            <p className="pt-1.5 text-sm text-steel">
              These are the repairs still inside their warranty window.
            </p>

            <ul className="flex flex-col pt-4">
              {active.map((entry) => {
                const existing = claimByBooking.get(entry.bookingId);

                return (
                  <li key={entry.bookingId} className="border-b border-hairline last:border-b-0">
                    <Link
                      href={
                        existing
                          ? `/dashboard/warranty/${existing.id}`
                          : `/dashboard/warranty/new?booking=${encodeURIComponent(entry.reference)}`
                      }
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-signal"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-base uppercase tracking-wide text-enamel">
                          {entry.serviceName ?? "Repair"}
                        </span>
                        <span className="block truncate text-sm text-steel">
                          {entry.shopName} · {entry.reference}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {existing ? (
                          <span className="text-xs text-steel">
                            {existing.open ? "Claim already open" : "Already claimed"}
                          </span>
                        ) : (
                          <span className="font-mono text-sm tabular-nums text-steel">
                            {entry.daysLeft}d left
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing to claim on"
            description="A claim needs a completed repair that is still inside its warranty window. None of your bookings are right now."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/warranty">Back to warranty</Link>
              </Button>
            }
          />
        )}
      </div>
    );
  }

  // Scoped to the caller's own bookings by `listCustomerBookings`, so "not
  // found" and "not yours" collapse into the same answer — as they should.
  const bookings = await listCustomerBookings(user.id, { limit: 200 });
  const booking = bookings.find((row) => row.reference === reference);

  if (!booking) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Refusal
          title="We can't find that booking"
          detail={`Nothing on your account matches ${reference}. Check the reference on your booking, or pick the repair from your warranty list.`}
        />
      </div>
    );
  }

  const refusal = ineligibleReason(booking, now);

  if (refusal || !booking.warranty_expires_at) {
    // A booking in dispute has a claim to point at, and naming it beats the
    // generic refusal. The lookup only runs on this branch, so the happy path
    // pays nothing for it. `listDisputes` is newest-first, so `find` returns
    // the most recent claim on this booking.
    const existing =
      booking.status === "disputed"
        ? (await listDisputes(user.id)).find((claim) => claim.bookingId === booking.id)
        : undefined;

    return (
      <div className="flex flex-col gap-6">
        {header}
        <Refusal
          title={
            existing
              ? existing.open
                ? "There is already a claim on this repair"
                : "This repair has already been through a claim"
              : "This repair can't be claimed on"
          }
          detail={
            existing
              ? existing.open
                ? `You raised a claim on ${reference} ${formatRelative(existing.createdAt, now)}. Add to that thread rather than filing a second claim — the shop and our team are already reading it.`
                : `The claim you raised on ${reference} was settled ${formatRelative(existing.resolvedAt ?? existing.updatedAt, now)}, and a settled claim closes the booking to new ones. If the fault has come back, message the shop and our team will pick it up from the original claim.`
              : (refusal ?? "No warranty window was recorded for this repair.")
          }
          action={
            existing ? (
              <Button asChild size="sm">
                <Link href={`/dashboard/warranty/${existing.id}`}>
                  {existing.open ? "Open the claim" : "See how it was settled"}
                </Link>
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <ClaimForm
        bookingId={booking.id}
        reference={booking.reference}
        shopName={booking.shop?.shop_name ?? "the shop"}
        serviceName={booking.service?.name ?? booking.device_details}
        completedAt={booking.completed_at}
        expiresAt={booking.warranty_expires_at}
        daysLeft={daysUntil(booking.warranty_expires_at, now)}
      />
    </div>
  );
}
