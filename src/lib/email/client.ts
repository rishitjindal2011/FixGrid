import "server-only";

import { Resend } from "resend";

import { getEmailConfig } from "@/lib/email/config";

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

  const { data, error } = await client.emails.send({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: config.replyTo,
    ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
  });

  if (error) {
    console.error("[email] send failed", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}
