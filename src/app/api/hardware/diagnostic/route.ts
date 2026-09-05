import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// In-memory telemetry cache for live demonstration / fast relay
interface DiagnosticTelemetry {
  booking_id: string;
  measured_resistance: number;
  status: "SHORT_CIRCUIT_DETECTED" | "VERIFIED_PASS" | "LOW_IMPEDANCE";
  device_id: string;
  voltage_drop?: number;
  timestamp: string;
  hardware_hash: string;
  photo_evidence_url?: string;
}

let latestTelemetry: DiagnosticTelemetry | null = {
  booking_id: "BK-1001",
  measured_resistance: 0.04,
  status: "SHORT_CIRCUIT_DETECTED",
  device_id: "SAFEPROBE-01",
  voltage_drop: 0.38,
  timestamp: new Date().toISOString(),
  hardware_hash: "HW-STAMP-DEMO-INIT",
  photo_evidence_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
};

/**
 * POST /api/hardware/diagnostic
 * Receives live diagnostic telemetry from the ESP32 FixGrid SafeProbe.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, measured_resistance, status, device_id, voltage_drop, photo_evidence_url } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: "booking_id is required." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const hardware_hash = `HW-SEAL-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const qr_seal_code = `FG-QR-${booking_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const qr_verification_url = `https://fixgrid.in/verify/${booking_id}?seal=${qr_seal_code}`;

    latestTelemetry = {
      booking_id: String(booking_id),
      measured_resistance: Number(measured_resistance) || 0,
      status: status || "VERIFIED_PASS",
      device_id: device_id || "SAFEPROBE-DEFAULT",
      voltage_drop: voltage_drop ? Number(voltage_drop) : undefined,
      timestamp,
      hardware_hash,
      photo_evidence_url: photo_evidence_url || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
    };

    console.log(`[SafeProbe API] Telemetry saved for ${booking_id}:`, latestTelemetry);

    return NextResponse.json({
      ok: true,
      message: "Telemetry registered successfully.",
      data: latestTelemetry,
      qr: {
        seal_code: qr_seal_code,
        verification_url: qr_verification_url,
        instruction: "Print or affix physical micro-QR seal on repaired device chassis."
      }
    });
  } catch (error) {
    console.error("[api/hardware/diagnostic] Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid JSON payload or server error." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hardware/diagnostic
 * Retrieves the latest hardware diagnostic telemetry for live UI polling.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    latest: latestTelemetry
  });
}
