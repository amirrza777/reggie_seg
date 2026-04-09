import nodemailer from "nodemailer";
import { APP_NAME } from "../../../../packages/shared/src/constants/index.js";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpTlsRejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
const fromAddress = process.env.SMTP_FROM || "no-reply@localhost";

let cachedTransporter: nodemailer.Transporter | null = null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textBlockToHtml(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const isList = lines.every((line) => line.startsWith("• ") || line.startsWith("- "));
  if (isList) {
    return `<ul style="margin:0; padding:0 0 0 20px;">${lines
      .map((line) => `<li style="margin:0 0 8px 0;">${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`)
      .join("")}</ul>`;
  }

  return `<p style="margin:0;">${lines.map((line) => escapeHtml(line)).join("<br/>")}</p>`;
}

function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => textBlockToHtml(block))
    .filter(Boolean)
    .join('<div style="height:16px; line-height:16px;">&nbsp;</div>');
}

function isHtmlDocument(html: string) {
  return /<html[\s>]/i.test(html) || /<!doctype/i.test(html);
}

function applyBrandLinkStyles(html: string) {
  return html.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    const hasStyle = /\bstyle\s*=/i.test(attrs);
    if (!hasStyle) {
      return `<a${attrs} style="color:#20ad78; text-decoration:underline; font-weight:600;">`;
    }
    return `<a${attrs.replace(
      /\bstyle\s*=\s*(['"])(.*?)\1/i,
      (_m, quote: string, styleValue: string) =>
        `style=${quote}${styleValue}; color:#20ad78; text-decoration:underline; font-weight:600;${quote}`,
    )}>`;
  });
}

function renderBrandedEmail(subject: string, contentHtml: string) {
  const safeSubject = escapeHtml(subject);
  const safeAppName = escapeHtml(APP_NAME);
  const year = new Date().getFullYear();
  const brandedContentHtml = applyBrandLinkStyles(contentHtml);
  const shellBackgroundImage =
    "radial-gradient(125% 62% at 0% 0%, rgba(32,173,120,0.42) 0%, rgba(32,173,120,0.16) 46%, rgba(32,173,120,0) 74%), radial-gradient(125% 62% at 100% 100%, rgba(32,173,120,0.38) 0%, rgba(32,173,120,0.14) 44%, rgba(32,173,120,0) 72%)";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${safeSubject}</title>
    <style>
      :root {
        color-scheme: light;
        supported-color-schemes: light;
      }
      .email-shell a,
      .email-shell a:visited {
        color: #20ad78 !important;
        text-decoration: underline !important;
      }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
      }
      @media (prefers-color-scheme: dark) {
        .email-body {
          background: #d8efe2 !important;
          color: #111111 !important;
        }
        .email-bg {
          background: #d8efe2 !important;
          background-image: ${shellBackgroundImage} !important;
        }
        .email-card {
          background: #ffffff !important;
          border-color: rgba(32, 173, 120, 0.44) !important;
        }
        .email-eyebrow {
          color: #6d6d6d !important;
        }
        .email-title {
          color: #111111 !important;
        }
        .email-copy {
          color: #1f1f1f !important;
        }
        .email-footer {
          color: #6d6d6d !important;
        }
      }
      [data-ogsc] .email-body,
      [data-ogsb] .email-body {
        background: #d8efe2 !important;
        color: #111111 !important;
      }
      [data-ogsc] .email-bg,
      [data-ogsb] .email-bg {
        background: #d8efe2 !important;
        background-image: ${shellBackgroundImage} !important;
      }
      [data-ogsc] .email-card,
      [data-ogsb] .email-card {
        background: #ffffff !important;
        border-color: rgba(32, 173, 120, 0.44) !important;
      }
      [data-ogsc] .email-eyebrow,
      [data-ogsb] .email-eyebrow {
        color: #6d6d6d !important;
      }
      [data-ogsc] .email-title,
      [data-ogsb] .email-title {
        color: #111111 !important;
      }
      [data-ogsc] .email-copy,
      [data-ogsb] .email-copy {
        color: #1f1f1f !important;
      }
      [data-ogsc] .email-footer,
      [data-ogsb] .email-footer {
        color: #6d6d6d !important;
      }
    </style>
  </head>
  <body class="email-body" link="#20ad78" vlink="#20ad78" style="margin:0; padding:0; background:#d8efe2; color:#111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table class="email-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#d8efe2; background-image:${shellBackgroundImage}; padding:20px 12px;">
      <tr>
        <td align="center">
          <table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
            <tr>
              <td class="email-rail" style="height:10px; background:#157a4d; background-image:linear-gradient(90deg, #0d5d3a 0%, #157a4d 45%, #20ad78 100%); border-radius:12px 12px 0 0;"></td>
            </tr>
            <tr>
              <td class="email-card" style="background:#ffffff; border:1px solid rgba(32, 173, 120, 0.44); border-top:0; border-radius:0 0 12px 12px; padding:28px 24px;">
                <p class="email-eyebrow" style="margin:0 0 14px 0; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6d6d6d;">${safeAppName}</p>
                <h1 class="email-title" style="margin:0 0 18px 0; font-size:24px; line-height:1.2; color:#111111;">${safeSubject}</h1>
                <div class="email-copy" style="font-size:15px; line-height:1.6; color:#1f1f1f;">${brandedContentHtml}</div>
              </td>
            </tr>
            <tr>
              <td class="email-footer" style="padding:14px 4px 0 4px; font-size:12px; line-height:1.5; color:#6d6d6d; text-align:center;">
                © ${year} ${safeAppName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function getTransporter() {
  if (!smtpHost) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    tls: { rejectUnauthorized: smtpTlsRejectUnauthorized },
  });
  return cachedTransporter;
}

/** Sends an email using the configured transport. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string }[];
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Email suppressed.", {
      to: params.to,
      subject: params.subject,
    });
    console.warn(params.text);
    return { suppressed: true };
  }
  const rawHtml = params.html ?? textToHtml(params.text);
  const styledHtml = isHtmlDocument(rawHtml) ? rawHtml : renderBrandedEmail(params.subject, rawHtml);
  await transporter.sendMail({
    from: fromAddress,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: styledHtml,
    attachments: params.attachments,
  });
  return { suppressed: false };
}
