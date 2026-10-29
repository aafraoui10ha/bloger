/**
 * URL slug generator that keeps Arabic letters (localized slugs) and strips Latin
 * diacritics. Output: lowercase, hyphen-separated, max 80 chars.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "") // Arabic tashkeel and tatweel
    .toLowerCase()
    .replace(/[^a-z0-9ء-ي٠-٩]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9ء-ي٠-٩]+(?:-[a-z0-9ء-ي٠-٩]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}
