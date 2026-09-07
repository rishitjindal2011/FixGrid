import "server-only";

import { Resend } from "resend";

import { getEmailConfig } from "@/lib/email/config";

import fs from "node:fs";
import path from "node:path";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    content?: string | Buffer;
    filename?: string;
    path?: string;
    cid?: string;
  }>;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

let resendClient: Resend | null = null;
let cachedLogoBuffer: Buffer | null = null;

function getLogoBuffer(): Buffer | null {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  try {
    const iconPath = path.join(process.cwd(), "public", "icon-48.png");
    if (fs.existsSync(iconPath)) {
      cachedLogoBuffer = fs.readFileSync(iconPath);
      return cachedLogoBuffer;
    }
  } catch (err) {
    console.warn("[email] failed to load logo attachment", err);
  }
  return null;
}

function getClient(): Resend | null {
  const config = getEmailConfig();
  if (!config) return null;
  resendClient ??= new Resend(config.apiKey);
  return resendClient;
}

/** Send one transactional email via Resend. No-ops when not configured. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getEmailConfig();
  const client = getClient();

  if (!config || !client) {
    console.warn("[email] RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping send.");
    return { ok: false, error: "Email not configured" };
  }

  const attachments = [...(input.attachments ?? [])];
  if (input.html.includes("cid:fixgrid-logo") && !attachments.some((a) => a.cid === "fixgrid-logo")) {
    const logoBuf = getLogoBuffer();
    if (logoBuf) {
      attachments.push({
        filename: "icon-48.png",
        content: logoBuf,
        cid: "fixgrid-logo",
      });
    }
  }

  const { data, error } = await client.emails.send({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: config.replyTo,
    ...(attachments.length > 0 ? { attachments } : {}),
  });

  if (error) {
    console.error("[email] send failed", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}
