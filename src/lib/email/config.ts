import "server-only";

/** Resend configuration read from environment variables. */
export interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) return null;

  const replyTo = process.env.RESEND_REPLY_TO_EMAIL?.trim();
  return { apiKey, from, replyTo: replyTo || undefined };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}
