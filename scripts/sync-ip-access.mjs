import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const configPath = path.join(rootDir, "ip-access.config.json");

/**
 * Parse simple KEY=VALUE from .env or .env.local without requiring third-party libraries.
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2];
      // Strip surrounding quotes if present
      val = val.replace(/^["'](.*)["']$/, "$1").trim();
      env[key] = val;
    }
  }
  return env;
}

// 1. Read .env first, fallback/combine with .env.local
const env = {
  ...parseEnvFile(path.join(rootDir, ".env.local")),
  ...parseEnvFile(path.join(rootDir, ".env")),
};

// 2. Read existing config or start with template
let config = {
  $schema: "Configuration file to restrict domain access to specific IP addresses or secret access key",
  enabled: true,
  secretKey: "vytron-admin-secure-2026",
  rules: {},
};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.warn("[ip-sync] Warning: Could not parse existing ip-access.config.json, re-initializing.");
  }
}

// 3. Sync from .env if values are provided
const restrictedDomains = env.RESTRICTED_DOMAINS;
const allowedIps = env.ALLOWED_IPS;
const adminAccessKey = env.ADMIN_ACCESS_KEY || env.ACCESS_KEY;

if (adminAccessKey) {
  config.secretKey = adminAccessKey;
}

if (restrictedDomains) {
  const domainList = restrictedDomains
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const ipList = allowedIps
    ? allowedIps
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean)
    : ["223.233.78.49", "::1"];

  if (!ipList.includes("::1")) ipList.push("::1");

  config.rules = config.rules || {};

  // Update or add configured domains
  for (const domain of domainList) {
    config.rules[domain] = {
      description: `Restricted domain ${domain} — accessible by whitelist IPs or secret access key`,
      allowedIps: ipList,
      secretKey: config.secretKey,
    };
  }
} else if (allowedIps) {
  const ipList = allowedIps
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (!ipList.includes("::1")) ipList.push("::1");

  for (const domain of Object.keys(config.rules || {})) {
    const existingRule = config.rules[domain];
    if (typeof existingRule === "object" && !Array.isArray(existingRule)) {
      existingRule.allowedIps = ipList;
      if (config.secretKey) {
        existingRule.secretKey = config.secretKey;
      }
    }
  }
}

// 4. Write back to root ip-access.config.json
const updatedConfigJson = JSON.stringify(config, null, 2) + "\n";
fs.writeFileSync(configPath, updatedConfigJson, "utf-8");
console.log(`[ip-sync] Updated -> ${path.relative(rootDir, configPath)}`);

// 5. Synchronize to all subprojects
const targets = [
  path.join(rootDir, "src", "config", "ip-access.json"),
  path.join(rootDir, "admin", "ip-access.config.json"),
  path.join(rootDir, "admin", "src", "config", "ip-access.json"),
  path.join(rootDir, "seo-admin", "ip-access.config.json"),
  path.join(rootDir, "seo-admin", "src", "config", "ip-access.json"),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, updatedConfigJson, "utf-8");
  console.log(`[ip-sync] Synced  -> ${path.relative(rootDir, target)}`);
}

console.log("[ip-sync] All IP and domain access configurations are synchronized.");
