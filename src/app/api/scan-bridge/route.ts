import { NextResponse } from "next/server";
import os from "os";
import {
  createScanSession,
  getScanSession,
  submitScannedCode,
  resetScanSession,
  validateScannedCode,
} from "@/lib/scan-bridge/store";

export const dynamic = "force-dynamic";

function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return "localhost";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await getScanSession(sessionId);
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
      expectedCode: session.expectedCode,
      error: session.error,
      updatedAt: session.updatedAt,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, code, format, purpose, expectedCode } = body;

    if (action === "create") {
      const session = await createScanSession(purpose, expectedCode);
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        status: session.status,
        expectedCode: session.expectedCode,
        localIp: getLocalNetworkIp(),
      });
    }

    if (action === "submit") {
      if (!sessionId || !code) {
        return NextResponse.json(
          { error: "sessionId and code are required to submit a scan." },
          { status: 400 },
        );
      }

      // Validate code: detect if it is a genuine pass or false/mismatched code
      const validation = await validateScannedCode(sessionId, code);

      if (!validation.valid) {
        await submitScannedCode(sessionId, code, format, false, validation.error);
        return NextResponse.json({
          success: false,
          valid: false,
          error: validation.error || "Invalid or mismatched code.",
          code: validation.cleanCode,
        });
      }

      // Valid code
      await submitScannedCode(sessionId, validation.cleanCode, format, true);

      return NextResponse.json({
        success: true,
        valid: true,
        code: validation.cleanCode,
        message: "Code verified and synced to laptop successfully.",
      });
    }

    if (action === "reset") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
      }
      await resetScanSession(sessionId);
      return NextResponse.json({ success: true, status: "waiting" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 500 });
  }
}
