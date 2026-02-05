import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === "true";
const fromAddress = process.env.SMTP_FROM || "no-reply@localhost";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!smtpHost) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
  return cachedTransporter;
}

export async function sendEmail(params: { to: string; subject: string; text: string; html?: string }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Email suppressed.", {
      to: params.to,
      subject: params.subject,
    });
    console.warn(params.text);
    return { suppressed: true };
  }
  await transporter.sendMail({
    from: fromAddress,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
  return { suppressed: false };
}
