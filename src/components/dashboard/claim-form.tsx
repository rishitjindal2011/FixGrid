"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import Link from "next/link";

import {
  DESIRED_OUTCOME_OPTIONS,
  OUTCOME_UNSPECIFIED,
} from "@/components/dashboard/warranty-card";
import { EvidenceUpload } from "@/components/dashboard/evidence-upload";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { openDispute } from "@/lib/bookings/actions";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The warranty claim form.
 *
 * The state type is read off the action rather than declared here, so a change
 * to what `openDispute` returns is a compile error in this file instead of a
 * field that silently stops rendering.
 */
type ClaimState = Awaited<ReturnType<typeof openDispute>>;

const INITIAL_STATE = { error: null, success: false } as ClaimState;

/**
 * The shop needs something it can act on. Twenty characters is not a quality
 * bar — it is the floor below which "broken again" tells a repairer nothing,
 * and it is re-checked server side; this copy only explains it before the user
 * hits submit.
 */
const MIN_REASON = 20;

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || !ready}>
      {pending ? "Filing claim…" : "File claim"}
    </Button>
  );
}

export function ClaimForm({
  bookingId,
  reference,
  shopName,
  serviceName,
  completedAt,
  expiresAt,
  daysLeft,
}: {
  bookingId: string;
  reference: string;
  shopName: string;
  serviceName: string | null;
  completedAt: string | null;
  expiresAt: string;
  daysLeft: number;
}) {
  const [state, formAction] = useActionState(openDispute, INITIAL_STATE);
  const [reason, setReason] = React.useState("");
  const [outcome, setOutcome] = React.useState<string>("redo_service");

  const remaining = MIN_REASON - reason.trim().length;

  /**
   * The claim is filed and the page behind it has been revalidated, but
   * `openDispute` does not redirect — it has no id to redirect to, since the
   * insert does not return one. Replacing the form with its receipt is what
   * stops a customer who sees an unchanged form from filing the same claim
   * twice.
   */
  if (state.success) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-machined border border-verdigris/30 bg-chalk shadow-bench"
      >
        <div className="border-l-2 border-verdigris p-5 sm:p-6">
          <p className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-enamel">
            <CheckCircle2 aria-hidden className="size-5 shrink-0 text-verdigris" />
            Claim filed
          </p>
          <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
            {state.message ?? "Your claim is open."} {shopName} has been notified and our team
            can read the thread. The payment on{" "}
            <span className="font-mono uppercase tracking-[0.08em] text-enamel">
              {reference}
            </span>{" "}
            stays held until this is settled.
          </p>
          <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
            Open the claim to add photos of the fault and to reply to the shop.
          </p>

          <div className="flex flex-wrap gap-2 pt-5">
            <Button asChild size="sm">
              <Link href="/dashboard/warranty">See your claims</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/messages">Message the shop</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-machined border border-hairline bg-chalk shadow-bench"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="reference" value={reference} />

      {/* What is being claimed on. Restated inside the form, not just in the
          page header, because this is the fact the customer is attesting to. */}
      <div className="border-l-2 border-enamel p-5">
        <p className="eyebrow">Claiming on</p>
        <p className="pt-2 font-display text-lg uppercase tracking-wide text-enamel">
          {serviceName ?? "Repair"}
        </p>
        <p className="pt-0.5 text-sm text-steel">{shopName}</p>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 pt-3 text-xs">
          <div>
            <dt className="eyebrow pb-1">Reference</dt>
            <dd className="font-mono uppercase tracking-[0.08em] text-steel">{reference}</dd>
          </div>
          {completedAt ? (
            <div>
              <dt className="eyebrow pb-1">Completed</dt>
              <dd className="font-mono tabular-nums text-enamel">
                {formatDateLong(completedAt)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="eyebrow pb-1">Cover ends</dt>
            <dd className="font-mono tabular-nums text-enamel">{formatDateLong(expiresAt)}</dd>
          </div>
          <div>
            <dt className="eyebrow pb-1">Days left</dt>
            <dd
              className={cn(
                "font-mono tabular-nums",
                daysLeft <= 7 ? "text-signal" : "text-enamel",
              )}
            >
              {daysLeft}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-5 border-t border-hairline p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="claim-reason" className="eyebrow">
            What went wrong?
          </label>
          <Textarea
            id="claim-reason"
            name="reason"
            rows={5}
            required
            minLength={MIN_REASON}
            maxLength={4000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What has failed, when you noticed it, and what the repair was meant to fix."
            aria-describedby="claim-reason-hint"
          />
          <p
            id="claim-reason-hint"
            aria-live="polite"
            className={cn("text-xs", remaining > 0 ? "text-steel" : "text-verdigris")}
          >
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "character" : "characters"} — the shop needs enough to act on.`
              : "That is enough for the shop to work with."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="claim-outcome" className="eyebrow">
            What would put it right?
          </label>
          {/* No `name` on the select itself. "Something else" is a sentinel the
              action's `z.enum` would reject, so the field is emitted below only
              when the choice is one the schema actually stores. */}
          <Select
            id="claim-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          >
            {DESIRED_OUTCOME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {outcome === OUTCOME_UNSPECIFIED ? null : (
            <input type="hidden" name="desiredOutcome" value={outcome} />
          )}

          <p className="text-xs text-steel">
            {outcome === OUTCOME_UNSPECIFIED
              ? "Say what you are after in the box above — an adjudicator reads it."
              : "An adjudicator decides the outcome, but we start from what you asked for."}
          </p>
        </div>

        {/* No `disputeId` yet — the claim does not exist until this form is
            submitted, so there is nothing for a `dispute_evidence` row to point
            at. The uploads post as a JSON manifest in a hidden `evidence`
            field, which `openDispute` does not read today; until it does, the
            claim page is where evidence is attached, and the copy below says so
            rather than implying these files are already on the record. */}
        <EvidenceUpload pathPrefix={`claims/${bookingId}`} />

        {state.error ? (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        <p className="flex items-start gap-2 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-xs leading-relaxed text-steel">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          Filing a claim puts this booking into dispute. The shop sees it straight away, and
          our team reads the thread. Payment stays held until it is settled.
        </p>

        <div>
          <SubmitButton ready={remaining <= 0} />
        </div>
      </div>
    </form>
  );
}
