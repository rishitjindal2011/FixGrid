"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { markBookingPaidInCash } from "@/lib/dashboard/cashback-actions";
import { formatMoney } from "@/lib/format";

interface MarkPaidCashDialogProps {
  bookingId: string;
  reference: string;
  finalAmountMinor: number;
  currency: string;
}

export function MarkPaidCashDialog({
  bookingId,
  reference,
  finalAmountMinor,
  currency,
}: MarkPaidCashDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    markBookingPaidInCash,
    BOOKING_INITIAL_STATE,
  );

  const defaultRupees = finalAmountMinor ? (finalAmountMinor / 100).toFixed(2) : "";

  React.useEffect(() => {
    if (state.success && open) {
      setOpen(false);
    }
  }, [state.success, open]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
      >
        <Banknote className="size-4" />
        <span>Customer Paid in Cash</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form action={formAction}>
            <input type="hidden" name="bookingId" value={bookingId} />

            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <Banknote className="size-4" />
                <span>Offline Settlement</span>
              </div>
              <DialogTitle className="font-display text-lg uppercase tracking-tight text-enamel">
                Record Cash Payment — {reference}
              </DialogTitle>
              <DialogDescription className="text-xs text-steel">
                Record that the customer paid you in cash upon device collection. This marks the job closed and eligible for 5% cashback submission.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4 pt-2">
              {state.error ? (
                <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              ) : null}

              <div>
                <label htmlFor="cashFinalAmount" className="eyebrow mb-1.5 block">
                  Amount Received in Cash (₹)
                </label>
                <Input
                  id="cashFinalAmount"
                  name="finalAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={defaultRupees}
                  required
                />
                <p className="mt-1 text-[11px] text-steel-soft">
                  The actual cash received from the customer for the repair service.
                </p>
              </div>

              <div>
                <label htmlFor="cashNotes" className="eyebrow mb-1.5 block">
                  Payment Receipt Note (Optional)
                </label>
                <Textarea
                  id="cashNotes"
                  name="notes"
                  rows={2}
                  placeholder="e.g. Paid in cash at counter upon pickup by customer."
                />
              </div>

              <div className="rounded-machined border border-hairline bg-bench p-3 text-xs text-steel">
                <div className="flex items-center gap-1.5 font-semibold text-enamel">
                  <Sparkles className="size-3.5 text-[#ea580c]" />
                  <span>Claim Your 5% Cashback in the Cashback Tab</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Unlike online UPI payments which auto-credit, cash repairs require an invoice receipt photo uploaded in the new <strong>Cashback Tab</strong> for Admin approval.
                </p>
              </div>
            </DialogBody>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={pending}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Recording…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm Cash Payment</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
