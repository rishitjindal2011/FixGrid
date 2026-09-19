"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, Loader2, Sparkles, Wrench } from "lucide-react";

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
import { completeBookingWork } from "@/lib/dashboard/expert-actions";
import { formatMoney } from "@/lib/format";

interface CompleteWorkDialogProps {
  bookingId: string;
  reference: string;
  customerName: string;
  quotedAmountMinor: number | null;
  currency: string;
}

export function CompleteWorkDialog({
  bookingId,
  reference,
  customerName,
  quotedAmountMinor,
  currency,
}: CompleteWorkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(completeBookingWork, BOOKING_INITIAL_STATE);

  const defaultRupees = quotedAmountMinor ? (quotedAmountMinor / 100).toFixed(2) : "";

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
        variant="primary"
        onClick={() => setOpen(true)}
        className="gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white"
      >
        <CheckCircle2 className="size-3.5" />
        <span>Complete Work</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form action={formAction}>
            <input type="hidden" name="bookingId" value={bookingId} />

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-enamel font-display uppercase tracking-tight">
                <Wrench className="size-5 text-[#ea580c]" />
                <span>Complete Repair — {reference}</span>
              </DialogTitle>
              <DialogDescription>
                Mark this job complete on the bench. It will be sent to{" "}
                <strong>{customerName}</strong> to review the work and settle payment.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4 pt-2">
              {state.error ? (
                <div className="rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                  {state.error}
                </div>
              ) : null}

              <div>
                <label htmlFor="finalAmount" className="eyebrow mb-1.5 block">
                  Final Repair Amount (₹)
                </label>
                <Input
                  id="finalAmount"
                  name="finalAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={defaultRupees}
                  placeholder="e.g. 1200"
                  required
                />
                <p className="mt-1 text-xs text-steel-soft">
                  {quotedAmountMinor
                    ? `Initial quoted fee was ${formatMoney(quotedAmountMinor, currency)}.`
                    : "Enter the total repair service fee to bill the customer."}
                </p>
              </div>

              <div>
                <label htmlFor="completionNotes" className="eyebrow mb-1.5 block">
                  Work Summary & Diagnostics (Optional)
                </label>
                <Textarea
                  id="completionNotes"
                  name="completionNotes"
                  rows={3}
                  placeholder="e.g. Replaced display panel with OEM unit. Touch sensitivity and TrueTone verified."
                />
              </div>

              <div className="rounded-machined border border-hairline bg-bench p-3 text-xs text-steel leading-relaxed">
                <p className="font-semibold text-enamel flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="size-3.5 text-[#ea580c]" />
                  FixGrid Shop Pro 5% Cashback
                </p>
                Once the customer reviews and pays, your shop wallet is instantly credited, plus your 5% platform cashback rebate is automatically deposited!
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
                className="gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm & Send to Customer</span>
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
