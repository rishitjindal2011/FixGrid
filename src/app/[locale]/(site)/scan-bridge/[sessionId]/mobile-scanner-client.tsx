"use client";

import * as React from "react";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  BinaryBitmap,
} from "@zxing/library";
import jsQR from "jsqr";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Laptop,
  Image as ImageIcon,
  SwitchCamera,
  UploadCloud,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Synthesize pleasant scanner beep via Web Audio API
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
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
    // Audio context may be restricted
  }
}

// All major 1D & 2D barcode formats
const ALL_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.AZTEC,
  BarcodeFormat.PDF_417,
  BarcodeFormat.CODABAR,
];

function createConfiguredReader(): MultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_BARCODE_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

// Decode a canvas using ZXing with both Hybrid & GlobalHistogram binarizers
function decodeCanvasWithZxing(
  reader: MultiFormatReader,
  canvas: HTMLCanvasElement
): { text: string; format: string } | null {
  try {
    const lumSource = new HTMLCanvasElementLuminanceSource(canvas);
    // 1. Try HybridBinarizer (standard high-contrast)
    try {
      const binarizer = new HybridBinarizer(lumSource);
      const bitmap = new BinaryBitmap(binarizer);
      reader.reset();
      const result = reader.decodeWithState(bitmap);
      if (result && result.getText()) {
        return {
          text: result.getText(),
          format: result.getBarcodeFormat()?.toString() || "barcode",
        };
      }
    } catch (e) {
      // Ignore and try fallback
    }

    // 2. Try GlobalHistogramBinarizer (better for soft contrast, shadows, reflections)
    try {
      const binarizer = new GlobalHistogramBinarizer(lumSource);
      const bitmap = new BinaryBitmap(binarizer);
      reader.reset();
      const result = reader.decodeWithState(bitmap);
      if (result && result.getText()) {
        return {
          text: result.getText(),
          format: result.getBarcodeFormat()?.toString() || "barcode",
        };
      }
    } catch (e) {
      // Ignore
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Decode a canvas using jsQR (dedicated ultra-fast QR engine)
function decodeCanvasWithJsQr(canvas: HTMLCanvasElement): string | null {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imgData.data, canvas.width, canvas.height);
    if (qr && qr.data) {
      return qr.data;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Decode using native BarcodeDetector API if supported (Chrome Android / modern browsers)
async function decodeWithBarcodeDetector(
  canvas: HTMLCanvasElement
): Promise<{ text: string; format: string } | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }
  try {
    const formats = [
      "qr_code",
      "ean_13",
      "ean_8",
      "upc_a",
      "upc_e",
      "code_128",
      "code_39",
      "code_93",
      "itf",
      "data_matrix",
      "aztec",
      "pdf417",
    ];
    const supported =
      (await (window as any).BarcodeDetector.getSupportedFormats?.()) || formats;
    const detector = new (window as any).BarcodeDetector({
      formats: formats.filter((f: string) => supported.includes(f)),
    });
    const barcodes = await detector.detect(canvas);
    if (barcodes.length > 0 && barcodes[0]?.rawValue) {
      return {
        text: barcodes[0].rawValue,
        format: barcodes[0].format || "barcode",
      };
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Rotate canvas by 90, 180, or 270 degrees (critical for vertical 1D barcodes)
function createRotatedCanvas(
  src: HTMLCanvasElement,
  degrees: 90 | 180 | 270
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const is90or270 = degrees === 90 || degrees === 270;
  canvas.width = is90or270 ? src.height : src.width;
  canvas.height = is90or270 ? src.width : src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return canvas;
}

// Crop center region (removes busy backgrounds and desk clutter)
function createCenterCropCanvas(
  src: HTMLCanvasElement,
  ratio = 0.7
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const cropW = Math.round(src.width * ratio);
  const cropH = Math.round(src.height * ratio);
  const startX = Math.round((src.width - cropW) / 2);
  const startY = Math.round((src.height - cropH) / 2);
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas;
}

// Contrast enhancement for low contrast or uneven lighting
function createContrastEnhancedCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, src.width, src.height);
  const d = imgData.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const gray = (r * 299 + g * 587 + b * 114) / 1000;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const range = max - min || 1;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const gray = (r * 299 + g * 587 + b * 114) / 1000;
    const normalized = Math.min(255, Math.max(0, ((gray - min) * 255) / range));
    d[i] = normalized;
    d[i + 1] = normalized;
    d[i + 2] = normalized;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Multi-stage decoding pipeline for uploaded or snapped photos
async function decodeImageFile(
  file: File,
  reader: MultiFormatReader,
  onStep?: (msg: string) => void
): Promise<{ code: string; format: string } | null> {
  onStep?.("Loading photo…");
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    image.src = url;
  });

  onStep?.("Analyzing resolution…");
  // Keep dimensions crisp up to 1600px without lossy JPEG compression
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const maxDim = 1600;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
  if (!baseCtx) throw new Error("Could not initialize image canvas");
  baseCtx.imageSmoothingEnabled = false;
  baseCtx.drawImage(img, 0, 0, width, height);

  // 1. Hardware-accelerated BarcodeDetector
  onStep?.("Checking barcode formats…");
  const nativeRes = await decodeWithBarcodeDetector(baseCanvas);
  if (nativeRes) {
    return { code: nativeRes.text, format: nativeRes.format };
  }

  // 2. High-speed jsQR check
  onStep?.("Checking QR code…");
  const qrBase = decodeCanvasWithJsQr(baseCanvas);
  if (qrBase) {
    return { code: qrBase, format: "QR_CODE" };
  }

  // 3. ZXing full frame (0 degrees)
  onStep?.("Scanning barcode patterns…");
  const zxing0 = decodeCanvasWithZxing(reader, baseCanvas);
  if (zxing0) {
    return { code: zxing0.text, format: zxing0.format };
  }

  // 4. Rotated 90 degrees (essential for vertical barcodes in photos!)
  onStep?.("Checking vertical orientation…");
  const rot90 = createRotatedCanvas(baseCanvas, 90);
  const nativeRot = await decodeWithBarcodeDetector(rot90);
  if (nativeRot) {
    return { code: nativeRot.text, format: nativeRot.format };
  }
  const zxing90 = decodeCanvasWithZxing(reader, rot90);
  if (zxing90) {
    return { code: zxing90.text, format: zxing90.format };
  }

  // 5. Center crop 70% (avoids background noise)
  onStep?.("Focusing center area…");
  const crop = createCenterCropCanvas(baseCanvas, 0.7);
  const qrCrop = decodeCanvasWithJsQr(crop);
  if (qrCrop) {
    return { code: qrCrop, format: "QR_CODE" };
  }
  const zxingCrop = decodeCanvasWithZxing(reader, crop);
  if (zxingCrop) {
    return { code: zxingCrop.text, format: zxingCrop.format };
  }
  const cropRot90 = createRotatedCanvas(crop, 90);
  const zxingCrop90 = decodeCanvasWithZxing(reader, cropRot90);
  if (zxingCrop90) {
    return { code: zxingCrop90.text, format: zxingCrop90.format };
  }

  // 6. Rotated 270 degrees
  const rot270 = createRotatedCanvas(baseCanvas, 270);
  const zxing270 = decodeCanvasWithZxing(reader, rot270);
  if (zxing270) {
    return { code: zxing270.text, format: zxing270.format };
  }

  // 7. Contrast-enhanced pass
  onStep?.("Enhancing barcode lines…");
  const enhanced = createContrastEnhancedCanvas(baseCanvas);
  const zxingEnh0 = decodeCanvasWithZxing(reader, enhanced);
  if (zxingEnh0) {
    return { code: zxingEnh0.text, format: zxingEnh0.format };
  }
  const enhRot90 = createRotatedCanvas(enhanced, 90);
  const zxingEnh90 = decodeCanvasWithZxing(reader, enhRot90);
  if (zxingEnh90) {
    return { code: zxingEnh90.text, format: zxingEnh90.format };
  }

  return null;
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
  const [processingStep, setProcessingStep] = React.useState<string>("Processing photo…");
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string | undefined>(undefined);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const zxingReaderRef = React.useRef<MultiFormatReader | null>(null);
  const offscreenCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecure(
        window.isSecureContext ??
          (window.location.protocol === "https:" || window.location.hostname === "localhost")
      );
    }
  }, []);

  // Initialize ZXing MultiFormatReader
  const getZxingReader = () => {
    if (!zxingReaderRef.current) {
      zxingReaderRef.current = createConfiguredReader();
    }
    return zxingReaderRef.current;
  };

  const stopCamera = React.useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // Ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const handleCodeScanned = React.useCallback(
    async (code: string, format?: string) => {
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
    },
    [sessionId, stopCamera]
  );

  // Start real live camera feed via standard WebRTC getUserMedia
  const startLiveCamera = async (overrideDeviceId?: string) => {
    setCameraError(null);
    setCameraStarting(true);
    stopCamera();

    const reader = getZxingReader();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Live camera is not supported over HTTP on mobile. Tap 'Snap Photo' below to scan!");
      }

      // Resilient camera constraints: try rear camera first, fallback to generic video
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: overrideDeviceId
            ? { deviceId: { exact: overrideDeviceId } }
            : { facingMode: { ideal: "environment" } },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e1) {
        // Fallback to simple video: true
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      mediaStreamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element unavailable");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      // Wait for video metadata to be loaded and play
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          return resolve();
        }
        video.onloadedmetadata = () => resolve();
      });

      await video.play();

      setCameraActive(true);
      setCameraStarting(false);

      // Discover video devices now that permission is active
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const vInputs = allDevices.filter((d) => d.kind === "videoinput");
        setVideoDevices(vInputs);
        if (overrideDeviceId) {
          setCurrentDeviceId(overrideDeviceId);
        }
      } catch (e) {
        // Ignore
      }

      // Initialize offscreen frame canvas
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const scanCanvas = offscreenCanvasRef.current;
      const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });
      if (!scanCtx) return;

      // Continuous 120ms frame decoding loop
      scanIntervalRef.current = setInterval(async () => {
        if (!video || video.readyState < 2 || video.paused || video.ended) {
          return;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;

        // Downscale frame for ultra-fast 10ms frame scanning
        const targetW = Math.min(vw, 720);
        const targetH = Math.round((vh * targetW) / vw);
        scanCanvas.width = targetW;
        scanCanvas.height = targetH;
        scanCtx.drawImage(video, 0, 0, targetW, targetH);

        // 1. Check jsQR (fastest for QR codes)
        const qrCode = decodeCanvasWithJsQr(scanCanvas);
        if (qrCode) {
          handleCodeScanned(qrCode, "QR_CODE");
          return;
        }

        // 2. Check native BarcodeDetector if available
        const nativeRes = await decodeWithBarcodeDetector(scanCanvas);
        if (nativeRes) {
          handleCodeScanned(nativeRes.text, nativeRes.format);
          return;
        }

        // 3. Check ZXing MultiFormatReader
        const zxingRes = decodeCanvasWithZxing(reader, scanCanvas);
        if (zxingRes) {
          handleCodeScanned(zxingRes.text, zxingRes.format);
          return;
        }
      }, 120);
    } catch (err: any) {
      stopCamera();
      setCameraStarting(false);
      const isHttp = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        if (isHttp) {
          setCameraError(
            "Mobile Chrome security blocks live streaming on unencrypted HTTP connections without asking. Tap '📸 Snap Photo' below to use the camera directly with zero permission hassle!"
          );
        } else {
          setCameraError(
            "Camera permission was denied. In Chrome: tap the 🔒/Tune icon in the address bar → Site Settings / Permissions → Camera → Allow, then tap Retry."
          );
        }
      } else {
        setCameraError(err.message || "Could not start live camera. Tap 'Snap Photo' below instead.");
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

  // Handle Photo Snap or Gallery File Selection
  const handlePhotoSelected = async (file: File) => {
    setProcessingPhoto(true);
    setProcessingStep("Reading photo…");

    try {
      const reader = getZxingReader();
      const result = await decodeImageFile(file, reader, (step) => setProcessingStep(step));

      if (result && result.code) {
        handleCodeScanned(result.code, result.format);
      } else {
        alert(
          "No clear barcode or QR detected in that photo. Please take a closer photo with good lighting, or enter the code manually below."
        );
      }
    } catch (err: any) {
      alert("Could not process photo: " + (err.message || "Unknown error"));
    } finally {
      setProcessingPhoto(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
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
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none">
      {/* Native Camera input (direct snap) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoSelected(file);
        }}
        className="hidden"
      />

      {/* Gallery / File picker input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoSelected(file);
        }}
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
            Live video stream requires HTTPS. Tap <strong>&quot;📸 Snap Photo to Scan&quot;</strong> below to use your native phone camera instantly with zero permission hassle!
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

            <h2 className="text-xl font-bold text-white mb-1">Verified &amp; Synced!</h2>
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
            {/* Viewfinder Frame (Always keeps <video> in DOM without display: none) */}
            <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-[#ea580c]/60 shadow-2xl flex items-center justify-center">
              {/* Live WebRTC Video Element */}
              <video
                ref={videoRef}
                playsInline
                webkit-playsinline="true"
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              />

              {cameraActive ? (
                /* Active Viewfinder Overlays */
                <>
                  <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl z-10">
                    <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-[#ea580c] rounded-tl" />
                    <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-[#ea580c] rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-[#ea580c] rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-[#ea580c] rounded-br" />
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ea580c] to-transparent shadow-[0_0_8px_#ea580c] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                    {videoDevices.length > 1 ? (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="rounded-lg bg-black/70 p-2 text-white hover:bg-black backdrop-blur"
                        title="Switch Camera"
                      >
                        <SwitchCamera className="size-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-lg bg-black/70 px-2.5 py-1.5 text-xs text-white hover:bg-black backdrop-blur flex items-center gap-1 font-medium"
                    >
                      <X className="size-3.5" />
                      <span>Stop</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Inactive / Backdrop Card */
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-10">
                  {cameraStarting ? (
                    <>
                      <Loader2 className="size-10 text-[#ea580c] animate-spin mb-3" />
                      <p className="text-xs text-white/90 font-semibold">Connecting to camera feed…</p>
                      <p className="text-[11px] text-white/50 mt-1">Starting live video</p>
                    </>
                  ) : (
                    <>
                      <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-[#ea580c] mb-3 ring-4 ring-[#ea580c]/10">
                        <Camera className="size-7" />
                      </div>
                      <p className="text-xs text-white/90 font-medium mb-1">
                        Point camera at any barcode or QR passport
                      </p>
                      {cameraError ? (
                        <div className="mb-3 px-2">
                          <p className="text-[11px] text-rose-400 mb-2 leading-relaxed">
                            {cameraError}
                          </p>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs gap-1.5 font-bold py-2 px-3.5 rounded-xl shadow-md"
                          >
                            <Camera className="size-3.5" />
                            <span>📸 Snap Photo Instead</span>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-white/50 mb-3">
                            Real multi-format scanner engine
                          </p>
                          {!isSecure ? (
                            <div className="flex flex-col items-center gap-2">
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs gap-1.5 font-bold py-2 px-4 rounded-xl shadow-lg shadow-[#ea580c]/20"
                              >
                                <Camera className="size-4" />
                                <span>📸 Snap Photo with Camera</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => startLiveCamera()}
                                className="text-[10px] text-white/50 hover:text-white underline mt-0.5"
                              >
                                Try Live Camera Feed
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startLiveCamera()}
                              className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs gap-1.5 font-semibold py-2 px-4 rounded-xl shadow-lg shadow-[#ea580c]/20"
                            >
                              <Camera className="size-3.5" />
                              <span>Start Live Camera</span>
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Loading Overlay */}
              {syncing || processingPhoto ? (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                  <Loader2 className="size-9 text-[#ea580c] animate-spin mb-2" />
                  <p className="text-xs font-bold text-white tracking-wide">
                    {processingPhoto ? processingStep : "Syncing to Laptop…"}
                  </p>
                  <p className="text-[11px] text-white/60 mt-1">Real decoding in progress</p>
                </div>
              ) : null}
            </div>

            {/* Quick Capture Options */}
            <div className="w-full max-w-[320px] mt-3.5 space-y-2">
              {/* Option 1: Native Camera Snap */}
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={processingPhoto || syncing}
                className="w-full bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/40 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Camera className="size-4 text-[#ea580c]" />
                <span>📸 Snap Photo with Camera (Ultra-Fast)</span>
              </Button>

              {/* Option 2: Pick from Photo Album / Files */}
              <Button
                type="button"
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                disabled={processingPhoto || syncing}
                className="w-full bg-white/10 hover:bg-white/15 border-white/20 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <ImageIcon className="size-3.5 text-white/70" />
                <span>📁 Choose from Gallery / Album</span>
              </Button>
            </div>

            <p className="mt-2.5 text-[11px] text-white/60 text-center flex items-center gap-1.5">
              <Sparkles className="size-3 text-[#ea580c]" />
              Real Multi-Format Engine &bull; QR, EAN-13, UPC, Code 128, Code 39
            </p>

            {/* Manual Code Input Option */}
            <form
              onSubmit={handleManualSubmit}
              className="w-full max-w-[320px] mt-4 pt-3 border-t border-white/10"
            >
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-wider">
                Or Enter / Paste Code Manually
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
        FixGrid Real Barcode &amp; Passport Scanner &bull; Multi-Format Engine
      </footer>
    </div>
  );
}
