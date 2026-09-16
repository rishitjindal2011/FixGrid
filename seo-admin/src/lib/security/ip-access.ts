import { NextResponse, type NextRequest } from "next/server";
import ipAccessConfig from "@/config/ip-access.json";

export interface IpRuleConfig {
  description?: string;
  enabled?: boolean;
  allowedIps: string[];
}

export type IpAccessRules = Record<string, string[] | IpRuleConfig>;

/**
 * Extract client IP from incoming request headers.
 * Handles Vercel edge, Cloudflare, standard proxies, and direct connections.
 */
export function getClientIp(req: NextRequest): string {
  // 1. Vercel Edge specific header (contains real connecting client IP)
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const firstIp = vercelForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 2. Standard X-Forwarded-For proxy header (client is first IP in list)
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 3. Cloudflare Connecting IP
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  // 4. X-Real-IP
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  // 5. True-Client-IP (Akamai / Cloudflare Enterprise)
  const trueClientIp = req.headers.get("true-client-ip");
  if (trueClientIp) return trueClientIp.trim();

  return (req as unknown as { ip?: string }).ip || "127.0.0.1";
}

/**
 * Extract normalized hostname without port.
 */
export function getDomain(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.hostname ||
    "";

  return host.split(":")[0]?.toLowerCase().trim() || "";
}

/**
 * Convert IPv4 to a 32-bit unsigned integer for CIDR mask calculation.
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let res = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    res = (res << 8) + num;
  }
  return res >>> 0;
}

/**
 * Check if an IP matches an allowed entry (exact match, localhost, wildcard, or CIDR).
 */
export function isIpAllowed(clientIp: string, allowedEntry: string): boolean {
  const entry = allowedEntry.trim().toLowerCase();
  const normalizedClientIp = clientIp.trim().toLowerCase();

  // Wildcard allows everyone
  if (entry === "*") return true;

  // Exact match (covers IPv4 and IPv6 like 127.0.0.1, 223.233.78.49, or 2409:...)
  if (normalizedClientIp === entry) return true;

  // Localhost aliases
  if (
    (normalizedClientIp === "::1" || normalizedClientIp === "127.0.0.1") &&
    (entry === "127.0.0.1" || entry === "::1" || entry === "localhost")
  ) {
    return true;
  }

  // CIDR match for IPv4 (e.g. 192.168.1.0/24 or 223.233.78.0/24)
  if (entry.includes("/")) {
    const [range, bitsStr] = entry.split("/");
    if (!range || !bitsStr) return false;

    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const clientInt = ipv4ToInt(normalizedClientIp);
    const rangeInt = ipv4ToInt(range);

    if (clientInt === null || rangeInt === null) return false;

    const mask = bits === 0 ? 0 : (~(2 ** (32 - bits) - 1)) >>> 0;
    return (clientInt & mask) === (rangeInt & mask);
  }

  return false;
}

/**
 * Find matching rule for domain, with fallback for subdomains / vercel previews.
 */
function findRuleForDomain(domain: string, rules: IpAccessRules): IpRuleConfig | string[] | null {
  if (rules[domain]) return rules[domain];

  const cleanDomain = domain.replace(/^www\./, "");
  if (rules[cleanDomain]) return rules[cleanDomain];

  // Check wildcards like *.vytron.me or *.vercel.app
  for (const [pattern, rule] of Object.entries(rules)) {
    if (pattern.startsWith("*.") && cleanDomain.endsWith(pattern.slice(1))) {
      return rule;
    }
  }

  // In the seo-admin app, if accessed via seo.vytron.me or vercel preview, apply seo.vytron.me rule
  if (domain.includes("seo") || domain.endsWith(".vercel.app")) {
    if (rules["seo.vytron.me"]) {
      return rules["seo.vytron.me"];
    }
  }

  return null;
}

/**
 * Evaluates whether the request is authorized by the IP access config.
 * Returns null if allowed.
 * Returns a 403 Forbidden NextResponse if access is denied.
 */
export function enforceIpAccess(req: NextRequest): NextResponse | null {
  if (!ipAccessConfig || ipAccessConfig.enabled === false) {
    return null;
  }

  const domain = getDomain(req);
  const rules = (ipAccessConfig.rules || {}) as IpAccessRules;

  // Check if this domain is registered in the IP access rules
  const rule = findRuleForDomain(domain, rules);
  if (!rule) {
    // Domain not restricted -> allow open access
    return null;
  }

  let allowedIps: string[] = [];
  if (Array.isArray(rule)) {
    allowedIps = [...rule];
  } else if (typeof rule === "object") {
    if (rule.enabled === false) {
      return null;
    }
    allowedIps = [...(rule.allowedIps || [])];
  }

  // Also support environment variable overrides (e.g. ALLOWED_IPS in Vercel Dashboard)
  const envAllowedIps = process.env.ALLOWED_IPS || process.env.ALLOWED_ADMIN_IPS;
  if (envAllowedIps) {
    const extraIps = envAllowedIps.split(",").map((s) => s.trim()).filter(Boolean);
    allowedIps.push(...extraIps);
  }

  // If no IPs configured or wildcard is present, allow
  if (allowedIps.length === 0 || allowedIps.includes("*")) {
    return null;
  }

  const clientIp = getClientIp(req);
  const hasAccess = allowedIps.some((allowed) => isIpAllowed(clientIp, allowed));

  if (hasAccess) {
    return null;
  }

  // Access Denied — 403 Forbidden
  console.warn(`[security] Blocked unauthorized IP ${clientIp} accessing restricted domain ${domain}`);

  const isApiRequest =
    req.nextUrl.pathname.startsWith("/api/") ||
    req.headers.get("accept")?.includes("application/json");

  if (isApiRequest) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: `Access to ${domain} is restricted to authorized IP addresses.`,
        clientIp,
      },
      { status: 403 }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>403 Forbidden - Access Restricted</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #181c27;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 0.925rem;
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }
    .meta {
      background: #0b0d13;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      font-family: ui-monospace, monospace;
      font-size: 0.825rem;
      color: #cbd5e1;
      border: 1px solid #1e293b;
    }
    .meta div {
      margin-bottom: 0.35rem;
    }
    .meta div:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">403 Forbidden</div>
    <h1>Access Restricted</h1>
    <p>This portal is protected by strict IP whitelisting. Your current IP address is not authorized to access this resource.</p>
    <div class="meta">
      <div><span class="label">Domain:</span> ${escapeHtml(domain)}</div>
      <div><span class="label">Detected Client IP:</span> ${escapeHtml(clientIp)}</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
