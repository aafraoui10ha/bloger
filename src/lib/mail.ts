import "server-only";
import nodemailer from "nodemailer";

/** Gmail SMTP settings from the environment, or null when the contact form is not configured. */
function mailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  // Google shows app passwords in groups of four; the spaces are not part of it.
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");
  // RECEIVING_EMAIL is the older name for RECIPIENT_EMAIL.
  const to = (process.env.RECIPIENT_EMAIL || process.env.RECEIVING_EMAIL)?.trim();
  return user && pass && to ? { user, pass, to } : null;
}

export function mailConfigured(): boolean {
  return mailConfig() !== null;
}

/** Sends a message to the site owner (RECIPIENT_EMAIL) from the configured Gmail account. */
export async function sendOwnerMail(msg: { subject: string; text: string; replyTo?: { name: string; address: string } }) {
  const cfg = mailConfig();
  if (!cfg) throw new Error("Mail is not configured");
  const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: cfg.user, pass: cfg.pass } });
  await transport.sendMail({ from: cfg.user, to: cfg.to, ...msg });
}
