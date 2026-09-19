/**
 * FixGrid Laptop-to-Phone Scanner Bridge Store
 *
 * Cloud-synchronized via Supabase with in-memory & file fallback.
 * Allows instant pairing and real-time barcode syncing between any laptop
 * and mobile phone regardless of network, domain, or IP boundaries.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ScanBridgeSession {
  id: string;
  status: "waiting" | "scanned" | "invalid" | "expired";
  code: string | null;
  format?: string | null;
  purpose?: string;
  expectedCode?: string | null;
  error?: string | null;
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_FILE = path.join(os.tmpdir(), "fixgrid-scan-bridge-sessions.json");
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours TTL

function readFromFile(): Map<string, ScanBridgeSession> {
  const map = new Map<string, ScanBridgeSession>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, "utf8");
      if (content.trim()) {
        const parsed = JSON.parse(content);
        for (const key of Object.keys(parsed)) {
          map.set(key, parsed[key]);
        }
      }
    }
  } catch (e) {
    // Non-fatal fallback
  }
  return map;
}

function writeToFile(map: Map<string, ScanBridgeSession>) {
  try {
    const obj: Record<string, ScanBridgeSession> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), "utf8");
  } catch (e) {
    // Non-fatal fallback
  }
}

// In-memory cache synced with persistent file
const globalStore = globalThis as unknown as {
  __fixgridScanBridge?: Map<string, ScanBridgeSession>;
};

if (!globalStore.__fixgridScanBridge) {
  globalStore.__fixgridScanBridge = readFromFile();
}

function getLocalStore(): Map<string, ScanBridgeSession> {
  const fileStore = readFromFile();
  if (globalStore.__fixgridScanBridge) {
    for (const [k, v] of globalStore.__fixgridScanBridge.entries()) {
      if (!fileStore.has(k) || (v.updatedAt > (fileStore.get(k)?.updatedAt || 0))) {
        fileStore.set(k, v);
      }
    }
  }
  globalStore.__fixgridScanBridge = fileStore;
  return fileStore;
}

function persistLocalStore(store: Map<string, ScanBridgeSession>) {
  globalStore.__fixgridScanBridge = store;
  writeToFile(store);
}

export async function createScanSession(
  purpose?: string,
  expectedCode?: string
): Promise<ScanBridgeSession> {
  const id = `fx_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;
  const now = Date.now();
  const session: ScanBridgeSession = {
    id,
    status: "waiting",
    code: null,
    format: null,
    purpose: purpose || "general",
    expectedCode: expectedCode || null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Write to local store
  const local = getLocalStore();
  local.set(id, session);
  persistLocalStore(local);

  // 2. Write to Supabase database (Global Cloud Source of Truth)
  try {
    const supabase = createAdminClient() as any;
    await supabase.from("scan_bridge_sessions").upsert({
      id,
      status: "waiting",
      code: null,
      format: null,
      purpose: purpose || "general",
      expected_code: expectedCode || null,
      error: null,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    });
  } catch (e) {
    console.warn("[scan-bridge/store] Supabase upsert error (using local store):", e);
  }

  return session;
}

export async function getScanSession(id: string): Promise<ScanBridgeSession | null> {
  // 1. Check Supabase first for real-time global sync
  try {
    const supabase = createAdminClient() as any;
    const { data, error } = await supabase
      .from("scan_bridge_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      const dbSession: ScanBridgeSession = {
        id: data.id,
        status: data.status as "waiting" | "scanned" | "invalid" | "expired",
        code: data.code,
        format: data.format,
        purpose: data.purpose,
        expectedCode: data.expected_code || null,
        error: data.error || null,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };

      // Sync local cache
      const local = getLocalStore();
      local.set(id, dbSession);
      persistLocalStore(local);

      return dbSession;
    }
  } catch (e) {
    // Fall back to local store on network error
  }

  // 2. Fallback to local memory/file store
  const local = getLocalStore();
  const session = local.get(id);
  if (!session) return null;

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    local.delete(id);
    persistLocalStore(local);
    return null;
  }

  return session;
}

/**
 * Extracts normalized reference from a scanned QR string or passport URL.
 */
