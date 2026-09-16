import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourceConfig = path.join(rootDir, "ip-access.config.json");

if (!fs.existsSync(sourceConfig)) {
  console.error(`[ip-sync] Source config not found: ${sourceConfig}`);
  process.exit(1);
}

const content = fs.readFileSync(sourceConfig, "utf-8");

const targets = [
  path.join(rootDir, "src", "config", "ip-access.json"),
  path.join(rootDir, "admin", "ip-access.config.json"),
  path.join(rootDir, "admin", "src", "config", "ip-access.json"),
  path.join(rootDir, "seo-admin", "ip-access.config.json"),
  path.join(rootDir, "seo-admin", "src", "config", "ip-access.json"),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf-8");
  console.log(`[ip-sync] Synced -> ${path.relative(rootDir, target)}`);
}

console.log("[ip-sync] All IP access configurations are synchronized.");
