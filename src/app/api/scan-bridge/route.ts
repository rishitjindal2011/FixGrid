import { NextResponse } from "next/server";
import {
  createScanSession,
  getScanSession,
  submitScannedCode,
  resetScanSession,
} from "@/lib/scan-bridge/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getScanSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session expired or not found", status: "expired" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      status: session.status,
      code: session.code,
      format: session.format,
      purpose: session.purpose,
      updatedAt: session.updatedAt,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, code, format, purpose } = body;

    if (action === "create") {
      const session = createScanSession(purpose);
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        status: session.status,
      });
    }

    if (action === "submit") {
      if (!sessionId || !code) {
        return NextResponse.json(
          { error: "sessionId and code are required to submit a scan." },
          { status: 400 },
        );
      }

      const ok = submitScannedCode(sessionId, code, format);
      if (!ok) {
        return NextResponse.json(
          { error: "Session expired or invalid. Please refresh the QR on laptop." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Code synced to laptop successfully.",
      });
    }

    if (action === "reset") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
      }
      resetScanSession(sessionId);
      return NextResponse.json({ success: true, status: "waiting" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 500 });
  }
}