export function extractCleanReference(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/\/passport\/([A-Za-z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1].toUpperCase();
  const refMatch = trimmed.match(/FIX-[A-Z0-9]+/i);
  if (refMatch && refMatch[0]) return refMatch[0].toUpperCase();
  return trimmed.toUpperCase();
}

/**
 * Server-side code validator for phone scanner.
 * Detects whether a scanned code is genuine or false.
 */
export async function validateScannedCode(
  sessionId: string,
  rawCode: string
): Promise<{ valid: boolean; cleanCode: string; error?: string }> {
  const session = await getScanSession(sessionId);
  const cleanCode = extractCleanReference(rawCode);

  if (!cleanCode) {
    return { valid: false, cleanCode: "", error: "No readable barcode or QR code detected." };
  }

  // 1. Session has an explicit expected reference (e.g. QrStartWorkDialog for a specific booking)
  if (session?.expectedCode) {
    const expected = extractCleanReference(session.expectedCode);
    const matches =
      cleanCode === expected ||
      rawCode.toUpperCase().includes(expected) ||
      expected.includes(cleanCode);

    if (!matches) {
      return {
        valid: false,
        cleanCode,
        error: `Code mismatch! Expected booking pass "${expected}", but scanned "${cleanCode}". This is not the correct customer QR pass.`,
      };
    }
    return { valid: true, cleanCode: expected };
  }

  // 2. Booking / Warranty verification purposes
  if (session?.purpose === "start_work" || session?.purpose === "warranty_proof") {
    if (!cleanCode.startsWith("FIX-") && !cleanCode.startsWith("BK-DEMO")) {
      return {
        valid: false,
        cleanCode,
        error: `Invalid pass format. Expected a FixGrid booking reference (e.g. FIX-XXXXXX), but scanned "${cleanCode}".`,
      };
    }

    try {
      const supabase = createAdminClient() as any;
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, reference, status")
        .eq("reference", cleanCode)
        .maybeSingle();

      if (!booking) {
        return {
          valid: false,
          cleanCode,
          error: `Unrecognized pass! No FixGrid booking found for reference "${cleanCode}".`,
        };
      }

      if (["declined", "cancelled_customer", "cancelled_shop", "expired", "no_show"].includes(booking.status)) {
        return {
          valid: false,
          cleanCode,
          error: `Booking "${cleanCode}" was ${booking.status.replace(/_/g, " ")}. Handover or warranty pass is not valid.`,
        };
      }
    } catch (e) {
      // Allow through if DB check has a temporary network hiccup
    }
  }

  return { valid: true, cleanCode };
}

export async function submitScannedCode(
  id: string,
  code: string,
  format?: string,
  isValid = true,
  errorMessage?: string
): Promise<boolean> {
  const trimmedCode = code.trim();
  const now = Date.now();
  const status = isValid ? "scanned" : "invalid";

  // 1. Update local store
  const local = getLocalStore();
  let session = local.get(id);
  if (!session) {
    session = {
      id,
      status,
      code: trimmedCode,
      format: format || "auto",
      purpose: "general",
      error: errorMessage || null,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    session.status = status;
    session.code = trimmedCode;
    session.format = format || "auto";
    session.error = errorMessage || null;
    session.updatedAt = now;
  }
  local.set(id, session);
  persistLocalStore(local);

  // 2. Update Supabase database
  try {
    const supabase = createAdminClient() as any;
    await supabase.from("scan_bridge_sessions").upsert({
      id,
      status,
      code: trimmedCode,
      format: format || "auto",
      error: errorMessage || null,
      updated_at: new Date(now).toISOString(),
    });
  } catch (e) {
    console.warn("[scan-bridge/store] Supabase submit error:", e);
  }

  return true;
}

export async function resetScanSession(id: string): Promise<boolean> {
  const now = Date.now();

  // 1. Update local store
  const local = getLocalStore();
  let session = local.get(id);
  if (!session) {
    session = {
      id,
      status: "waiting",
      code: null,
      format: null,
      purpose: "general",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    session.status = "waiting";
    session.code = null;
    session.format = null;
    session.error = null;
    session.updatedAt = now;
  }
  local.set(id, session);
  persistLocalStore(local);

  // 2. Update Supabase database
  try {
    const supabase = createAdminClient() as any;
    await supabase.from("scan_bridge_sessions").upsert({
      id,
      status: "waiting",
      code: null,
      format: null,
      error: null,
      updated_at: new Date(now).toISOString(),
    });
  } catch (e) {
    console.warn("[scan-bridge/store] Supabase reset error:", e);
  }

  return true;
}
