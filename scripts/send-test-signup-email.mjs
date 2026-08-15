import fs from "node:fs";
import { Resend } from "resend";

const env = {};
for (const raw of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const to = process.argv[2] ?? "vytron.dev@gmail.com";
const apiKey = env.RESEND_API_KEY;
const from = env.RESEND_FROM_EMAIL ?? "FixGrid <bookings@vytron.me>";
const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "https://vytron.me";

if (!apiKey) {
  console.error("RESEND_API_KEY missing from .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);

const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:#0f0f10;font-family:system-ui,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;">
    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 8px;color:#f97316;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">FixGrid</p>
        <h1 style="margin:0 0 16px;color:#fafafa;font-size:24px;text-transform:uppercase;">Confirm your email</h1>
        <p style="margin:0 0 12px;color:#e4e4e7;font-size:15px;line-height:1.6;">Thanks for signing up. Tap the button below to confirm your address and finish creating your account.</p>
        <p style="margin:0 0 12px;color:#d4d4d8;font-size:15px;">This is a test signup email sent from your FixGrid + Resend setup.</p>
        <p style="margin:28px 0 0;">
          <a href="${siteUrl}/login" style="display:inline-block;background:#f97316;color:#111827;text-decoration:none;font-weight:700;font-size:14px;text-transform:uppercase;padding:14px 22px;border-radius:8px;">Confirm email</a>
        </p>
        <p style="margin:24px 0 0;color:#71717a;font-size:12px;">If you did not request this, you can ignore this message.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

const { data, error } = await resend.emails.send({
  from,
  to,
  replyTo: env.RESEND_REPLY_TO_EMAIL || undefined,
  subject: "Confirm your FixGrid account (test)",
  html,
  text: `Confirm your FixGrid account\n\nThis is a test signup email from your FixGrid + Resend setup.\n\nConfirm: ${siteUrl}/login`,
});

if (error) {
  console.error("Send failed:", error);
  process.exit(1);
}

console.log("Sent test signup email to", to, "— id:", data?.id);
