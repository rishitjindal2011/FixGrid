"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Receipt,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Coins,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  approveCashbackClaimAdmin,
  rejectCashbackClaimAdmin,
} from "@/lib/dashboard/cashback-actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { formatMoney } from "@/lib/format";

interface AdminBillActionDialogProps {
  bill: {
    id: string;
    bookingReference: string;
    shopName: string;
    amountMinor: number;
    currency: string;
    storagePath: string | null;
    imageUrl?: string | null;
    note?: string | null;
    createdAt: string;
  };
}

export function AdminBillActionDialog({ bill }: AdminBillActionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"approve" | "reject">("approve");

  const [approveState, approveAction, approvePending] = useActionState(
    approveCashbackClaimAdmin,
    BOOKING_INITIAL_STATE,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectCashbackClaimAdmin,
    BOOKING_INITIAL_STATE,
  );

  const rebateMinor = Math.floor(bill.amountMinor * 0.05);

  React.useEffect(() => {
    if ((approveState.success || rejectState.success) && open) {
      setOpen(false);
    }
  }, [approveState.success, rejectState.success, open]);

  const currentState = mode === "approve" ? approveState : rejectState;
  const currentPending = approvePending || rejectPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-[#ea580c]/30 text-[#ea580c] hover:bg-[#ea580c]/10 text-xs font-semibold"
        >
          <ShieldCheck className="size-3.5" />
          <span>Admin Review</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-signal">
              <ShieldCheck className="size-4" />
              <span>FixGrid Administrator Console</span>
            </div>
            <DialogTitle className="font-display text-lg uppercase tracking-tight text-enamel">
              Review Cashback Claim — {bill.bookingReference}
            </DialogTitle>
            <DialogDescription className="text-xs text-steel">
              Submitted by <strong>{bill.shopName}</strong> for a repair bill of{" "}
              {formatMoney(bill.amountMinor, bill.currency)}.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 pt-1">
            {currentState.error ? (
              <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{currentState.error}</span>
              </div>
            ) : null}

            {/* Bill Details Summary */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-bench p-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-steel-soft">Shop</span>
                <p className="font-bold text-enamel truncate">{bill.shopName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-steel-soft">Repair Bill Amount</span>
                <p className="font-mono font-bold text-enamel">
                  {formatMoney(bill.amountMinor, bill.currency)}
                </p>
              </div>
              <div className="col-span-2 border-t border-hairline pt-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-enamel">
                  5% Cashback to Deposit into Shop Wallet:
                </span>
                <span className="font-mono text-sm font-bold text-emerald-600">
                  +{formatMoney(rebateMinor, bill.currency)}
                </span>
              </div>
            </div>

            {/* Uploaded Receipt Image Preview */}
            {bill.imageUrl ? (
              <div className="rounded-xl border border-hairline bg-bench p-2.5 text-center">
                <span className="eyebrow mb-1.5 block text-left">Uploaded Invoice Bill Photo</span>
                <div className="relative overflow-hidden rounded-lg border border-hairline bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bill.imageUrl}
                    alt={`Invoice for ${bill.bookingReference}`}
                    className="max-h-56 w-full object-contain"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="mt-2 text-xs text-steel hover:text-signal"
                >
                  <a href={bill.imageUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                    <ExternalLink className="size-3.5" />
                    <span>Open Fullscreen Receipt Image</span>
                  </a>
                </Button>
              </div>
            ) : bill.storagePath ? (
              <div className="rounded-xl border border-hairline bg-bench p-3 text-xs text-steel">
                <p className="font-mono">Storage: {bill.storagePath}</p>
              </div>
            ) : null}

            {bill.note ? (
              <div className="rounded-machined bg-bench p-2.5 text-xs text-steel">
                <span className="eyebrow block mb-0.5">Shopkeeper Note</span>
                <p className="italic">“{bill.note}”</p>
              </div>
            ) : null}

            {/* Action Mode Toggle */}
            <div className="flex gap-2 border-t border-hairline pt-3">
              <Button
                type="button"
                variant={mode === "approve" ? "primary" : "outline"}
                size="sm"
                onClick={() => setMode("approve")}
                className={`flex-1 gap-1.5 ${mode === "approve" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Approve & Credit 5%</span>
              </Button>
              <Button
                type="button"
                variant={mode === "reject" ? "danger" : "outline"}
                size="sm"
                onClick={() => setMode("reject")}
                className="flex-1 gap-1.5"
              >
                <XCircle className="size-3.5" />
                <span>Reject Bill</span>
              </Button>
            </div>

            {/* Forms */}
            {mode === "approve" ? (
              <form action={approveAction} className="space-y-3">
                <input type="hidden" name="billId" value={bill.id} />
                <div>
                  <label htmlFor="adminNote" className="eyebrow mb-1 block">
                    Approval Note (Optional)
                  </label>
                  <Input
                    id="adminNote"
                    name="adminNote"
                    defaultValue="Approved by FixGrid Admin. 5% cashback credited to workshop wallet."
                    className="text-xs"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={currentPending}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {approvePending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Crediting Wallet…</span>
                      </>
                    ) : (
                      <>
                        <Coins className="size-3.5" />
                        <span>Confirm Approval & Credit {formatMoney(rebateMinor, bill.currency)}</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <form action={rejectAction} className="space-y-3">
                <input type="hidden" name="billId" value={bill.id} />
                <div>
                  <label htmlFor="rejectionReason" className="eyebrow mb-1 block">
                    Rejection Reason (Required)
                  </label>
                  <Input
                    id="rejectionReason"
                    name="rejectionReason"
                    placeholder="e.g. Invoice blurry, amount does not match, or duplicate claim."
                    required
                    className="text-xs"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={currentPending}
                    className="w-full gap-2 font-semibold"
                  >
                    {rejectPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Rejecting…</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5" />
                        <span>Confirm Rejection</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogBody>
        </div>
      </DialogContent>
    </Dialog>
  );
}
