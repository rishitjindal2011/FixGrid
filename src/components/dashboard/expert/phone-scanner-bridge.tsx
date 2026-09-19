"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  Smartphone,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Laptop,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhoneScannerBridgeProps {
  purpose?: string;
  onCodeReceived: (code: string, format?: string) => void;
  className?: string;
}

export function PhoneScannerBridge({
  purpose = "general",
  onCodeReceived,
  className = "",
}: PhoneScannerBridgeProps) {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const pollRef = React.useRef<NodeJS.Timeout | null>(null);
  const receivedRef = React.useRef(false);

  // 1. Create a session on mount or reset
  const initSession = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setScannedCode(null);
    receivedRef.current = false;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    try {
      const res = await fetch("/api/scan-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", purpose }),
      });

      if (!res.ok) throw new Error("Could not initialize scan session.");

      const data = await res.json();
      const sid = data.sessionId;
      setSessionId(sid);

      let origin = typeof window !== "undefined" ? window.location.origin : "https://fixgrid.vytron.me";
      if (origin.includes("vytron.me") && origin.startsWith("http://")) {
        origin = origin.replace("http://", "https://");
      }
      const targetUrl = `${origin}/scan-bridge/${sid}`;
      setMobileUrl(targetUrl);

      const qr = await QRCode.toDataURL(targetUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrDataUrl(qr);

      // Start polling
      pollRef.current = setInterval(async () => {
        if (receivedRef.current) return;
        try {
          const pollRes = await fetch(`/api/scan-bridge?sessionId=${sid}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData?.session?.status === "scanned" && pollData?.session?.code) {
              receivedRef.current = true;
              if (pollRef.current) clearInterval(pollRef.current);
              setScannedCode(pollData.session.code);
              onCodeReceived(pollData.session.code, pollData.session.format);
            }
          }
        } catch (e) {
          // Polling glitch, retry next interval
        }
      }, 750);
    } catch (err: any) {
      setError(err.message || "Failed to create mobile scanner pairing.");
    } finally {
      setLoading(false);
    }
  }, [purpose, onCodeReceived]);

  React.useEffect(() => {
    initSession();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [initSession]);

  return (
    <div
      className={`rounded-2xl border border-hairline bg-bench/60 p-4 transition-all ${className}`}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="size-8 animate-spin text-[#ea580c] mb-2" />
          <p className="text-xs text-steel font-medium">Generating mobile scanner pairing QR…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-rose-500 mb-2">{error}</p>
          <Button size="sm" variant="outline" onClick={initSession}>
            Try Again
          </Button>
        </div>
      ) : scannedCode ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2 ring-4 ring-emerald-500/10">
            <CheckCircle2 className="size-6" />
          </div>
          <h4 className="text-sm font-bold text-enamel mb-0.5">Code Received from Phone!</h4>
          <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 break-all">
            {scannedCode}
          </p>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={initSession}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="size-3" />
              <span>Scan Another Code</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* QR Code Container */}
          <div className="relative shrink-0 rounded-xl bg-white p-2.5 shadow-sm border border-hairline">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Scan with Phone"
                className="size-36 rounded object-contain sm:size-40"
              />
            ) : null}
            <div className="absolute inset-x-0 -bottom-2 flex justify-center">
              <span className="rounded-full bg-[#ea580c] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Smartphone className="size-2.5" />
                Scan with Phone
              </span>
            </div>
          </div>

          {/* Guidance and Live Sync Indicator */}
          <div className="flex flex-col justify-between self-stretch text-left pt-1">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ea580c] mb-1 uppercase tracking-wider">
                <Smartphone className="size-4" />
                <span>Laptop &bull; Phone Sync Bridge</span>
              </div>
              <h4 className="text-sm font-semibold text-enamel leading-snug">
                Scan using your Smartphone Camera
              </h4>
              <p className="mt-1 text-xs text-steel leading-relaxed">
                Point your phone&apos;s camera at this QR code. It opens the FixGrid Mobile Scanner to scan any product barcode or customer pass and syncs directly back to this laptop in real-time!
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline/60 pt-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-steel-soft">
                  Waiting for phone scan…
                </span>
              </div>

              {mobileUrl ? (
                <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#ea580c] hover:underline"
                >
                  <span>Open link manually</span>
                  <ExternalLink className="size-2.5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
