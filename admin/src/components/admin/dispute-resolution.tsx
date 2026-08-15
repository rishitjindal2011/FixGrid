"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addDisputeNote, resolveDispute, setDisputeStatus } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import { formatMoney } from "@/lib/format";
import {
  DISPUTE_RESOLUTION_LABELS,
  type DisputeResolution,
} from "@/lib/types/marketplace";

/** The two outcomes that move money and therefore need an amount. */
const REFUND_RESOLUTIONS: readonly DisputeResolution[] = ["refund_full", "refund_partial"];

const RESOLUTIONS = Object.keys(DISPUTE_RESOLUTION_LABELS) as DisputeResolution[];

/**
 * Resolve a claim, reply to it, or park it awaiting one side.
 *
 * Whether the amount field appears is derived from the selected value DURING
 * RENDER rather than synced into state by an effect — `react-hooks/set-state-in-effect`
 * is an error in this config, and deriving is simpler anyway.
 *
 * The confirmation step is deliberate. Resolving writes a refund figure that
 * money is later paid against, and it cannot be undone from this screen, so the
 * exact amount is spelled back before the write rather than after.
 */
export function DisputeResolution({
  disputeId,
  bookingTotalPence,
  currency,
}: {
  disputeId: string;
  bookingTotalPence: number | null;
  currency: string;
}) {
  const [resolveState, resolve, resolving] = useActionState(resolveDispute, ADMIN_INITIAL_STATE);
  const [noteState, note, noting] = useActionState(addDisputeNote, ADMIN_INITIAL_STATE);
  const [statusState, status, statusing] = useActionState(setDisputeStatus, ADMIN_INITIAL_STATE);

  const [resolution, setResolution] = useState<DisputeResolution>("refund_partial");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

  const needsAmount = REFUND_RESOLUTIONS.includes(resolution);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">Reply</h2>
        <form action={note} className="flex flex-col gap-2">
          <input type="hidden" name="disputeId" value={disputeId} />
          <label htmlFor="dispute-reply" className="sr-only">
            Reply to this claim
          </label>
          <Textarea
            id="dispute-reply"
            name="body"
            rows={3}
            required
            maxLength={4000}
            placeholder="Both the customer and the shop see this."
          />
          {noteState.error ? (
            <p role="alert" className="text-xs text-rust">
              {noteState.error}
            </p>
          ) : null}
          {noteState.success ? (
            <p role="status" className="text-xs text-verdigris">
              Reply sent.
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="sm" disabled={noting}>
              {noting ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
          Park this claim
        </h2>
        <form action={status} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="disputeId" value={disputeId} />
          <div className="flex flex-col gap-1">
            <label htmlFor="park-status" className="eyebrow text-steel">
              Waiting on
            </label>
            <Select id="park-status" name="status" defaultValue="awaiting_customer">
              <option value="awaiting_customer">The customer</option>
              <option value="awaiting_shop">The shop</option>
              <option value="under_review">Us — under review</option>
              <option value="open">Nobody — reopen</option>
            </Select>
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={statusing}>
            {statusing ? "Saving…" : "Set"}
          </Button>
        </form>
        {statusState.error ? (
          <p role="alert" className="mt-2 text-xs text-rust">
            {statusState.error}
          </p>
        ) : null}
      </section>

      <section className="rounded-machined border border-signal/30 bg-chalk p-4 shadow-bench">
        <h2 className="mb-1 font-display text-sm uppercase tracking-wide text-enamel">
          Resolve
        </h2>
        <p className="mb-3 text-xs text-steel">
          Final. A resolution cannot be reopened from this screen.
        </p>

        <form action={resolve} className="flex flex-col gap-3">
          <input type="hidden" name="disputeId" value={disputeId} />

          <div className="flex flex-col gap-1">
            <label htmlFor="resolution" className="eyebrow text-steel">
              Outcome
            </label>
            <Select
              id="resolution"
              name="resolution"
              value={resolution}
              onChange={(event) => {
                setResolution(event.target.value as DisputeResolution);
                setConfirming(false);
              }}
            >
              {RESOLUTIONS.map((value) => (
                <option key={value} value={value}>
                  {DISPUTE_RESOLUTION_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          {needsAmount ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="refundAmount" className="eyebrow text-steel">
                Refund amount (₹)
              </label>
              <Input
                id="refundAmount"
                name="refundAmount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setConfirming(false);
                }}
                placeholder="49.99"
                className="font-mono"
              />
              {bookingTotalPence !== null ? (
                <p className="text-xs text-steel">
                  The customer paid {formatMoney(bookingTotalPence, currency)}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor="resolution-note" className="eyebrow text-steel">
              Reasoning — required
            </label>
            <Textarea
              id="resolution-note"
              name="note"
              rows={4}
              required
              minLength={10}
              maxLength={4000}
              placeholder="Both parties see this, and it becomes part of the claim record."
            />
          </div>

          {resolveState.error ? (
            <p role="alert" className="text-sm text-rust">
              {resolveState.error}
            </p>
          ) : null}

          {confirming ? (
            <div className="flex flex-col gap-3 rounded-machined border border-signal/30 bg-signal-wash p-3">
              <p className="flex items-start gap-2 text-sm text-enamel">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
                <span>
                  Resolving as <strong>{DISPUTE_RESOLUTION_LABELS[resolution]}</strong>
                  {needsAmount && amount ? (
                    <>
                      {" "}
                      with a refund of <strong className="font-mono">₹{amount}</strong>
                    </>
                  ) : null}
                  . This is final.
                </span>
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={resolving}>
                  {resolving ? "Resolving…" : "Confirm resolution"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setConfirming(true)}>
                Resolve claim
              </Button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
