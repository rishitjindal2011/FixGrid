"use client";

import * as React from "react";
import { QrCode, Printer, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QrSealDialogProps {
  reference: string;
  shopName: string;
  warrantyDays: number;
  completedAt?: string;
  trigger?: React.ReactNode;
}

export function QrSealDialog({
  reference,
  shopName,
  warrantyDays,
  completedAt,
  trigger,
}: QrSealDialogProps) {
  const [open, setOpen] = React.useState(false);
  const passportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/passport/${reference}`
    : `https://www.vytron.me/passport/${reference}`;

  // QR image generated via quick dynamic Google Charts / QR standard or local
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(passportUrl)}&margin=1`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 border-hairline hover:border-[#ea580c] hover:text-[#ea580c]">
            <QrCode className="size-4 text-[#ea580c]" />
            <span>QR Warranty Seal</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            <ShieldCheck className="size-4" />
            <span>FixGrid Certified Seal</span>
          </div>
          <DialogTitle className="font-display text-xl uppercase tracking-tight text-enamel">
            Printable QR Warranty Sticker
          </DialogTitle>
          <DialogDescription className="text-xs text-steel">
            Affix this physical QR warranty seal directly to the repaired device or service receipt for instant customer verification.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Physical Sticker Preview */}
        <div
          id="qr-printable-sticker"
          className="my-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-hairline bg-bench p-6 text-center shadow-sm"
        >
          {/* Brand & Security Header */}
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-black tracking-tight text-enamel">
              FIX<span className="text-[#ea580c]">GRID</span> SHIELD
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600">
              TAMPER-PROOF
            </span>
          </div>

          <p className="mt-1 font-mono text-[10px] text-steel">
            REF: <strong className="text-enamel">{reference}</strong>
          </p>

          {/* QR Code Container */}
          <div className="my-3 rounded-xl border border-hairline bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageSrc}
              alt={`QR Seal for ${reference}`}
              className="size-36 rounded"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-enamel">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>{warrantyDays}-Day Verified Warranty</span>
          </div>

          <p className="mt-0.5 text-[11px] text-steel">
            Serviced by: <strong className="text-enamel">{shopName}</strong>
          </p>

          <p className="mt-2 text-[9px] uppercase tracking-wider text-steel-soft">
            Scan with any phone camera to verify cover
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(`/passport/${reference}`, "_blank");
              }
            }}
          >
            <Printer className="size-4" />
            <span>Open & Print</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
