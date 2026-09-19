"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Coins,
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle,
  Receipt,
  X,
  Image as ImageIcon,
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
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { fileCashbackClaimWithFile } from "@/lib/dashboard/cashback-actions";
import { formatMoney } from "@/lib/format";

interface FileCashbackModalProps {
  bookingId: string;
  reference: string;
  amountMinor: number;
  currency?: string;
  customerName?: string;
  serviceName?: string;
  trigger?: React.ReactNode;
}

export function FileCashbackModal({
  bookingId,
  reference,
  amountMinor,
  currency = "INR",
  customerName,
  serviceName,
  trigger,
}: FileCashbackModalProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    fileCashbackClaimWithFile,
    BOOKING_INITIAL_STATE,
  );

  const [rupees, setRupees] = React.useState(
    amountMinor ? (amountMinor / 100).toFixed(2) : "",
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const numRupees = parseFloat(rupees) || 0;
  const calculatedCashbackRupees = (numRupees * 0.05).toFixed(2);

  React.useEffect(() => {
    if (state.success && open) {
      setOpen(false);
    }
  }, [state.success, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setFileName(null);
      setPreviewUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="primary"
            className="gap-1.5 bg-[#ea580c] text-white hover:bg-[#c2410c] text-xs font-semibold shadow-sm"
          >
            <UploadCloud className="size-3.5" />
            <span>File Cashback (Upload Bill)</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <form action={formAction}>
          <input type="hidden" name="bookingId" value={bookingId} />

          <DialogHeader>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              <Coins className="size-4" />
              <span>Shop Pro 5% Cashback Claim</span>
            </div>
            <DialogTitle className="font-display text-lg uppercase tracking-tight text-enamel">
              File Cashback Invoice — {reference}
            </DialogTitle>
            <DialogDescription className="text-xs text-steel">
              Upload your customer service bill or receipt for this repair. Once verified by FixGrid Admin, 5% of the bill will be deposited directly to your workshop wallet.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 pt-2">
            {state.error ? (
              <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            ) : null}

            {/* Repair summary tag */}
            <div className="flex items-center justify-between rounded-machined bg-bench p-2.5 text-xs">
              <div>
                <span className="font-mono text-[10px] text-steel-soft uppercase">Booking</span>
                <p className="font-bold text-enamel">{reference}</p>
                {customerName ? <p className="text-[11px] text-steel">{customerName}</p> : null}
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-steel-soft uppercase">Estimated 5% Rebate</span>
                <p className="font-mono text-sm font-bold text-emerald-600">
                  +₹{calculatedCashbackRupees}
                </p>
              </div>
            </div>

            {/* Total repair billed amount */}
            <div>
              <label htmlFor="cashbackAmount" className="eyebrow mb-1.5 block">
                Total Repair Bill Amount (₹)
              </label>
              <Input
                id="cashbackAmount"
                name="amount"
                type="number"
                step="0.01"
                min="1"
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
                placeholder="e.g. 1500"
                required
                className="font-mono"
              />
              <p className="mt-1 text-[11px] text-steel-soft">
                Total amount charged on the bill. Your 5% platform cashback is calculated on this amount.
              </p>
            </div>

            {/* Upload Invoice Bill Photo */}
            <div>
              <label className="eyebrow mb-1.5 block">
                Upload Paper Bill / Invoice Photo (Required for Admin Review)
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-hairline bg-bench/60 p-4 text-center transition hover:border-[#ea580c]">
                <input
                  type="file"
                  name="billFile"
                  accept="image/*,.pdf"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />

                {previewUrl ? (
                  <div className="relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Bill receipt preview"
                      className="max-h-36 rounded-lg object-contain border border-hairline shadow-sm"
                    />
                    <span className="mt-1 block text-[10px] text-steel font-mono">
                      {fileName} (Click to replace)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#ea580c]/10 text-[#ea580c]">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-enamel">
                      {fileName ? fileName : "Click or drag invoice photo here"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-steel">
                      JPG, PNG, WEBP, or PDF up to 10MB
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="cashbackNote" className="eyebrow mb-1.5 block">
                Additional Note for Admin (Optional)
              </label>
              <Textarea
                id="cashbackNote"
                name="note"
                rows={2}
                placeholder="e.g. Customer paid cash for screen replacement. Tax invoice attached."
              />
            </div>

            <div className="rounded-machined border border-hairline bg-bench p-3 text-xs text-steel">
              <div className="flex items-center gap-1.5 font-semibold text-enamel">
                <Sparkles className="size-3.5 text-[#ea580c]" />
                <span>FixGrid Admin Verification</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Once submitted, this claim will appear in the Admin Review Console. Upon acceptance,{" "}
                <strong className="text-emerald-600">₹{calculatedCashbackRupees}</strong> will be deposited directly into your workshop wallet.
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
              disabled={pending || !rupees}
              className="gap-2 bg-[#ea580c] text-white hover:bg-[#c2410c]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting to Admin…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Submit Cashback Claim</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
