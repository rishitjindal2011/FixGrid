"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldCheck,
  Wrench,
  Truck,
  Store,
  AlertTriangle,
  Sparkles,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { verifyAndStartWorkWithQr } from "@/lib/dashboard/qr-actions";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import type { DeliveryMode, BookingStatus } from "@/lib/types/marketplace";

interface QrStartWorkDialogProps {
  bookingId: string;
  reference: string;
  customerName: string;
  deliveryMode: DeliveryMode;
  status: BookingStatus;
}

export function QrStartWorkDialog({
  bookingId,
  reference,
  customerName,
  deliveryMode,
  status,
}: QrStartWorkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    verifyAndStartWorkWithQr,
    BOOKING_INITIAL_STATE,
  );

  const [inputCode, setInputCode] = React.useState(reference);
  const [useCamera, setUseCamera] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    if (state.success && open) {
      stopCamera();
      setOpen(false);
    }
  }, [state.success, open]);

  // Clean up camera stream when dialog closes
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by your browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseCamera(true);

      // Check if native BarcodeDetector is available
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
        const intervalId = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(intervalId);
            return;
          }
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0]?.rawValue) {
              const raw = barcodes[0].rawValue;
              setInputCode(raw);
              clearInterval(intervalId);
              stopCamera();
            }
          } catch (e) {
            // Detector frame scan error, continue scanning
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError("Could not start camera. You can type or confirm the reference below.");
      setUseCamera(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopCamera();
    }
    setOpen(nextOpen);
  };

  // Determine label and mode context
  let context: "in_shop" | "pickup_drop" | "home_service" | "warranty_claim" = "in_shop";
  let buttonLabel = "Scan QR to Start Work";
  let title = "Scan Customer QR — Start Work";
  let description = `Ask ${customerName} to show their Booking QR Pass. Scanning it verifies device handover and begins bench repair.`;
  let Icon = Wrench;

  if (status === "disputed") {
    context = "warranty_claim";
    buttonLabel = "Scan QR — Accept Warranty Rework";
    title = "Verify Warranty QR & Begin Rework";
    description = `Verify ${customerName}'s Warranty QR Pass to accept the returned unit and place it back on the bench.`;
    Icon = RotateCcw;
  } else if (deliveryMode === "pickup_drop") {
    context = "pickup_drop";
    buttonLabel = "Scan QR to Confirm Pickup";
    title = "Scan Customer QR — Confirm Pickup";
    description = `Scan the customer's QR Pass at their doorstep to confirm device collection and update status to underway.`;
    Icon = Truck;
  } else if (deliveryMode === "home_visit") {
    context = "home_service";
    buttonLabel = "Scan QR to Start Home Repair";
    title = "Scan Customer QR — Start Home Repair";
    description = `Technician has arrived at ${customerName}'s location. Scan customer's QR Pass to verify handover and start work.`;
    Icon = Wrench;
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="primary"
        onClick={() => setOpen(true)}
        className="w-full gap-2 bg-[#ea580c] text-white hover:bg-[#c2410c] shadow-sm font-semibold"
      >
        <QrCode className="size-4" />
        <span>{buttonLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <form action={formAction}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="reference" value={reference} />
            <input type="hidden" name="context" value={context} />

            <DialogHeader>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                <ShieldCheck className="size-4" />
                <span>FixGrid Verified Handover</span>
              </div>
              <DialogTitle className="font-display text-lg uppercase tracking-tight text-enamel">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-steel">
                {description}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4 pt-2">
              {state.error ? (
                <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              ) : null}

              {/* Camera Scanner or Manual Entry */}
              {useCamera ? (
                <div className="relative overflow-hidden rounded-xl border border-hairline bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-52 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="size-36 rounded-lg border-2 border-dashed border-[#ea580c] bg-transparent" />
                    <span className="mt-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">
                      Align customer QR within frame
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black"
                  >
                    Close Camera
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-bench p-4 text-center">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#ea580c]/10 text-[#ea580c]">
                    <QrCode className="size-5" />
                  </div>
                  <p className="font-mono text-xs font-bold text-enamel">
                    TARGET: {reference}
                  </p>
                  <p className="mt-0.5 text-[11px] text-steel">
                    Customer presents their booking pass on phone or printed receipt.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="mt-3 gap-1.5 text-xs"
                  >
                    <Camera className="size-3.5 text-[#ea580c]" />
                    <span>Open Camera Scanner</span>
                  </Button>
                  {cameraError ? (
                    <p className="mt-2 text-[11px] text-rust">{cameraError}</p>
                  ) : null}
                </div>
              )}

              {/* Verified Code Input (Auto-filled or Scanned) */}
              <div>
                <label htmlFor="scannedCode" className="eyebrow mb-1.5 block">
                  Scanned QR Payload or Booking Code
                </label>
                <div className="relative">
                  <Input
                    id="scannedCode"
                    name="scannedCode"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="e.g. FIX-WU9JU4 or scanned URL"
                    required
                    className="font-mono"
                  />
                  <KeyRound className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft" />
                </div>
                <p className="mt-1 text-[11px] text-steel-soft">
                  Verifies physical handover of device. Once started, you can complete and bill work at any time without requiring a QR code.
                </p>
              </div>

              <div className="rounded-machined border border-hairline bg-bench p-3 text-xs text-steel">
                <div className="flex items-center gap-1.5 font-semibold text-enamel">
                  <Sparkles className="size-3.5 text-[#ea580c]" />
                  <span>Shop Pro Seamless Workflow</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  QR verification secures proof of device possession. When finished, you may mark complete anytime via the bench dialog with online or cash payment options.
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
                disabled={pending || !inputCode.trim()}
                className="gap-2 bg-[#ea580c] text-white hover:bg-[#c2410c]"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Verifying & Starting…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Verify QR & Start Work</span>
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
