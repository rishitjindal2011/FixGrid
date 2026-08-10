import Link from "next/link";
import { ChevronRight, ShieldCheck, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DisputeEntry, WarrantyEntry } from "@/lib/dashboard/warranty";
import { formatDateLong, formatMoney, formatRelative } from "@/lib/format";
import type { DisputeResolution, DisputeStatus } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

/**
 * Warranty and claim presentation: the cards, and the label tables they share.
 *
 * The labels live in this module — a plain Server Component file — rather than
 * alongside the form that offers them, because every export of a `"use client"`
 * module becomes a client *reference* on the server. A Server Component reading
 * `DESIRED_OUTCOME_LABELS[x]` from a client module would be dereferencing a
 * proxy, not an object. Client components can import freely in this direction,
 * so the shared vocabulary sits on the server side of the boundary.
 */

/** Inside this many days a warranty is "expiring soon" — matches `warranty.ts`. */
const EXPIRING_SOON_DAYS = 7;

/* ── Shared vocabulary ────────────────────────────────────────────────────── */

/**
 * The value "something else" submits — which is nothing at all.
 *
 * `openDispute` parses `desiredOutcome` with `z.enum(DISPUTE_OUTCOMES)`, whose
 * four values are the `dispute_resolution` vocabulary. A fifth value invented
 * here would be a select that always fails validation, so the sentinel never
 * leaves the browser: `ClaimForm` omits the field when it is chosen, and the
 * column is nullable precisely so it can be absent.
 *
 * Reusing `no_action` for this would be worse than omitting it. That value means
 * an adjudicator looked and decided to do nothing — writing it against a
 * customer who asked for *something* puts the opposite of their request on the
 * record.
 */
export const OUTCOME_UNSPECIFIED = "unspecified";

/**
 * What the customer can ask for, and the value stored in
 * `disputes.desired_outcome`.
 *
 * Keyed on the `dispute_resolution` vocabulary rather than a private one, so a
 * claim that resolves the way it was asked to reads the same in both columns.
 */
export const DESIRED_OUTCOME_OPTIONS = [
  { value: "refund_full", label: "A refund" },
  { value: "redo_service", label: "Redo the repair" },
  { value: "refund_partial", label: "A partial refund" },
  { value: OUTCOME_UNSPECIFIED, label: "Something else" },
] as const;

/**
 * Stored `desired_outcome` values as prose.
 *
 * Written out rather than derived from the options above, because the two lists
 * are not the same set: this one has to name `no_action`, which the form never
 * offers, and must never contain the sentinel, which is never stored.
 */
export const DESIRED_OUTCOME_LABELS: Record<string, string> = {
  refund_full: "A refund",
  refund_partial: "A partial refund",
  redo_service: "The repair redone",
  no_action: "No action",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  awaiting_customer: "Needs your reply",
  awaiting_shop: "With the shop",
  under_review: "Under review",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
};

export const RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  refund_full: "Refunded in full",
  refund_partial: "Partially refunded",
  redo_service: "Repair redone",
  no_action: "No action taken",
};

/**
 * Badge tone per claim status, following the same rule as `STATUS_TONE`: signal
 * orange marks state that is live *and* unanswered. `open` (filed, nobody has
 * replied) and `awaiting_customer` (the ball is with the customer) qualify.
 * A claim sitting with the shop or an adjudicator is in flight but not on the
 * customer, so it takes the solid enamel treatment instead — otherwise every
 * claim is orange and the colour stops meaning anything.
 */
const DISPUTE_TONE: Record<DisputeStatus, "neutral" | "verified" | "signal" | "solid"> = {
  open: "signal",
  awaiting_customer: "signal",
  awaiting_shop: "solid",
  under_review: "solid",
  resolved: "verified",
  withdrawn: "neutral",
};

export function ClaimStatusBadge({
  status,
  className,
}: {
  status: DisputeStatus;
  className?: string;
}) {
  return (
    <Badge variant={DISPUTE_TONE[status]} className={className}>
      {DISPUTE_STATUS_LABELS[status]}
    </Badge>
  );
}

/* ── Active cover ─────────────────────────────────────────────────────────── */

/**
 * How much of the window is still to run, as a percentage.
 *
 * Null when the window's length is unknowable — a booking completed before the
 * completion trigger stamped `completed_at` has an expiry but no start, and a
 * bar drawn from a guessed start would be a fabricated measurement. The day
 * count below it is the real number either way, so the bar is the part that
 * drops.
 */
function remainingPercent(entry: WarrantyEntry, now: Date): number | null {
  if (!entry.completedAt) return null;

  const start = new Date(entry.completedAt).getTime();
  const end = new Date(entry.expiresAt).getTime();
  const total = end - start;
  if (!Number.isFinite(total) || total <= 0) return null;

  const left = end - now.getTime();
  return Math.min(100, Math.max(0, (left / total) * 100));
}

/**
 * One repair still under warranty.
 *
 * Dates render through `formatDateLong`'s stated default zone. `WarrantyEntry`
 * carries no shop timezone — a warranty window is a calendar promise measured
 * in days, not a counter appointment — so there is no shop clock to defer to
 * here the way `BookingCard` does for a slot.
 *
 * `existingClaim` swaps the claim button for a link to it. A booking that has
 * been claimed on keeps its cover and belongs in this list, but it is left in
 * `disputed` — resolving a claim does not move it back — and `openDispute`
 * accepts nothing but `completed`. Offering "raise a claim" on one would be
 * offering a button that cannot work.
 */
