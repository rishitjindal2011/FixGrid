"use client";

import * as React from "react";
import jsQR from "jsqr";
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
  Image as ImageIcon,
  Check,
  Upload,
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
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio error
  }
}

export function MobileScannerClient({ sessionId }: { sessionId: string }) {
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [scannedFormat, setScannedFormat] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [synced, setSynced] = React.useState(false);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [cameraStarting, setCameraStarting] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isSecure, setIsSecure] = React.useState(true);
  const [manualCode, setManualCode] = React.useState("");
  const [processingPhoto, setProcessingPhoto] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scanningRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Check secure context on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecure(window.isSecureContext ?? (window.location.protocol === "https:" || window.location.hostname === "localhost"));
    }
  }, []);

  // Safe camera stream acquire with fallback cascade
  const acquireCameraStream = async (): Promise<MediaStream> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Camera API not supported in this browser. Please use 'Snap Photo' below.");
    }

    // Attempt 1: Back camera ideal
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
    } catch (e1) {
      // Attempt 2: Direct environment
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (e2) {
        // Attempt 3: Any available camera
        return await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraStarting(true);
    scanningRef.current = true;

    try {
      const stream = await acquireCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraStarting(false);
      startScanLoop();
    } catch (err: any) {
      setCameraStarting(false);
      setCameraActive(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Tap 'Snap Photo' below to use the native camera, or allow camera in browser site settings.");
      } else {
        setCameraError(err.message || "Could not start live camera. Use 'Snap Photo' below instead.");
      }
    }
  };

  const stopCamera = React.useCallback(() => {
    scanningRef.current = false;
    setCameraActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Frame detection using both jsQR and BarcodeDetector
  const startScanLoop = () => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let barcodeDetector: any = null;
    if ("BarcodeDetector" in window) {
      try {
        const formats = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "data_matrix"];
        barcodeDetector = new (window as any).BarcodeDetector({ formats });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const checkFrame = async () => {
      if (!scanningRef.current || !videoRef.current || !streamRef.current) return;

      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        // 1. Check BarcodeDetector on video element first if supported
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0 && barcodes[0]?.rawValue) {
              handleCodeScanned(barcodes[0].rawValue, barcodes[0].format || "barcode");
              return;
            }
          } catch (e) {
            // Frame detector pass
          }
        }

        // 2. jsQR software fallback on Canvas
        if (ctx) {
          canvas.width = Math.min(video.videoWidth, 640);
          canvas.height = Math.min(video.videoHeight, 640);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (qr && qr.data) {
            handleCodeScanned(qr.data, "qr_code");
            return;
          }
        }
      }

      if (scanningRef.current) {
        requestAnimationFrame(checkFrame);
      }
    };

    requestAnimationFrame(checkFrame);
  };

  // Try graceful start on mount (some browsers allow it if site was previously approved)
  React.useEffect(() => {
    // Only attempt silent auto-start if in secure context
    if (window.isSecureContext) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const handleCodeScanned = async (code: string, format?: string) => {
    if (!scanningRef.current && synced) return;
    scanningRef.current = false;
    stopCamera();

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

  // Native Camera Photo Snap Handler (100% Reliable, No WebRTC Permissions Needed)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 1. Try BarcodeDetector on image
      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "data_matrix"],
          });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            URL.revokeObjectURL(objectUrl);
            setProcessingPhoto(false);
            handleCodeScanned(barcodes[0].rawValue, barcodes[0].format || "barcode");
            return;
          }
        } catch (e) {
          // Continue to jsQR
        }
      }

      // 2. Try jsQR on canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height);
        if (qr && qr.data) {
          URL.revokeObjectURL(objectUrl);
          setProcessingPhoto(false);
          handleCodeScanned(qr.data, "qr_code");
          return;
        }
      }

      URL.revokeObjectURL(objectUrl);
      setProcessingPhoto(false);
      alert("Could not detect a clear barcode or QR in that photo. Please try taking a closer photo or enter the code manually.");
    } catch (err) {
      setProcessingPhoto(false);
      alert("Failed to read photo. Please enter code manually below.");
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
      {/* Hidden file input for native camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Top Header */}
      <header className="flex items-center justify-between py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#ea580c] text-white shadow-md">
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

      {/* Insecure Context Warning */}
      {!isSecure ? (
        <div className="my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300">
          <p className="font-semibold flex items-center gap-1">
            <AlertCircle className="size-3.5" />
            HTTP Connection Detected
          </p>
          <p className="mt-1 text-[11px] text-white/70">
            Mobile browsers disable live video streaming on HTTP. Tap <strong>&quot;📸 Snap Photo&quot;</strong> below to use your phone&apos;s camera without any permission issues!
          </p>
        </div>
      ) : null}

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
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {cameraActive ? (
                /* Viewfinder Target Guides */
                <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl">
                  <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-[#ea580c] rounded-tl" />
                  <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-[#ea580c] rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-[#ea580c] rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-[#ea580c] rounded-br" />

                  {/* Laser scan line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ea580c] to-transparent shadow-[0_0_8px_#ea580c] animate-pulse top-1/2 -translate-y-1/2" />
                </div>
              ) : (
                /* Inactive / Prompt Overlay */
                <div className="p-6 text-center flex flex-col items-center">
                  {cameraStarting ? (
                    <>
                      <Loader2 className="size-10 text-[#ea580c] animate-spin mb-3" />
                      <p className="text-xs text-white/80 font-medium">Starting camera…</p>
                    </>
                  ) : (
                    <>
                      <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-[#ea580c] mb-3">
                        <Camera className="size-7" />
                      </div>
                      <p className="text-xs text-white/80 font-medium mb-3">
                        {cameraError || "Tap below to activate camera or take a photo"}
                      </p>
                      <Button
                        size="sm"
                        onClick={startCamera}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs gap-1.5 font-semibold"
                      >
                        <Camera className="size-3.5" />
                        <span>Enable Live Camera</span>
                      </Button>
                    </>
                  )}
                </div>
              )}

              {syncing || processingPhoto ? (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center">
                  <Loader2 className="size-8 text-[#ea580c] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-white">
                    {processingPhoto ? "Analyzing photo for barcode…" : "Syncing to Laptop…"}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Failsafe Photo Snap Button (Native Camera - Always Works Everywhere) */}
            <div className="w-full max-w-[320px] mt-4 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingPhoto || syncing}
                className="w-full bg-white/10 hover:bg-white/15 border-white/20 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Camera className="size-4 text-[#ea580c]" />
                <span>📸 Snap Photo of Barcode / QR (No Permission Needed)</span>
              </Button>
            </div>

            <p className="mt-2.5 text-[11px] text-white/60 text-center flex items-center gap-1.5">
              <Sparkles className="size-3 text-[#ea580c]" />
              Works with ANY Barcode (EAN, UPC, Code 128) &amp; FixGrid QR Pass
            </p>

            {/* Manual Code Input Option */}
            <form onSubmit={handleManualSubmit} className="w-full max-w-[320px] mt-5 pt-4 border-t border-white/10">
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-wider">
                Or Type / Paste Code Directly
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
                  disabled={!manualCode.trim() || syncing}
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
      <footer className="py-2.5 border-t border-white/10 text-center text-[10px] text-white/40">
        FixGrid Shield Live Device Verification &bull; Mobile-to-Laptop Sync Bridge
      </footer>
    </div>
  );
}
