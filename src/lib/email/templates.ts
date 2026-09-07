import { CANONICAL_ORIGIN, SITE_NAME } from "@/lib/site";

export interface EmailTemplateInput {
  preheader: string;
  title: string;
  intro: string;
  badge?: string;
  bodyLines?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  code?: string;
  highlightBox?: {
    title: string;
    items: { label: string; value: string }[];
  };
  footer?: string;
  recipientEmail?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

/**
 * World-class, responsive, and legally compliant HTML wrapper for FixGrid transactional & notification emails.
 * Uses bulletproof HTML tables compatible with Gmail, Apple Mail, Outlook, and Yahoo.
 */
export function renderEmailTemplate(input: EmailTemplateInput): string {
  const badgeText = input.badge ?? "ACCOUNT SECURITY";
  const siteUrl = CANONICAL_ORIGIN;
  const recipient = input.recipientEmail ?? "your registered email address";
  const unsubscribeUrl = input.unsubscribeUrl ?? `${siteUrl}/dashboard/settings`;
  const preferencesUrl = input.preferencesUrl ?? `${siteUrl}/dashboard/settings`;

  const bodyParagraphs = (input.bodyLines ?? [])
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");

  const highlightHtml = input.highlightBox
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#172033;border:1px solid #2e3d59;border-radius:10px;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              ${escapeHtml(input.highlightBox.title)}
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${input.highlightBox.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;width:40%;">${escapeHtml(
                    item.label,
                  )}</td>
                  <td style="padding:4px 0;font-size:13px;font-weight:600;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(
                    item.value,
                  )}</td>
                </tr>
              `,
                )
                .join("")}
            </table>
          </td>
        </tr>
      </table>`
    : "";

  const codeHtml = input.code
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#172033;border:1px solid #2e3d59;border-radius:10px;text-align:center;">
        <tr>
          <td style="padding:20px 24px;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Your Verification Code</div>
            <div style="font-family:ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:0.25em;color:#38bdf8;">${escapeHtml(
              input.code,
            )}</div>
          </td>
        </tr>
      </table>`
    : "";

  const ctaButton =
    input.ctaLabel && input.ctaUrl
      ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background:linear-gradient(135deg, #0284c7 0%, #ea580c 100%);background-color:#ea580c;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(input.ctaUrl)}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="#ea580c">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(input.ctaLabel)} &nbsp;&rarr;</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${escapeHtml(input.ctaUrl)}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.06em;color:#ffffff;text-decoration:none;text-transform:uppercase;border-radius:8px;box-shadow:0 4px 14px rgba(234, 88, 12, 0.35);background:linear-gradient(135deg, #0284c7 0%, #ea580c 100%);background-color:#ea580c;">
              ${escapeHtml(input.ctaLabel)} &nbsp;&rarr;
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Button not working? Copy and paste this URL into your browser:<br />
        <a href="${escapeHtml(input.ctaUrl)}" style="color:#38bdf8;text-decoration:underline;word-break:break-all;">${escapeHtml(
          input.ctaUrl,
        )}</a>
      </p>`
      : "";

  const customFooter = input.footer
    ? `<div style="margin:24px 0 0;padding-top:16px;border-top:1px solid #1f293d;color:#94a3b8;font-size:13px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(
        input.footer,
      )}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .card-table { width: 100% !important; border-radius: 0 !important; }
      .card-content { padding: 24px 20px !important; }
      .card-header { padding: 24px 20px 16px !important; }
      .features-col { display: block !important; width: 100% !important; padding: 6px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Invisible Preheader for Inbox Preview -->
  <div style="display:none;font-size:1px;color:#090d16;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(input.preheader)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer Background Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#090d16;padding:40px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table role="presentation" class="card-table" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#111827;border:1px solid #1f293d;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.45);">
          
          <!-- Top Sunset Brand Gradient Accent Bar -->
          <tr>
            <td height="4" style="height:4px;line-height:4px;font-size:4px;background:linear-gradient(90deg, #0284c7 0%, #0f3d4c 35%, #ea580c 75%, #f97316 100%);background-color:#ea580c;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td class="card-header" style="padding:28px 36px 18px;border-bottom:1px solid #1f293d;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Left: Logo Lockup -->
                  <td align="left" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Icon Squircle -->
                        <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;background:linear-gradient(135deg, #0284c7 0%, #0f3d4c 45%, #c2410c 85%, #ea580c 100%);background-color:#ea580c;border-radius:10px;text-align:center;">
                          <!--[if mso]>
                          <span style="font-size:20px;line-height:20px;color:#ffffff;">&#128295;</span>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                          </svg>
                          <!--<![endif]-->
                        </td>
                        <!-- Text -->
                        <td style="padding-left:12px;" valign="middle">
                          <div style="font-family:'Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,sans-serif;font-size:19px;font-weight:800;letter-spacing:0.04em;color:#ffffff;line-height:1.1;">${escapeHtml(
                            SITE_NAME,
                          )}</div>
                          <div style="font-family:'Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.08em;color:#38bdf8;text-transform:uppercase;margin-top:2px;">Verified Repair Network</div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Category Badge Pill -->
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:5px 12px;border-radius:16px;background-color:#172033;border:1px solid #0284c7;color:#38bdf8;font-size:9.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      ${escapeHtml(badgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="card-content" style="padding:32px 36px 28px;">
              <!-- Main Headline Title -->
              <h1 style="margin:0 0 16px;color:#f8fafc;font-size:24px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${escapeHtml(input.title)}
              </h1>

              <!-- Intro Paragraph -->
              <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.65;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${escapeHtml(input.intro)}
              </p>

              <!-- Additional Body Lines -->
              ${bodyParagraphs}

              <!-- Highlights or Details Box if provided -->
              ${highlightHtml}

              <!-- Verification Code Box if provided -->
              ${codeHtml}

              <!-- Primary Call-to-Action -->
              ${ctaButton}

              <!-- Custom Additional Footer Content -->
              ${customFooter}
            </td>
          </tr>

          <!-- Trust & Value Pillar Banner -->
          <tr>
            <td style="background-color:#172033;border-top:1px solid #1f293d;padding:18px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="features-col" align="center" width="33%" style="padding:0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                    <div style="font-size:12px;font-weight:700;color:#f8fafc;">🛡️ 90-Day Warranty</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Platform Guaranteed</div>
                  </td>
                  <td class="features-col" align="center" width="33%" style="padding:0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #1f293d;border-right:1px solid #1f293d;">
                    <div style="font-size:12px;font-weight:700;color:#f8fafc;">🔒 Smart Escrow</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Payment Protected</div>
                  </td>
                  <td class="features-col" align="center" width="33%" style="padding:0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                    <div style="font-size:12px;font-weight:700;color:#f8fafc;">📍 100% Verified</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Local Repair Experts</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Legally Compliant Footer & Unsubscribe Section -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin-top:24px;text-align:center;">
          <!-- Quick Navigation Links -->
          <tr>
            <td style="padding-bottom:12px;font-size:12px;color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <a href="${siteUrl}" style="color:#94a3b8;text-decoration:none;font-weight:500;">Visit FixGrid</a>
              &nbsp;&bull;&nbsp;
              <a href="${siteUrl}/search" style="color:#94a3b8;text-decoration:none;font-weight:500;">Find Nearby Experts</a>
              &nbsp;&bull;&nbsp;
              <a href="${siteUrl}/privacy" style="color:#94a3b8;text-decoration:none;font-weight:500;">Privacy Policy</a>
              &nbsp;&bull;&nbsp;
              <a href="${siteUrl}/terms" style="color:#94a3b8;text-decoration:none;font-weight:500;">Terms of Service</a>
            </td>
          </tr>

          <!-- Required Sender & Legal Rationale -->
          <tr>
            <td style="padding-bottom:10px;font-size:11.5px;color:#64748b;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              You received this official security and account notification because an action was initiated on your account associated with <span style="color:#94a3b8;font-weight:600;">${escapeHtml(
                recipient,
              )}</span>.<br />
              If you did not perform this action, please secure your account immediately or contact <a href="mailto:support@vytron.me" style="color:#38bdf8;text-decoration:none;">support@vytron.me</a>.
            </td>
          </tr>

          <!-- Unsubscribe & Notification Preferences (Mandatory Legal Compliance) -->
          <tr>
            <td style="padding:12px 0 14px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="padding:0 6px;">
                    <a href="${escapeHtml(
                      unsubscribeUrl,
                    )}" target="_blank" style="display:inline-block;padding:7px 16px;background-color:#172033;border:1px solid #334155;border-radius:6px;color:#cbd5e1;font-size:11.5px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Unsubscribe
                    </a>
                  </td>
                  <td style="padding:0 6px;">
                    <a href="${escapeHtml(
                      preferencesUrl,
                    )}" target="_blank" style="display:inline-block;padding:7px 16px;background-color:#172033;border:1px solid #334155;border-radius:6px;color:#cbd5e1;font-size:11.5px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Manage Preferences
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:10px;font-size:11px;color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                To immediately opt out of all promotional and non-essential emails, click Unsubscribe above.
              </div>
            </td>
          </tr>

          <!-- Corporate Identity & Mission -->
          <tr>
            <td style="font-size:11px;color:#475569;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              FixGrid (by Vytron Technologies) &bull; Championing Right-to-Repair & Circular Economy under Mission LiFE.<br />
              &copy; ${new Date().getFullYear()} FixGrid Technologies Inc. All rights reserved. &bull; <a href="${siteUrl}" style="color:#475569;text-decoration:none;">fixgrid.vytron.me</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPlainText(input: EmailTemplateInput): string {
  const lines = [
    `${SITE_NAME} — Verified Local Repair Network`,
    "==================================================",
    input.title.toUpperCase(),
    "",
    input.intro,
    "",
    ...(input.bodyLines ?? []),
  ];

  if (input.code) {
    lines.push("", `VERIFICATION CODE: ${input.code}`, "");
  }

  if (input.ctaLabel && input.ctaUrl) {
    lines.push("", `${input.ctaLabel}: ${input.ctaUrl}`, "");
  }

  if (input.footer) {
    lines.push("", input.footer);
  }

  lines.push(
    "",
    "--------------------------------------------------",
    `This email was sent to ${input.recipientEmail ?? "your account"} by FixGrid.`,
    "Unsubscribe or manage notification preferences:",
    input.unsubscribeUrl ?? `${CANONICAL_ORIGIN}/dashboard/settings`,
    "",
    `© ${new Date().getFullYear()} FixGrid Technologies. All rights reserved.`,
    "https://fixgrid.vytron.me",
  );

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
