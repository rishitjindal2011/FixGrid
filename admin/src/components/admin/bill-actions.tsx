"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useCloseOnSuccess,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { approveBill, rejectBill } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";
import { formatMoney } from "@/lib/format";

/**
 * Approve or reject one bill.
 *
 * Approval is behind a dialog rather than a bare button because it pays money out
 * and cannot be undone from this console — there is no "unpay" action, only a
 * manual adjustment. The dialog exists to show the figure being paid and where it
 * came from, so an approval is a decision rather than a reflex.
 *
 * The rebate shown here is a projection. `approveBill` recomputes it from the row
 * at decision time and pays that, so if the two ever diverge the discrepancy shows
 * up as a surprise on screen rather than as a silent overpayment.
 */
export function BillActions({
  billId,
  shopName,
  bookingReference,
  amountMinor,
  jobMinor,
  projectedRebateMinor,
  currency,
}: {
  billId: string;
  shopName: string;
  bookingReference: string;
  amountMinor: number;
  jobMinor: number | null;
  projectedRebateMinor: number;
  currency: string;
}) {
  const [approveState, approve, approving] = useActionState(
    approveBill,
    ADMIN_INITIAL_STATE,
  );
  const [rejectState, reject, rejecting] = useActionState(
    rejectBill,
    ADMIN_INITIAL_STATE,
  );

  const [approveOpen, setApproveOpen] = useCloseOnSuccess(approveState);
  const [rejectOpen, setRejectOpen] = useCloseOnSuccess(rejectState);

  const capped = jobMinor !== null && jobMinor < amountMinor;

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setApproveOpen(true)}>
        <Check aria-hidden className="size-4" />
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
        <X aria-hidden className="size-4" />
        Reject
      </Button>

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        labelledBy={`approve-${billId}`}
      >
        <DialogHeader>
          <DialogTitle id={`approve-${billId}`}>Approve this bill</DialogTitle>
          <DialogDescription>
            Pays {shopName} their rebate on {bookingReference}. This credits their
            balance immediately and cannot be reversed from here.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form id={`approve-form-${billId}`} action={approve} className="flex flex-col gap-4">
            <input type="hidden" name="billId" value={billId} />

            <dl className="flex flex-col gap-1.5 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-steel">Shop billed</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {formatMoney(amountMinor, currency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-steel">Job total</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {jobMinor === null ? "—" : formatMoney(jobMinor, currency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-1.5">
                <dt className="font-medium text-enamel">Rebate to pay</dt>
                <dd className="font-mono tabular-nums text-enamel">
                  {formatMoney(projectedRebateMinor, currency)}
                </dd>
              </div>
            </dl>

            {/* Named explicitly. A bill above the job is the case worth a second
                look before paying, and the reviewer should not have to notice it
                by comparing two numbers themselves. */}
            {capped ? (
              <p className="text-xs leading-relaxed text-rust">
                This bill is higher than the job it is against, so the rebate is capped
                at 5% of the job. Worth checking why before approving.
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`approve-note-${billId}`} className="eyebrow text-steel">
                Note — optional
              </label>
              <Input
                id={`approve-note-${billId}`}
                name="note"
                maxLength={2000}
                autoComplete="off"
                placeholder="Anything worth recording"
              />
            </div>

            {approveState.error ? (
              <p role="alert" className="text-sm text-rust">
                {approveState.error}
              </p>
            ) : null}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setApproveOpen(false)}
            disabled={approving}
          >
            Cancel
          </Button>
          <Button type="submit" form={`approve-form-${billId}`} disabled={approving}>
            {approving ? "Paying…" : `Pay ${formatMoney(projectedRebateMinor, currency)}`}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        labelledBy={`reject-${billId}`}
      >
        <DialogHeader>
          <DialogTitle id={`reject-${billId}`}>Reject this bill</DialogTitle>
          <DialogDescription>
            Nothing is paid. The shop sees your reason, so it has to say what to fix.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form id={`reject-form-${billId}`} action={reject} className="flex flex-col gap-4">
            <input type="hidden" name="billId" value={billId} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`reject-note-${billId}`} className="eyebrow text-steel">
                Reason — required
              </label>
              <Input
                id={`reject-note-${billId}`}
                name="note"
                required
                minLength={10}
                maxLength={2000}
                autoComplete="off"
                placeholder="What is wrong with this bill"
              />
            </div>

            {rejectState.error ? (
              <p role="alert" className="text-sm text-rust">
                {rejectState.error}
              </p>
            ) : null}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRejectOpen(false)}
            disabled={rejecting}
          >
            Cancel
          </Button>
          <Button type="submit" form={`reject-form-${billId}`} disabled={rejecting}>
            {rejecting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
