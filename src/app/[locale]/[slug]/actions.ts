"use server";

import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { buildContactMail, contactSchema, type ContactField, type ContactState } from "@/lib/contact";
import { getSiteSettings } from "@/lib/content";
import { mailConfigured, sendOwnerMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Contact form submission. Message contents are never logged or stored. */
export async function sendContactMessage(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // Honeypot: bots that fill the hidden field get a fake success.
  if (field(fd, "website")) return { status: "sent" };

  const parsed = contactSchema.safeParse({ name: field(fd, "name"), email: field(fd, "email").trim(), subject: field(fd, "subject"), message: field(fd, "message") });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path[0] as ContactField))];
    return { status: "error", error: "invalid", fields };
  }
  if (!mailConfigured()) return { status: "error", error: "send" };
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 3600))) return { status: "error", error: "rate" };

  const locale = field(fd, "locale");
  const { siteName } = await getSiteSettings();
  try {
    await sendOwnerMail(buildContactMail(parsed.data, { siteName, locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale }));
  } catch (e) {
    console.error("contact: mail delivery failed:", e instanceof Error ? e.message : "unknown error");
    return { status: "error", error: "send" };
  }
  return { status: "sent" };
}
