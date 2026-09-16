import { NextResponse, type NextRequest } from "next/server";
import ipAccessConfig from "@/config/ip-access.json";

export interface IpRuleConfig {
  description?: string;
  enabled?: boolean;
  allowedIps?: string[];
  secretKey?: string;
}

export type IpAccessRules = Record<string, string[] | IpRuleConfig>;

export interface IpAccessConfigFile {
  $schema?: string;
  enabled?: boolean;
  secretKey?: string;
  rules?: IpAccessRules;
}

const ACCESS_COOKIE_NAME = "vytron_access_token";

/**
 * Extract client IP from incoming request headers.
 * Handles Vercel edge, Cloudflare, standard proxies, and direct connections.
 */
export function getClientIp(req: NextRequest): string {
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const firstIp = vercelForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

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

  if (entry === "*") return true;

  if (normalizedClientIp === entry) return true;

  if (
    (normalizedClientIp === "::1" || normalizedClientIp === "127.0.0.1") &&
    (entry === "127.0.0.1" || entry === "::1" || entry === "localhost")
  ) {
    return true;
  }

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

  for (const [pattern, rule] of Object.entries(rules)) {
    if (pattern.startsWith("*.") && cleanDomain.endsWith(pattern.slice(1))) {
      return rule;
    }
  }

  if (domain.includes("admin") || domain.endsWith(".vercel.app")) {
    if (rules["admin.vytron.me"]) {
      return rules["admin.vytron.me"];
    }
  }

  return null;
}

/**
 * Evaluates whether the request is authorized by the IP access config or secret passkey.
 * Returns null if allowed.
 * Returns a redirect (if key param was passed) to set persistent cookie.
 * Returns a 403 Forbidden NextResponse if access is denied.
 */
export function enforceIpAccess(req: NextRequest): NextResponse | null {
  const config = ipAccessConfig as IpAccessConfigFile;
  if (!config || config.enabled === false) {
    return null;
  }

  const domain = getDomain(req);
  const rules = (config.rules || {}) as IpAccessRules;

  const rule = findRuleForDomain(domain, rules);
  if (!rule) {
    return null;
  }

  // 1. Check Secret Key (Passkey / API Key bypass)
  const ruleSecretKey = typeof rule === "object" && !Array.isArray(rule) ? rule.secretKey : undefined;
  const activeSecretKey =
    process.env.ADMIN_ACCESS_KEY ||
    process.env.ACCESS_KEY ||
    ruleSecretKey ||
    config.secretKey;

  const incomingParamKey = req.nextUrl.searchParams.get("key") || req.nextUrl.searchParams.get("access_key");
  const incomingCookieKey = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const incomingHeaderKey =
    req.headers.get("x-access-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const hasValidKey =
    Boolean(activeSecretKey) &&
    (incomingCookieKey === activeSecretKey ||
      incomingHeaderKey === activeSecretKey ||
      incomingParamKey === activeSecretKey);

  const isApiRequest =
    req.nextUrl.pathname.startsWith("/api/") ||
    req.headers.get("accept")?.includes("application/json");

  if (hasValidKey) {
    // If authenticated via query parameter on a standard navigation,
    // strip the key from the URL and set a long-lived trusted cookie (30 days).
    if (incomingParamKey && !isApiRequest) {
      const nextUrl = req.nextUrl.clone();
      nextUrl.searchParams.delete("key");
      nextUrl.searchParams.delete("access_key");

      const response = NextResponse.redirect(nextUrl);
      response.cookies.set(ACCESS_COOKIE_NAME, activeSecretKey!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return response;
    }

    return null; // Access granted
  }

  // 2. Check IP Whitelist
  let allowedIps: string[] = [];
  if (Array.isArray(rule)) {
    allowedIps = [...rule];
  } else if (typeof rule === "object") {
    if (rule.enabled === false) {
      return null;
    }
    allowedIps = [...(rule.allowedIps || [])];
  }

  const envAllowedIps = process.env.ALLOWED_IPS || process.env.ALLOWED_ADMIN_IPS;
  if (envAllowedIps) {
    const extraIps = envAllowedIps.split(",").map((s) => s.trim()).filter(Boolean);
    allowedIps.push(...extraIps);
  }

  if (allowedIps.includes("*")) {
    return null;
  }

  const clientIp = getClientIp(req);
  if (allowedIps.length > 0) {
    const hasIpAccess = allowedIps.some((allowed) => isIpAllowed(clientIp, allowed));
    if (hasIpAccess) {
      return null; // Access granted via IP
    }
  }

  // Access Denied — 403 Forbidden
  console.warn(`[security] Blocked unauthorized request from IP ${clientIp} to ${domain}`);

  if (isApiRequest) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: `Access to ${domain} is restricted. Use a whitelisted IP or provide x-access-key header.`,
        clientIp,
      },
      { status: 403 }
    );
  }

  const hasInvalidKeyAttempt = Boolean(incomingParamKey);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>403 Forbidden - Access Restricted</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 2.25rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }
    .meta {
      background: #080d1a;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
      border: 1px solid #1e293b;
      margin-bottom: 1.5rem;
    }
    .meta div {
      margin-bottom: 0.25rem;
    }
    .meta div:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #64748b;
    }
    .divider {
      position: relative;
      text-align: center;
      margin: 1.25rem 0;
    }
    .divider::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #1f2937;
    }
    .divider span {
      position: relative;
      background: #111827;
      padding: 0 0.75rem;
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .input-group {
      display: flex;
      gap: 0.5rem;
    }
    input[type="password"] {
      flex: 1;
      background: #080d1a;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: #f8fafc;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus {
      border-color: #3b82f6;
    }
    button {
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover {
      background: #1d4ed8;
    }
    .error-msg {
      color: #f87171;
      font-size: 0.78rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">403 Forbidden</div>
    <h1>Access Restricted</h1>
    <p>This portal is protected. Your current IP address is not on the whitelist.</p>
    
    <div class="meta">
      <div><span class="label">Domain:</span> ${escapeHtml(domain)}</div>
      <div><span class="label">Detected IP:</span> ${escapeHtml(clientIp)}</div>
    </div>

    <div class="divider"><span>Or Unlock With Key</span></div>

    <form method="GET" action="">
      <div class="input-group">
        <input type="password" name="key" placeholder="Enter Secret Access Key..." required autofocus />
        <button type="submit">Unlock</button>
      </div>
      ${
        hasInvalidKeyAttempt
          ? `<div class="error-msg">Incorrect access key. Please try again.</div>`
          : ""
      }
    </form>
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
