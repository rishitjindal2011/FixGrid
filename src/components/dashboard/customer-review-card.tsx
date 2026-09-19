"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Coins,
  FileQuestion,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentSheet } from "@/components/dashboard/payment-sheet";
import { uploadBookingEvidencePhotos } from "@/lib/bookings/attachments-client";
import {
  requestBookingRevision,
  settleCompletedBooking,
} from "@/lib/bookings/actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { formatMoney } from "@/lib/format";
import type { BookingStatus, DisputeResolution, DisputeStatus } from "@/lib/types/marketplace";

interface CustomerReviewCardProps {
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    device_details: string | null;
    currency: string;
    final_amount: number | null;
    quoted_amount: number | null;
    platform_fee: number;
    tax_amount: number;
    shop?: {
      shop_name: string;
    } | null;
  };
  balanceMinor: number;
  dispute?: {
    status: DisputeStatus;
    reason: string;
    resolution: DisputeResolution | null;
    resolution_note?: string | null;
    resolved_at?: string | null;
  } | null;
}

export function CustomerReviewCard({
  booking,
  balanceMinor,
  dispute,
}: CustomerReviewCardProps) {
  const router = useRouter();

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const repairAmount = booking.final_amount ?? booking.quoted_amount ?? 0;
  const totalPayable = repairAmount + booking.platform_fee + booking.tax_amount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected].slice(0, 6));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("Please describe the issue or changes requested in detail (minimum 10 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload evidence photos if any
      if (files.length > 0) {
        const uploadRes = await uploadBookingEvidencePhotos(booking.id, files);
        if (uploadRes.failed > 0 && uploadRes.uploaded === 0) {
          setError("Failed to upload attached photos. Please try with smaller images.");
          setSubmitting(false);
          return;
        }
      }

      // 2. Submit revision request
      const formData = new FormData();
      formData.set("bookingId", booking.id);
      formData.set("reason", reason.trim());

      const res = await requestBookingRevision(BOOKING_INITIAL_STATE, formData);

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      setSuccessMessage("Your revision request and photos have been submitted to the workshop!");
      setRevisionOpen(false);
      setReason("");
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit revision request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Case 1: Status is disputed
  if (booking.status === "disputed" || dispute) {
    const isUpheld = dispute?.resolution === "no_action";
    const isReworkOrdered = dispute?.resolution === "redo_service";
    const isRefunded =
      dispute?.resolution === "refund_full" || dispute?.resolution === "refund_partial";

    return (
      <div className="relative overflow-hidden rounded-machined border border-signal/40 bg-gradient-to-br from-signal/5 via-chalk to-bench p-6 shadow-bench">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-machined border border-signal/30 bg-signal/10 text-signal">
            <FileQuestion className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-eyebrow uppercase tracking-widest text-signal">
                Mediation & Revision Details
              </span>
              <span className="rounded-full border border-hairline bg-bench px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-steel">
                Status: {dispute?.status ? dispute.status.replace(/_/g, " ") : "In Review"}
              </span>
            </div>

            <h3 className="mt-1 font-display text-lg uppercase tracking-wide text-enamel">
              {isUpheld
                ? "FixGrid Mediation Concluded: Upheld in Favor of Workshop"
                : isReworkOrdered
                  ? "Admin Ordered Workshop Rework"
                  : isRefunded
                    ? "Dispute Settled: Refund / Bill Waived"
                    : "Workmanship Dissatisfaction Under Review"}
            </h3>

            {dispute?.reason ? (
              <div className="mt-3 rounded-machined border border-hairline bg-chalk/80 p-3 text-sm text-steel">
                <span className="font-semibold text-enamel">Your feedback: </span>
                {dispute.reason}
              </div>
            ) : null}

            {dispute?.resolution_note ? (
              <div className="mt-3 rounded-machined border border-signal/30 bg-signal/10 p-3 text-sm text-signal">
                <span className="font-semibold">FixGrid Admin Resolution: </span>
                {dispute.resolution_note}
              </div>
            ) : null}

            {isUpheld ? (
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-machined border border-signal/30 bg-signal/10 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-enamel">
                    Please approve and settle the outstanding repair bill of{" "}
                    <span className="font-bold text-signal">
                      {formatMoney(totalPayable, booking.currency)}
                    </span>
                    .
                  </p>
                  <p className="text-xs text-steel">
                    Funds are credited securely to the workshop wallet with 5% Pro Cashback.
                  </p>
                </div>
                <Button
                  onClick={() => setPaymentOpen(true)}
                  className="bg-signal text-charcoal hover:bg-signal/90"
                >
                  <Coins className="size-4" />
                  Approve & Settle Now
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-steel">
                {isReworkOrdered
                  ? "The workshop is currently re-working your device on their bench. You will be notified as soon as work is completed."
                  : "FixGrid admin is mediating between both parties. If the workshop denies your rework request, our dispute mediator steps in to review evidence."}
              </p>
            )}
          </div>
        </div>

        {/* Payment Sheet */}
        <PaymentSheet
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          amountMinor={totalPayable}
          balanceMinor={balanceMinor}
          title={`Settle ${booking.reference} Repair Bill`}
          description={`Payment for ${booking.device_details ?? "device repair"} at ${booking.shop?.shop_name ?? "Workshop"}.`}
          purchaseFields={{ bookingId: booking.id }}
          purchaseAction={settleCompletedBooking}
          confirmLabel="Pay Now"
        />
      </div>
    );
  }

  // Case 2: Status is completed (Expert finished work, awaiting customer review & payment)
  if (booking.status === "completed") {
    return (
      <div className="relative overflow-hidden rounded-machined border-2 border-signal bg-chalk p-6 shadow-bench ring-4 ring-signal/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-machined bg-signal/15 text-signal ring-1 ring-signal/30">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-signal">
                  <CheckCircle className="size-3" />
                  Work Completed by Workshop
                </span>
                <span className="font-mono text-xs text-steel">Ref: {booking.reference}</span>
              </div>
              <h2 className="mt-1 font-display text-xl uppercase tracking-wide text-enamel">
                Repair Finished & Ready for Your Approval
              </h2>
              <p className="mt-1 text-sm text-steel">
                {booking.shop?.shop_name ?? "The expert"} has completed the service on your device.
                Please inspect the work, approve payment to credit the workshop, or request rework if dissatisfied.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-machined border border-hairline bg-bench p-4 text-right sm:min-w-[180px]">
            <span className="font-mono text-eyebrow uppercase tracking-wider text-steel">
              Total Payable
            </span>
            <div className="font-mono text-2xl font-bold tabular-nums text-enamel">
              {formatMoney(totalPayable, booking.currency)}
            </div>
            <div className="mt-1 text-xs text-steel-soft">
              Repair: {formatMoney(repairAmount, booking.currency)}
              {booking.platform_fee > 0 ? ` + Fee: ${formatMoney(booking.platform_fee, booking.currency)}` : ""}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
          <div className="flex items-center gap-2 text-xs text-steel">
            <ShieldCheck className="size-4 text-verdigris" />
            <span>5% Shop Pro Cashback applied to workshop on settlement</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevisionOpen(true)}
              className="border-rust/40 text-rust hover:bg-rust/10 hover:text-rust"
            >
              <RotateCcw className="size-4" />
              Dissatisfied? Request Changes
            </Button>

            <Button
              type="button"
              onClick={() => setPaymentOpen(true)}
              className="bg-signal font-semibold text-charcoal shadow-sm hover:bg-signal/90"
            >
              <Coins className="size-4" />
              Approve & Pay (UPI / Card / Balance)
            </Button>
          </div>
        </div>

        {/* Payment Sheet */}
        <PaymentSheet
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          amountMinor={totalPayable}
          balanceMinor={balanceMinor}
          title={`Settle ${booking.reference} Repair Bill`}
          description={`Payment of ${formatMoney(totalPayable, booking.currency)} for ${booking.device_details ?? "repair"} at ${booking.shop?.shop_name ?? "Workshop"}.`}
          purchaseFields={{ bookingId: booking.id }}
          purchaseAction={settleCompletedBooking}
          confirmLabel="Approve & Pay"
        />

        {/* Dissatisfaction / Request Changes Dialog */}
        <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rust">
                <RotateCcw className="size-5" />
                Request Changes / Report Dissatisfaction
              </DialogTitle>
              <DialogDescription>
                Let {booking.shop?.shop_name ?? "the workshop"} know what was not resolved or needs revision.
                Attach clear photos showing the issue. If the workshop denies rework, FixGrid Admin mediation steps in.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitRevision}>
              <DialogBody className="space-y-4">
                {error ? (
                  <div className="flex items-center gap-2 rounded-machined border border-rust/30 bg-rust/10 p-3 text-xs text-rust">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div>
                  <label htmlFor="revision-reason" className="block text-xs font-semibold uppercase tracking-wider text-enamel">
                    What is wrong or needs improvement? <span className="text-rust">*</span>
                  </label>
                  <textarea
                    id="revision-reason"
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Screen has touch latency on top right corner, or speaker still sounds muffled..."
                    className="mt-1.5 w-full rounded-machined border border-hairline bg-chalk p-3 text-sm text-enamel placeholder:text-steel focus:border-signal focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-xs text-steel-soft">
                    Minimum 10 characters. Be specific so the technician knows what to adjust.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-enamel">
                    Attach Evidence Photos (Recommended)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-machined border-2 border-dashed border-hairline bg-bench/50 p-4 transition-colors hover:border-signal hover:bg-bench"
                  >
                    <UploadCloud className="size-6 text-steel-soft" />
                    <p className="mt-1 text-xs font-medium text-enamel">
                      Click to upload photos of the device
                    </p>
                    <p className="text-[11px] text-steel-soft">
                      PNG, JPG up to 10MB each (max 6 images)
                    </p>
                  </div>

                  {files.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-xs text-enamel"
                        >
                          <Paperclip className="size-3 text-steel-soft" />
                          <span className="max-w-[140px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="ml-1 text-steel hover:text-rust"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </DialogBody>

              <DialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-hairline pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevisionOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || reason.trim().length < 10}
                  className="bg-rust text-chalk hover:bg-rust/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Send Request to Workshop"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Case 3: Closed (Repair paid and settled)
  if (booking.status === "closed") {
    return (
      <div className="flex items-center justify-between rounded-machined border border-verdigris/30 bg-verdigris/5 p-4 text-sm text-verdigris shadow-bench">
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 shrink-0 text-verdigris" />
          <div>
            <span className="font-semibold text-enamel">Repair Settled & Completed</span>
            <p className="text-xs text-steel">
              Bill paid. Workshop credited with 5% Pro Cashback. Warranty coverage is in effect.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
