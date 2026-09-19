"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Check, Loader2, Scale, ShieldAlert, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { acceptRework, denyRework } from "@/lib/dashboard/expert-actions";

interface RevisionActionsProps {
  bookingId: string;
  reference: string;
  customerName: string;
}

export function RevisionActions({
  bookingId,
  reference,
  customerName,
}: RevisionActionsProps) {
  const [denyOpen, setDenyOpen] = React.useState(false);
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptRework, BOOKING_INITIAL_STATE);
  const [denyState, denyAction, denyPending] = useActionState(denyRework, BOOKING_INITIAL_STATE);

  React.useEffect(() => {
    if (denyState.success && denyOpen) {
      setDenyOpen(false);
    }
  }, [denyState.success, denyOpen]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Accept Rework Form */}
      <form action={acceptAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={acceptPending}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {acceptPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          <span>Accept Rework</span>
        </Button>
      </form>

      {/* Deny & Escalate Button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setDenyOpen(true)}
        className="gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400"
      >
        <Scale className="size-3.5" />
        <span>Deny & Escalate</span>
      </Button>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent className="max-w-md">
          <form action={denyAction}>
            <input type="hidden" name="bookingId" value={bookingId} />

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-enamel font-display uppercase tracking-tight">
                <ShieldAlert className="size-5 text-rose-500" />
                <span>Escalate Dispute — {reference}</span>
              </DialogTitle>
              <DialogDescription>
                If you believe the customer&apos;s request is unjustified or outside agreed scope, escalate to FixGrid Admin disputes for official mediation.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4 pt-2">
              {denyState.error ? (
                <div className="rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                  {denyState.error}
                </div>
              ) : null}

              <div>
                <label htmlFor="reason" className="eyebrow mb-1.5 block">
                  Workshop Defense / Reason for Dispute
                </label>
                <Textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  placeholder="Explain why the customer's request should not be granted (e.g. device was fully tested, physical damage occurred post-pickup, etc.)…"
                  required
                />
              </div>

              <div className="rounded-machined border border-hairline bg-bench p-3 text-xs text-steel leading-relaxed">
                FixGrid Admin will review photos, diagnostics, and chat history. If the admin upholds your work, the customer will be required to pay the bill and your 5% cashback will be released.
              </div>
            </DialogBody>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDenyOpen(false)}
                disabled={denyPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={denyPending}
                className="gap-2"
              >
                {denyPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Escalating…</span>
                  </>
                ) : (
                  <>
                    <Scale className="size-3.5" />
                    <span>Confirm Escalation to Admin</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
