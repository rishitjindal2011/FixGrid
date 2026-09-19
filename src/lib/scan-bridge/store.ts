/**
 * FixGrid Laptop-to-Phone Scanner Bridge Store
 *
 * Enables real-time pairing between a laptop browser and a mobile phone:
 * 1. Laptop opens a scan dialog and generates a session QR code.
 * 2. Shopkeeper points their phone at the QR code, opening /scan-bridge/[sessionId].
 * 3. Phone camera scans any barcode or QR code (or user types it).
 * 4. Phone posts the code to /api/scan-bridge.
 * 5. Laptop polls /api/scan-bridge?sessionId=... and receives the scanned code instantly.
 */

export interface ScanBridgeSession {
  id: string;
  status: "waiting" | "scanned" | "expired";
  code: string | null;
  format?: string | null;
  purpose?: string;
  createdAt: number;
  updatedAt: number;
}

// Persist in globalThis across Next.js dev hot-reloads & route handler invocations
const globalStore = globalThis as unknown as {
  __fixgridScanBridge?: Map<string, ScanBridgeSession>;
};

if (!globalStore.__fixgridScanBridge) {
  globalStore.__fixgridScanBridge = new Map<string, ScanBridgeSession>();
}

const store = globalStore.__fixgridScanBridge;

// 15-minute session expiration
const SESSION_TTL_MS = 15 * 60 * 1000;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of store.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}

export function createScanSession(purpose?: string): ScanBridgeSession {
  cleanupExpiredSessions();
  const id = `fx_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;
  const session: ScanBridgeSession = {
    id,
    status: "waiting",
    code: null,
    format: null,
    purpose: purpose || "general",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.set(id, session);
  return session;
}

export function getScanSession(id: string): ScanBridgeSession | null {
  cleanupExpiredSessions();
  const session = store.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    store.delete(id);
    return null;
  }
  return session;
}

export function submitScannedCode(id: string, code: string, format?: string): boolean {
  const session = getScanSession(id);
  if (!session) return false;
  session.status = "scanned";
  session.code = code.trim();
  session.format = format || "auto";
  session.updatedAt = Date.now();
  store.set(id, session);
  return true;
}

export function resetScanSession(id: string): boolean {
  const session = getScanSession(id);
  if (!session) return false;
  session.status = "waiting";
  session.code = null;
  session.format = null;
  session.updatedAt = Date.now();
  store.set(id, session);
  return true;
}
