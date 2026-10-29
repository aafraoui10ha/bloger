import { z } from "zod";

export const faqSchema = z
  .array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().min(1).max(3000) }))
  .max(30);

export const stringListSchema = z.array(z.string().trim().min(1).max(1000)).max(30);

export type FaqItem = z.infer<typeof faqSchema>[number];

/** Safely reads a JSON column that should hold FAQ items. */
export function readFaq(value: unknown): FaqItem[] {
  const r = faqSchema.safeParse(value);
  return r.success ? r.data : [];
}

export function readStringList(value: unknown): string[] {
  const r = stringListSchema.safeParse(value);
  return r.success ? r.data : [];
}
