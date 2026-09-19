/**
 * FixGrid Laptop-to-Phone Scanner Bridge Store
 *
 * Persistent store across all Next.js worker threads and server reloads.
 * Uses both an in-memory Map and a cross-process JSON file in os.tmpdir().
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface ScanBridgeSession {
  id: string;
  status: "waiting" | "scanned" | "expired";
  code: string | null;
  format?: string | null;
  purpose?: string;
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
    // Non-fatal
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
    // Non-fatal
  }
}

// In-memory cache synced with persistent file
const globalStore = globalThis as unknown as {
  __fixgridScanBridge?: Map<string, ScanBridgeSession>;
};

if (!globalStore.__fixgridScanBridge) {
  globalStore.__fixgridScanBridge = readFromFile();
}

function getStore(): Map<string, ScanBridgeSession> {
  const fileStore = readFromFile();
  // Merge fileStore with memory cache
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

function persistStore(store: Map<string, ScanBridgeSession>) {
  globalStore.__fixgridScanBridge = store;
  writeToFile(store);
}

function cleanupExpired(store: Map<string, ScanBridgeSession>) {
  const now = Date.now();
  let changed = false;
  for (const [id, session] of store.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      store.delete(id);
      changed = true;
    }
  }
  if (changed) {
    persistStore(store);
  }
}

export function createScanSession(purpose?: string): ScanBridgeSession {
  const store = getStore();
  cleanupExpired(store);

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
  persistStore(store);
  return session;
}

export function getScanSession(id: string): ScanBridgeSession | null {
  const store = getStore();
  const session = store.get(id);
  if (!session) return null;

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    store.delete(id);
    persistStore(store);
    return null;
  }

  return session;
}

/**
 * Submits a code from phone scanner.
 * IMPORTANT: If the session does not exist in store, auto-creates it so
 * phone submissions NEVER fail due to worker thread or restart boundaries!
 */
export function submitScannedCode(id: string, code: string, format?: string): boolean {
  const store = getStore();
  let session = store.get(id);

  if (!session) {
    // Auto-revive / create session
    session = {
      id,
      status: "scanned",
      code: code.trim(),
      format: format || "auto",
      purpose: "general",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else {
    session.status = "scanned";
    session.code = code.trim();
    session.format = format || "auto";
    session.updatedAt = Date.now();
  }

  store.set(id, session);
  persistStore(store);
  return true;
}

export function resetScanSession(id: string): boolean {
  const store = getStore();
  let session = store.get(id);

  if (!session) {
    session = {
      id,
      status: "waiting",
      code: null,
      format: null,
      purpose: "general",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else {
    session.status = "waiting";
    session.code = null;
    session.format = null;
    session.updatedAt = Date.now();
  }

  store.set(id, session);
  persistStore(store);
  return true;
}
