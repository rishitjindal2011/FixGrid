import fs from "node:fs";
import { Resend } from "resend";
import { renderEmailTemplate, renderPlainText } from "@/lib/email/templates";
import { CANONICAL_ORIGIN } from "@/lib/site";

// Parse .env.local
const env: Record<string, string> = {};
if (fs.existsSync(".env.local")) {
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
}

const to = process.argv[2] ?? "vytron.dev@gmail.com";
const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
const from =
  process.env.RESEND_FROM_EMAIL ||
  env.RESEND_FROM_EMAIL ||
  "FixGrid <bookings@vytron.me>";
const siteUrl = CANONICAL_ORIGIN;

if (!apiKey) {
  console.error("RESEND_API_KEY missing from environment or .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);

const templateInput = {
  preheader: "Verify your FixGrid account to activate verified local repair protection.",
  title: "Welcome to FixGrid — Verify Your Account",
  badge: "ACCOUNT VERIFICATION",
  intro:
    "Welcome to the FixGrid Verified Repair Network! You are one step away from connecting with verified repair professionals, backed by platform-guaranteed 90-day warranties and secure escrow payments across all electronics and appliances.",
  bodyLines: [
    "To finish setting up your account and safeguard your repair transactions, please confirm your email address using the button below or enter your verification code.",
    "FixGrid operates under Mission LiFE to champion fair pricing, right-to-repair, and circular electronics longevity across India.",
  ],
  code: "842-195",
  highlightBox: {
    title: "Account & Coverage Details",
    items: [
      { label: "Account Email", value: to },
      { label: "Coverage", value: "Smartphones, Laptops, Gadgets & Home Appliances" },
      { label: "Protection", value: "90-Day Warranty & Smart Escrow Enabled" },
      { label: "Verification Status", value: "Action Required (One-Click Confirmation)" },
    ],
  },
  ctaLabel: "Verify & Activate Account",
  ctaUrl: `${siteUrl}/login?confirmed=true&email=${encodeURIComponent(to)}`,
  recipientEmail: to,
  unsubscribeUrl: `${siteUrl}/unsubscribe?email=${encodeURIComponent(to)}`,
  preferencesUrl: `${siteUrl}/dashboard/settings`,
  footer:
    "If you did not sign up for FixGrid or request this email, no action is needed. Your email will not be activated without this verification.",
};

async function main() {
  const html = renderEmailTemplate(templateInput);
  const text = renderPlainText(templateInput);

  console.log("Sending FixGrid branded test email to:", to);

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: process.env.RESEND_REPLY_TO_EMAIL || env.RESEND_REPLY_TO_EMAIL || "support@vytron.me",
    subject: "Confirm your FixGrid account — Verified Repair Network",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${templateInput.unsubscribeUrl}>`,
    },
  });

  if (error) {
    console.error("❌ Send failed:", error);
    process.exit(1);
  }

  console.log("✅ Successfully delivered branded FixGrid test email!");
  console.log("Email ID:", data?.id);
  console.log("Recipient:", to);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
