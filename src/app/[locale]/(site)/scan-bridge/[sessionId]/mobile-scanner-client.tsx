"use client";

import * as React from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/library";
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
  SwitchCamera,
  Check,
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
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio error
  }
}

// Downscale an image file to max dimension for fast, lag-free scanning
async function downscaleImage(file: File, maxDim = 1000): Promise<{ img: HTMLImageElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return reject(new Error("Could not create canvas context"));

        ctx.drawImage(img, 0, 0, width, height);

        const scaledImg = new Image();
        scaledImg.onload = () => resolve({ img: scaledImg, canvas, ctx });
        scaledImg.onerror = reject;
        scaledImg.src = canvas.toDataURL("image/jpeg", 0.85);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string | undefined>(undefined);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const zxingReaderRef = React.useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecure(
        window.isSecureContext ??
          (window.location.protocol === "https:" || window.location.hostname === "localhost")
      );
    }
  }, []);

  // Initialize ZXing reader instance
  const getZxingReader = () => {
    if (!zxingReaderRef.current) {
      zxingReaderRef.current = new BrowserMultiFormatReader();
    }
    return zxingReaderRef.current;
  };

  const stopCamera = React.useCallback(() => {
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (e) {
        // Ignore
      }
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const startLiveCamera = async (overrideDeviceId?: string) => {
    setCameraError(null);
    setCameraStarting(true);
    stopCamera();

    const reader = getZxingReader();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Live camera is not supported on this browser connection. Please use 'Snap Photo' below.");
      }

      // Discover camera devices
      let devices: MediaDeviceInfo[] = [];
      try {
        devices = await reader.listVideoInputDevices();
        setVideoDevices(devices);
      } catch (e) {
        // Continue
      }

      // Pick preferred camera (rear/environment if available)
      let targetDeviceId = overrideDeviceId;
      if (!targetDeviceId && devices.length > 0) {
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        targetDeviceId = back ? back.deviceId : devices[devices.length - 1]?.deviceId;
      }
      setCurrentDeviceId(targetDeviceId);

      if (!videoRef.current) {
        throw new Error("Video display element not ready");
      }

      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.setAttribute("autoplay", "true");
      videoRef.current.muted = true;

      // Start continuous stream decoding with ZXing
      reader.decodeFromVideoDevice(
        targetDeviceId || null,
        videoRef.current,
        (result, err) => {
          if (result) {
            stopCamera();
            handleCodeScanned(result.getText(), result.getBarcodeFormat()?.toString() || "barcode");
          }
        }
      );

      setCameraActive(true);
      setCameraStarting(false);
    } catch (err: any) {
      stopCamera();
      setCameraStarting(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Tap 'Snap Photo' below to use the native camera, or allow camera in browser site settings.");
      } else {
        setCameraError(err.message || "Could not start camera. Use 'Snap Photo' below instead.");
      }
    }
  };

  // Flip between available cameras
  const switchCamera = () => {
    if (videoDevices.length <= 1) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    if (nextDevice) {
      startLiveCamera(nextDevice.deviceId);
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCodeScanned = async (code: string, format?: string) => {
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

  // Ultra-Fast Photo Snap & Barcode Decode
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(true);
    try {
      // 1. Downscale image to max 1000px so it decodes in ~30ms without freezing
      const { img, canvas, ctx } = await downscaleImage(file, 1000);

      // 2. Decode using ZXing (handles ALL 1D and 2D barcodes)
      const reader = getZxingReader();
      try {
        const zxingResult = await reader.decodeFromImageElement(img);
        if (zxingResult && zxingResult.getText()) {
          setProcessingPhoto(false);
          handleCodeScanned(zxingResult.getText(), zxingResult.getBarcodeFormat()?.toString() || "barcode");
          return;
        }
      } catch (zxingErr) {
        // Fall through to jsQR and BarcodeDetector
      }

      // 3. Fallback: jsQR for QR codes
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imgData.data, canvas.width, canvas.height);
      if (qr && qr.data) {
        setProcessingPhoto(false);
        handleCodeScanned(qr.data, "qr_code");
        return;
      }

      // 4. Fallback: native BarcodeDetector if supported
      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector();
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            setProcessingPhoto(false);
            handleCodeScanned(barcodes[0].rawValue, barcodes[0].format || "barcode");
            return;
          }
        } catch (detectorErr) {
          // Pass
        }
      }

      setProcessingPhoto(false);
      alert("No clear barcode or QR detected in that photo. Please take a closer photo with good lighting, or type the code below.");
    } catch (err: any) {
      setProcessingPhoto(false);
      alert("Could not process photo. Please enter code manually below.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Hidden file input for native camera snap */}
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
            <h1 className="text-sm font-bold tracking-tight">FixGrid Real Scanner</h1>
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
            Live video streaming requires HTTPS. Tap <strong>&quot;📸 Snap Photo to Scan&quot;</strong> below to use your native phone camera without any permission issues!
          </p>
        </div>
      ) : null}

      {/* Main Content Area */}
      <main className="my-auto py-3 flex flex-col items-center">
        {synced && scannedCode ? (
          <div className="w-full bg-white/5 border border-emerald-500/40 rounded-2xl p-6 text-center shadow-xl backdrop-blur">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="size-9" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              Verified &amp; Synced!
            </h2>
            <p className="text-xs text-white/70 mb-4">
              Real barcode decoded and transmitted to your laptop screen.
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
                autoPlay
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {cameraActive ? (
                /* Active Viewfinder */
                <>
                  <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl">
                    <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-[#ea580c] rounded-tl" />
                    <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-[#ea580c] rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-[#ea580c] rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-[#ea580c] rounded-br" />
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ea580c] to-transparent shadow-[0_0_8px_#ea580c] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    {videoDevices.length > 1 ? (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="rounded-lg bg-black/60 p-1.5 text-white hover:bg-black"
                        title="Switch Camera"
                      >
                        <SwitchCamera className="size-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                /* Inactive / Start View */
                <div className="p-6 text-center flex flex-col items-center">
                  {cameraStarting ? (
                    <>
                      <Loader2 className="size-10 text-[#ea580c] animate-spin mb-3" />
                      <p className="text-xs text-white/80 font-medium">Starting live camera…</p>
                    </>
                  ) : (
                    <>
                      <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-[#ea580c] mb-3">
                        <Camera className="size-7" />
                      </div>
                      <p className="text-xs text-white/80 font-medium mb-3">
                        {cameraError || "Point camera at any barcode or QR passport to scan"}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => startLiveCamera()}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs gap-1.5 font-semibold"
                      >
                        <Camera className="size-3.5" />
                        <span>Start Live Camera</span>
                      </Button>
                    </>
                  )}
                </div>
              )}

              {syncing || processingPhoto ? (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
                  <Loader2 className="size-8 text-[#ea580c] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-white">
                    {processingPhoto ? "Decoding barcode from photo…" : "Syncing to Laptop…"}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Failsafe Instant Snap Button (Native Camera - Ultra Fast) */}
            <div className="w-full max-w-[320px] mt-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingPhoto || syncing}
                className="w-full bg-white/10 hover:bg-white/15 border-white/20 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Camera className="size-4 text-[#ea580c]" />
                <span>📸 Snap Photo of Barcode / QR (Instant Scan)</span>
              </Button>
            </div>

            <p className="mt-2 text-[11px] text-white/60 text-center flex items-center gap-1.5">
              <Sparkles className="size-3 text-[#ea580c]" />
              Real Multi-Format Engine &bull; QR, EAN-13, UPC, Code 128
            </p>

            {/* Manual Code Input Option */}
            <form onSubmit={handleManualSubmit} className="w-full max-w-[320px] mt-4 pt-3 border-t border-white/10">
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-wider">
                Or Enter / Paste Code
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

      {/* Footer */}
      <footer className="py-2 border-t border-white/10 text-center text-[10px] text-white/40">
        FixGrid Real Barcode &amp; Passport Scanner &bull; ZXing Engine
      </footer>
    </div>
  );
}
