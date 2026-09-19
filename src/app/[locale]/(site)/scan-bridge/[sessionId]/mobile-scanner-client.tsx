"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  AlertCircle,
  Barcode,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Synthesize pleasant scanner beep via Web Audio API
function playBeep() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio error if user hasn't interacted
  }
}

export function MobileScannerClient({ sessionId }: { sessionId: string }) {
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [scannedFormat, setScannedFormat] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [synced, setSynced] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState("");
  const [detectorSupported, setDetectorSupported] = React.useState(true);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanningRef = React.useRef(true);

  // Initialize camera
  const startCamera = React.useCallback(async () => {
    setCameraError(null);
    scanningRef.current = true;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check BarcodeDetector support
      if ("BarcodeDetector" in window) {
        const formats = [
          "qr_code",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "itf",
          "data_matrix",
        ];
        const detector = new (window as any).BarcodeDetector({ formats });

        const scanLoop = async () => {
          if (!scanningRef.current || !videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0]?.rawValue) {
              const raw = barcodes[0].rawValue;
              const fmt = barcodes[0].format || "barcode";
              handleCodeScanned(raw, fmt);
              return;
            }
          } catch (e) {
            // Frame detection error, continue
          }
          if (scanningRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };

        requestAnimationFrame(scanLoop);
      } else {
        setDetectorSupported(false);
      }
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings or enter code below."
          : "Could not start camera. Enter code manually below.",
      );
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCodeScanned = async (code: string, format?: string) => {
    if (!scanningRef.current && synced) return;
    scanningRef.current = false;
    stopCamera();

    // Feedback
    playBeep();
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }

    setScannedCode(code);
    setScannedFormat(format || "barcode");
    setSyncing(true);

    try {
      const res = await fetch("/api/scan-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sessionId,
          code,
          format: format || "barcode",
        }),
      });

      if (res.ok) {
        setSynced(true);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to sync to laptop.");
      }
    } catch (e) {
      alert("Network error while syncing to laptop.");
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim(), "manual");
  };

  const handleScanAnother = async () => {
    setScannedCode(null);
    setScannedFormat(null);
    setSynced(false);
    setManualCode("");

    // Reset session on server
    try {
      await fetch("/api/scan-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", sessionId }),
      });
    } catch (e) {
      // Ignore
    }

    startCamera();
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#ea580c] text-white">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">FixGrid Mobile Scanner</h1>
            <p className="text-[11px] text-white/60 flex items-center gap-1">
              <Laptop className="size-3 text-emerald-400" />
              Connected to Laptop
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] bg-white/10 px-2 py-1 rounded text-white/70">
          {sessionId}
        </span>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-4 flex flex-col items-center">
        {synced && scannedCode ? (
          <div className="w-full bg-white/5 border border-emerald-500/40 rounded-2xl p-6 text-center shadow-xl backdrop-blur">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="size-9" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              Scanned & Synced!
            </h2>
            <p className="text-xs text-white/70 mb-4">
              Code successfully transmitted to your laptop screen in real time.
            </p>

            <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 mb-5 text-left">
              <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                <span>DETECTED VALUE</span>
                <span className="uppercase text-emerald-400 font-semibold">{scannedFormat}</span>
              </div>
              <p className="font-mono text-base font-bold text-white break-all select-all">
                {scannedCode}
              </p>
            </div>

            <Button
              onClick={handleScanAnother}
              className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="size-4" />
              <span>Scan Another Item</span>
            </Button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Viewfinder Frame */}
            <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-[#ea580c]/60 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Guides */}
              <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl">
                {/* Corner Markers */}
                <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-[#ea580c] rounded-tl" />
                <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-[#ea580c] rounded-tr" />
                <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-[#ea580c] rounded-bl" />
                <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-[#ea580c] rounded-br" />

                {/* Laser scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ea580c] to-transparent shadow-[0_0_8px_#ea580c] animate-pulse top-1/2 -translate-y-1/2" />
              </div>

              {cameraError ? (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="size-10 text-amber-400 mb-2" />
                  <p className="text-xs text-white/80 mb-3">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={startCamera}
                    className="text-xs"
                  >
                    Retry Camera
                  </Button>
                </div>
              ) : null}

              {syncing ? (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                  <Loader2 className="size-8 text-[#ea580c] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-white">Syncing to Laptop…</p>
                </div>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-white/70 text-center flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#ea580c]" />
              Aim camera at any Barcode (EAN, UPC, Code 128) or QR Pass
            </p>

            {/* Manual Code Input Option */}
            <form onSubmit={handleManualSubmit} className="w-full max-w-[320px] mt-6 pt-4 border-t border-white/10">
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-wider">
                Or Type Code Directly
              </label>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. FIX-WU9JU4 or Barcode"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualCode.trim()}
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white shrink-0"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="py-3 border-t border-white/10 text-center text-[11px] text-white/50">
        FixGrid Shield Live Device Verification &bull; Mobile-to-Laptop Bridge
      </footer>
    </div>
  );
}
