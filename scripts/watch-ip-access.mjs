import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const syncScript = path.join(__dirname, "sync-ip-access.mjs");

const envFiles = [
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
];

console.log("[ip-watch] Watching .env and .env.local for changes...");

// Initial sync
try {
  execSync(`node "${syncScript}"`, { stdio: "inherit" });
} catch (e) {
  console.error("[ip-watch] Error during initial sync:", e);
}

let timeout = null;
function triggerSync(filename) {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log(`\n[ip-watch] Detected change in ${filename}, synchronizing...`);
    try {
      execSync(`node "${syncScript}"`, { stdio: "inherit" });
    } catch (e) {
      console.error("[ip-watch] Sync error:", e);
    }
  }, 200);
}

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    fs.watch(file, () => triggerSync(path.basename(file)));
  }
}

// Also watch directory in case .env is created later
fs.watch(rootDir, (eventType, filename) => {
  if (filename === ".env" || filename === ".env.local") {
    triggerSync(filename);
  }
});
