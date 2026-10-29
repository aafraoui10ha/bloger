import { stripHtml } from "@/lib/html-text";

/** Approximate reading time in minutes (~220 words per minute), minimum 1. */
export function readingTimeMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
