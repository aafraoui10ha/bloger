import { z } from "zod";

/** Contact form input, validated on the server. */
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  subject: z.string().trim().max(150),
  message: z.string().trim().min(10).max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = "name" | "email" | "subject" | "message";
export type ContactState = { status: "idle" | "sent" | "error"; error?: "invalid" | "rate" | "send"; fields?: ContactField[] };

/** Collapses line breaks so visitor input can never add mail headers. */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();

/** Builds a plain-text email. The visitor goes in Reply-To; the sender is always the site's own account. */
export function buildContactMail(input: ContactInput, ctx: { siteName: string; locale: string }) {
  const name = oneLine(input.name);
  return {
    subject: `[${oneLine(ctx.siteName)}] ${oneLine(input.subject) || `Message from ${name}`}`.slice(0, 200),
    replyTo: { name, address: input.email },
    text: [`Name: ${name}`, `Email: ${input.email}`, `Language: ${ctx.locale}`, "", input.message].join("\n"),
  };
}