export function WarrantyCard({
  entry,
  now,
  existingClaim,
  className,
}: {
  entry: WarrantyEntry;
  now: Date;
  existingClaim?: DisputeEntry;
  className?: string;
}) {
  const soon = entry.daysLeft <= EXPIRING_SOON_DAYS;
  const percent = remainingPercent(entry, now);

  return (
    <article
      className={cn(
        "rounded-machined border bg-chalk p-4 shadow-bench sm:p-5",
        // Live, actionable state: this cover lapses inside a week and the claim
        // window shuts with it. That is what the signal token is for.
        soon ? "border-signal/40" : "border-hairline",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={soon ? "signal" : "verified"}>
              <ShieldCheck aria-hidden />
              {soon ? "Expiring soon" : "Covered"}
            </Badge>
            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
              {entry.reference}
            </span>
          </div>

          <h3 className="truncate pt-2.5 font-display text-base uppercase tracking-wide text-enamel">
            {entry.serviceName ?? "Repair"}
          </h3>
          <p className="truncate pt-0.5 text-sm text-steel">{entry.shopName}</p>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 pt-3 text-xs">
            <div>
              <dt className="eyebrow pb-1">Completed</dt>
              <dd className="font-mono tabular-nums text-enamel">
                {entry.completedAt ? formatDateLong(entry.completedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow pb-1">Cover ends</dt>
              <dd className="font-mono tabular-nums text-enamel">
                {formatDateLong(entry.expiresAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="shrink-0 sm:w-44">
          <p className="eyebrow pb-1.5">Days left</p>
          <p
            className={cn(
              "font-mono text-2xl leading-none tabular-nums",
              soon ? "text-signal" : "text-enamel",
            )}
          >
            {entry.daysLeft}
          </p>

          {percent !== null ? (
            <Progress
              value={percent}
              tone={soon ? "signal" : "verdigris"}
              aria-label={`Warranty remaining on ${entry.reference}`}
              aria-valuetext={`${entry.daysLeft} days left`}
              className="mt-2.5"
            />
          ) : null}

          <p className="pt-2 text-xs text-steel">
            {entry.daysLeft === 0
              ? "Closes today"
              : `Closes ${formatRelative(entry.expiresAt, now)}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        {existingClaim ? (
          <Link
            href={`/dashboard/warranty/${existingClaim.id}`}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-2 rounded-machined px-3",
              "border border-hairline bg-chalk font-display text-sm uppercase tracking-wide",
              "text-enamel transition-colors hover:border-steel-soft hover:bg-bench",
            )}
          >
            {existingClaim.open ? "View your claim" : "View settled claim"}
          </Link>
        ) : (
          <Link
            href={`/dashboard/warranty/new?booking=${encodeURIComponent(entry.reference)}`}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-2 rounded-machined px-3",
              "font-display text-sm uppercase tracking-wide transition-colors",
              soon
                ? "bg-signal text-white hover:bg-signal-lift"
                : "border border-hairline bg-chalk text-enamel hover:border-steel-soft hover:bg-bench",
            )}
          >
            Raise a claim
          </Link>
        )}

        <Link
          href={`/dashboard/bookings/${entry.reference}`}
          className="inline-flex items-center gap-1 text-xs text-steel hover:text-enamel"
        >
          View booking
          <ChevronRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

/**
 * Cover that has lapsed.
 *
 * Kept on the page rather than filtered away: the moment a customer comes
 * looking for their warranty is often the moment just after it ran out, and
 * "we are no longer covering this, it closed on the 4th" is a real answer.
 * Greyed and without a claim button, because there is nothing to act on.
 */
export function ExpiredWarrantyRow({ entry }: { entry: WarrantyEntry }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <ShieldOff aria-hidden className="size-4 shrink-0 text-steel-soft" />
        <div className="min-w-0">
          <p className="truncate text-sm text-steel">
            {entry.serviceName ?? "Repair"}
            <span className="text-steel-soft"> · {entry.shopName}</span>
          </p>
          <p className="pt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {entry.reference}
          </p>
        </div>
      </div>

      <p className="shrink-0 font-mono text-xs tabular-nums text-steel-soft">
        Closed {formatDateLong(entry.expiresAt)}
      </p>
    </li>
  );
}

/* ── Claims ───────────────────────────────────────────────────────────────── */

/** One claim in a list. The whole row is the link — see `BookingCard`. */
export function ClaimCard({ claim, now }: { claim: DisputeEntry; now: Date }) {
  const outcome = claim.desiredOutcome
    ? (DESIRED_OUTCOME_LABELS[claim.desiredOutcome] ?? claim.desiredOutcome)
    : null;

  return (
    <Link
      href={`/dashboard/warranty/${claim.id}`}
      className="group flex items-start gap-4 rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClaimStatusBadge status={claim.status} />
          <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
            {claim.reference}
          </span>
        </div>

        <p className="truncate pt-2 font-display text-base uppercase tracking-wide text-enamel">
          {claim.serviceName ?? "Repair"}
        </p>
        <p className="truncate pt-0.5 text-sm text-steel">{claim.shopName}</p>

        <p className="line-clamp-2 pt-2 text-sm leading-relaxed text-steel">{claim.reason}</p>

        <p className="pt-2 text-xs text-steel-soft">
          {outcome ? <span>Asked for: {outcome} · </span> : null}
          Raised {formatRelative(claim.createdAt, now)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {claim.refundAmountPence !== null ? (
          <span className="font-mono text-sm tabular-nums text-verdigris">
            {formatMoney(claim.refundAmountPence)}
          </span>
        ) : null}
        <ChevronRight
          aria-hidden
          className="size-4 text-steel-soft transition-colors group-hover:text-signal"
        />
      </div>
    </Link>
  );
}
