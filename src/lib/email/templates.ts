import { SITE_NAME } from "@/lib/site";

export interface EmailTemplateInput {
  preheader: string;
  title: string;
  intro: string;
  bodyLines?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

/** Branded HTML wrapper for all FixGrid transactional emails. */
export function renderEmailTemplate(input: EmailTemplateInput): string {
  const body = (input.bodyLines ?? [])
    .map((line) => `<p style="margin:0 0 12px;color:#d4d4d8;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("");

  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:28px 0 0;">
           <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#f97316;color:#111827;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;padding:14px 22px;border-radius:8px;">
             ${escapeHtml(input.ctaLabel)}
           </a>
         </p>`
      : "";

  const footer = input.footer
    ? `<p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5;">${escapeHtml(input.footer)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f0f10;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f10;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:12px;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0 0 8px;color:#f97316;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(SITE_NAME)}</p>
                <h1 style="margin:0;color:#fafafa;font-size:24px;line-height:1.25;font-family:Georgia, 'Times New Roman', serif;text-transform:uppercase;letter-spacing:-0.02em;">${escapeHtml(input.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <p style="margin:0 0 16px;color:#e4e4e7;font-size:15px;line-height:1.6;">${escapeHtml(input.intro)}</p>
                ${body}
                ${cta}
                ${footer}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#52525b;font-size:12px;">You received this because of activity on your ${escapeHtml(SITE_NAME)} account.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderPlainText(input: EmailTemplateInput): string {
  const lines = [input.title, "", input.intro, ...(input.bodyLines ?? []), ""];
  if (input.ctaLabel && input.ctaUrl) lines.push(`${input.ctaLabel}: ${input.ctaUrl}`);
  if (input.footer) lines.push("", input.footer);
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
