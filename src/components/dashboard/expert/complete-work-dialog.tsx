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
  const [paymentMethod, setPaymentMethod] = React.useState<"online" | "cash">("online");
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
                <label className="eyebrow mb-2 block">
                  Payment & Settlement Method
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                      paymentMethod === "online"
                        ? "border-[#ea580c] bg-[#ea580c]/5 ring-1 ring-[#ea580c]"
                        : "border-hairline bg-bench hover:border-steel-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-enamel">UPI / Online</span>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online"
                        checked={paymentMethod === "online"}
                        onChange={() => setPaymentMethod("online")}
                        className="size-3.5 text-[#ea580c]"
                      />
                    </div>
                    <span className="mt-1 text-[11px] text-steel leading-tight">
                      Customer pays online. 5% cashback is <strong className="text-emerald-600">auto-credited</strong> to your wallet instantly upon settlement.
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                      paymentMethod === "cash"
                        ? "border-emerald-600 bg-emerald-500/5 ring-1 ring-emerald-600"
                        : "border-hairline bg-bench hover:border-steel-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-enamel">Paid in Cash</span>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        className="size-3.5 text-emerald-600"
                      />
                    </div>
                    <span className="mt-1 text-[11px] text-steel leading-tight">
                      Customer settled in cash at shop. Upload invoice bill in <strong>Cashback tab</strong> for Admin review & 5% credit.
                    </span>
                  </label>
                </div>
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
                  FixGrid Shop Pro 5% Cashback Guarantee
                </p>
                {paymentMethod === "online" ? (
                  <span>Customer reviews and pays via UPI/Wallet, and your 5% platform cashback rebate is automatically deposited!</span>
                ) : (
                  <span>Repair will be marked closed. You can upload the bill photo in the new <strong>Cashback tab</strong> for Admin to review and credit your 5% cashback rebate.</span>
                )}
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
                className={`gap-2 text-white ${
                  paymentMethod === "cash"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#ea580c] hover:bg-[#c2410c]"
                }`}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : paymentMethod === "cash" ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm & Mark Paid in Cash</span>
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
