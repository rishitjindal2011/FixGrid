"use client";

import * as React from "react";
import {
  QrCode,
  ShieldCheck,
  Maximize2,
  Printer,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  X,
  Truck,
  Wrench,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeliveryMode, BookingStatus } from "@/lib/types/marketplace";

interface CustomerQrPassProps {
  reference: string;
  deliveryMode: DeliveryMode;
  status: BookingStatus;
  shopName: string;
  serviceName?: string | null;
  warrantyDays?: number;
  finalAmount?: number | null;
  quotedAmount?: number | null;
  isPriceFinalised?: boolean;
}

const FINALISED_STATUSES = new Set<BookingStatus>([
  "confirmed",
  "in_progress",
  "completed",
  "closed",
  "disputed",
]);

export function CustomerQrPass({
  reference,
  deliveryMode,
  status,
  shopName,
  serviceName,
  warrantyDays = 30,
  finalAmount,
  quotedAmount,
  isPriceFinalised,
}: CustomerQrPassProps) {
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);

  // Passport and QR should ONLY come when the price is finalised
  const hasPrice =
    (finalAmount !== null && finalAmount !== undefined) ||
    (quotedAmount !== null && quotedAmount !== undefined);

  const priceAgreed = isPriceFinalised ?? (FINALISED_STATUSES.has(status) && hasPrice);

  if (!priceAgreed || !FINALISED_STATUSES.has(status)) {
    return null;
  }

  const passportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/passport/${reference}`
    : `https://www.vytron.me/passport/${reference}`;

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(passportUrl)}&margin=1`;

  // Tailored instructions based on delivery mode & repair status
  let instructionTitle = "In-Shop Handover Pass";
  let instructionText =
    "Show this QR code to the shopkeeper when dropping off your device. They will scan it to verify and start work.";
  let ModeIcon = Store;

  if (deliveryMode === "pickup_drop") {
    instructionTitle = "Home Pickup Pass";
    instructionText =
      "Show this QR code to the collection executive when they arrive at your address to confirm device pickup.";
    ModeIcon = Truck;
  } else if (deliveryMode === "home_visit") {
    instructionTitle = "Home Repair Service Pass";
    instructionText =
      "Show this QR code to the expert technician upon arrival at your home to begin service.";
    ModeIcon = Wrench;
  }

  if (status === "disputed") {
    instructionTitle = "Warranty Claim Handover Pass";
    instructionText =
      "Present this QR code when returning the device for warranty rework. The technician scans it to resume bench repair.";
  } else if (status === "completed" || status === "closed") {
    instructionTitle = "Verified Warranty Passport";
    instructionText =
      `This QR code is your active ${warrantyDays}-day digital warranty passport backed by FixGrid Shield. Anyone scanning it can verify coverage.`;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative overflow-hidden rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#ea580c]/10 text-[#ea580c]">
            <QrCode className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-tight text-enamel">
              {instructionTitle}
            </h3>
            <p className="font-mono text-xs uppercase tracking-wider text-steel-soft">
              REF: <strong className="text-enamel">{reference}</strong>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600">
          <ShieldCheck className="size-3 text-emerald-500" />
          TRUST SHIELD
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Scannable QR Code */}
        <div
          onClick={() => setFullscreenOpen(true)}
          className="group relative cursor-pointer rounded-xl border border-hairline bg-white p-2.5 shadow-sm transition hover:border-[#ea580c] hover:shadow-md"
          title="Click to view full screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageSrc}
            alt={`QR Code Pass for ${reference}`}
            className="size-32 rounded object-contain sm:size-36"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-enamel shadow">
              <Maximize2 className="size-3 text-[#ea580c]" />
              Enlarge
            </span>
          </div>
        </div>

        {/* Info & Action area */}
        <div className="flex flex-1 flex-col justify-between space-y-2.5 text-center sm:text-left">
          <p className="text-xs leading-relaxed text-steel">
            {instructionText}
          </p>

          <div className="rounded-machined border border-hairline/80 bg-bench/60 p-2 text-[11px] text-steel-soft">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-enamel sm:justify-start">
              <Sparkles className="size-3 text-[#ea580c]" />
              <span>FixGrid Shield QR Warranty Passport</span>
            </div>
            <p className="mt-0.5">
              This exact same QR code serves as your device&apos;s physical & digital warranty seal.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreenOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Maximize2 className="size-3.5" />
              <span>Fullscreen QR</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-steel hover:text-signal"
            >
              <a href={`/passport/${reference}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                <span>View Passport</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Fullscreen QR Modal for Easy Technician Scanning */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              <ShieldCheck className="size-4" />
              <span>Handover & Warranty QR Pass</span>
            </div>
            <DialogTitle className="font-display text-xl uppercase tracking-tight text-enamel">
              {reference}
            </DialogTitle>
            <DialogDescription className="text-xs text-steel">
              Present this high-contrast QR code to the technician or workshop scanner.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hairline bg-white p-6 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageSrc}
              alt={`QR Code Pass for ${reference}`}
              className="size-56 rounded-lg object-contain"
            />
            <p className="mt-3 font-mono text-xs font-bold tracking-widest text-enamel">
              {reference}
            </p>
            <p className="text-[11px] text-steel">
              {serviceName || "FixGrid Verified Repair"} · {shopName}
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print Pass</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setFullscreenOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
