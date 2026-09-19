import type { Metadata } from "next";
import { MobileScannerClient } from "./mobile-scanner-client";

export const metadata: Metadata = {
  title: "FixGrid Mobile Scanner Bridge",
  description: "Scan product barcodes and warranty QR passes directly with your phone to sync with your laptop.",
};

export default async function ScanBridgePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MobileScannerClient sessionId={sessionId} />;
}
