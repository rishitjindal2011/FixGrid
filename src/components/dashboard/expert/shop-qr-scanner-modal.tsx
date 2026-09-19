"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldCheck,
  Search,
  ExternalLink,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  Store,
  Sparkles,
  Calendar,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhoneScannerBridge } from "@/components/dashboard/expert/phone-scanner-bridge";
import { lookupWarrantyQrCode, type QrLookupResult } from "@/lib/dashboard/qr-actions";
import { formatDateLong, formatMoney } from "@/lib/format";

interface ShopQrScannerModalProps {
  trigger?: React.ReactNode;
}

export function ShopQrScannerModal({ trigger }: ShopQrScannerModalProps) {
  const [open, setOpen] = React.useState(false);
  const [scanTab, setScanTab] = React.useState<"phone" | "camera" | "manual">("phone");
  const [inputVal, setInputVal] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<QrLookupResult | null>(null);
  const [useCamera, setUseCamera] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const handleLookup = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await lookupWarrantyQrCode(codeToSearch);
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        error: "Lookup failed. Please check network connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not supported on this browser.");
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
              setInputVal(raw);
              clearInterval(intervalId);
              stopCamera();
              handleLookup(raw);
            }
          } catch (e) {
            // frame detection continue
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError("Camera access denied or unavailable. Please enter reference below.");
      setUseCamera(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopCamera();
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[#ea580c]/30 text-[#ea580c] hover:bg-[#ea580c]/10 hover:text-[#c2410c]"
          >
            <QrCode className="size-4 text-[#ea580c]" />
            <span className="font-semibold">Scan QR / Verify Proof</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            <ShieldCheck className="size-4" />
            <span>FixGrid Shield Proof Verification</span>
          </div>
          <DialogTitle className="font-display text-xl uppercase tracking-tight text-enamel">
            Scan QR Passport & Warranty Seal
          </DialogTitle>
          <DialogDescription className="text-xs text-steel">
            Scan customer warranty stickers, booking passes, or enter reference ID to inspect verified proof and coverage status.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 pt-2">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-bench p-1 border border-hairline text-xs">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setScanTab("phone");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
                scanTab === "phone"
                  ? "bg-white dark:bg-charcoal text-[#ea580c] shadow-sm"
                  : "text-steel hover:text-enamel"
              }`}
            >
              <Smartphone className="size-3.5" />
              <span>📱 Scan with Phone</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanTab("camera");
                startCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
                scanTab === "camera"
                  ? "bg-white dark:bg-charcoal text-[#ea580c] shadow-sm"
                  : "text-steel hover:text-enamel"
              }`}
            >
              <Camera className="size-3.5" />
              <span>💻 Laptop Webcam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                setScanTab("manual");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
                scanTab === "manual"
                  ? "bg-white dark:bg-charcoal text-[#ea580c] shadow-sm"
                  : "text-steel hover:text-enamel"
              }`}
            >
              <Search className="size-3.5" />
              <span>⌨️ Type Code</span>
            </button>
          </div>

          {/* Tab 1: Phone Scanner Bridge */}
          {scanTab === "phone" ? (
            <PhoneScannerBridge
              purpose="warranty_proof"
              onCodeReceived={(code) => {
                setInputVal(code);
                handleLookup(code);
              }}
            />
          ) : null}

          {/* Tab 2: Webcam Scanner */}
          {scanTab === "camera" ? (
            <div>
              {useCamera ? (
                <div className="relative overflow-hidden rounded-xl border border-hairline bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-56 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="size-40 rounded-xl border-2 border-dashed border-[#ea580c] bg-transparent" />
                    <span className="mt-2 rounded bg-black/70 px-2.5 py-1 text-xs text-white">
                      Point camera at device QR sticker
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="absolute right-2.5 top-2.5 rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-black"
                  >
                    Close Camera
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-bench p-6 text-center">
                  <Camera className="size-8 text-[#ea580c]" />
                  <p className="text-xs font-semibold text-enamel">Laptop Webcam Inactive</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="gap-1.5 text-xs mt-1"
                  >
                    <Camera className="size-3.5 text-[#ea580c]" />
                    <span>Turn On Webcam</span>
                  </Button>
                </div>
              )}

              {cameraError ? (
                <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-500 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{cameraError}</p>
                    <p className="text-[11px] text-steel mt-0.5">
                      Laptop cameras can be tricky. Try the <strong>📱 Scan with Phone</strong> tab above!
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Tab 3 / Quick Manual Search */}
          <div className={scanTab === "manual" ? "block" : "pt-1 border-t border-hairline"}>
            <label htmlFor="qrInput" className="eyebrow mb-1.5 block">
              {scanTab === "manual" ? "Enter Booking Reference or Paste Code" : "Or Search / Type Reference Directly"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="qrInput"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup(inputVal);
                    }
                  }}
                  placeholder="e.g. FIX-WU9JU4 or passport URL"
                  className="font-mono text-sm"
                />
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-steel-soft" />
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleLookup(inputVal)}
                disabled={loading || !inputVal.trim()}
                className="bg-[#ea580c] text-white hover:bg-[#c2410c]"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify Proof"}
              </Button>
            </div>
          </div>

          {/* Result Card */}
          {result ? (
            <div className="pt-2">
              {result.success && result.passport ? (
                <div className="rounded-2xl border border-hairline bg-chalk p-4 shadow-bench">
                  <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-enamel">
                          {result.passport.reference}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            result.passport.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : result.passport.status === "expired"
                              ? "bg-steel/10 text-steel"
                              : "bg-[#ea580c]/10 text-[#ea580c]"
                          }`}
                        >
                          {result.passport.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-steel">
                        PASSPORT: <span className="font-mono text-enamel">{result.passport.passportId}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-emerald-600">
                        {result.passport.daysRemaining} Days Left
                      </span>
                      <p className="text-[10px] text-steel">
                        Exp: {formatDateLong(result.passport.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                    <div>
                      <span className="text-steel-soft text-[10px] uppercase font-mono">Customer</span>
                      <p className="font-semibold text-enamel">{result.customerName}</p>
                    </div>
                    <div>
                      <span className="text-steel-soft text-[10px] uppercase font-mono">Serviced By</span>
                      <p className="font-semibold text-enamel truncate">{result.passport.shop.name}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-steel-soft text-[10px] uppercase font-mono">Device / Service</span>
                      <p className="font-semibold text-enamel">{result.passport.deviceName}</p>
                      <p className="text-[11px] text-steel">{result.passport.serviceName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-xs text-steel hover:text-signal"
                    >
                      <a
                        href={`/passport/${result.passport.reference}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-1.5"
                      >
                        <ExternalLink className="size-3.5" />
                        <span>Public Passport</span>
                      </a>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      asChild
                      className="gap-1.5 bg-[#ea580c] text-white hover:bg-[#c2410c]"
                    >
                      <a href={`/dashboard/expert/requests/${result.passport.reference}`}>
                        <span>Open Request Console</span>
                        <ArrowRight className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-xs text-rust">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{result.error || "No warranty record found."}</span>
                </div>
              )}
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
