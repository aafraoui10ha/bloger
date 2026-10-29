import { isValidSlug } from "@/lib/slug";
import { isValidCanonical } from "@/lib/urls";
import { stripHtml } from "@/lib/html-text";

export type PublishIssue = { code: "needComplete" | "title" | "slug" | "excerpt" | "content" | "alt" | "canonical"; locale?: string };

export type TranslationForCheck = {
  locale: string;
  isComplete: boolean;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  featuredImageAlt?: string | null;
  canonicalUrl?: string | null;
};

export const MIN_EXCERPT = 50;
export const MIN_WORDS = 150;

export function wordCount(html: string): number {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
}

/**
 * Prevents accidental publication of incomplete content. Every translation
 * marked complete must pass; at least one translation must be complete.
 */
export function checkPublishable(translations: TranslationForCheck[], featuredImage: { alt: string } | null): PublishIssue[] {
  const complete = translations.filter((t) => t.isComplete);
  if (complete.length === 0) return [{ code: "needComplete" }];
  const issues: PublishIssue[] = [];
  for (const t of complete) {
    if (!t.title.trim()) issues.push({ code: "title", locale: t.locale });
    if (!isValidSlug(t.slug)) issues.push({ code: "slug", locale: t.locale });
    if (t.excerpt.trim().length < MIN_EXCERPT) issues.push({ code: "excerpt", locale: t.locale });
    if (wordCount(t.contentHtml) < MIN_WORDS) issues.push({ code: "content", locale: t.locale });
    if (featuredImage && !(t.featuredImageAlt?.trim() || featuredImage.alt.trim())) issues.push({ code: "alt", locale: t.locale });
    if (t.canonicalUrl && !isValidCanonical(t.canonicalUrl)) issues.push({ code: "canonical", locale: t.locale });
  }
  return issues;
}

/** Allowed status transitions (permission checks happen separately). */
export const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["IN_REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"],
  IN_REVIEW: ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"],
  SCHEDULED: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
