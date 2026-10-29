import type { MetadataRoute } from "next";
import { locales, type AppLocale } from "@/i18n/routing";
import { absoluteUrl, encodePath, localizedPath, type PathsByLocale } from "./seo";

export type SitemapGroup = {
  /** Locale-less path per available (complete, indexable) translation. */
  paths: PathsByLocale;
  lastModified?: Date;
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
};

/**
 * Expands translation groups into sitemap entries with hreflang alternates.
 * Only locales present in `paths` produce URLs, so missing translations are never listed.
 */
export function buildSitemapEntries(groups: SitemapGroup[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const g of groups) {
    const available = locales.filter((l) => g.paths[l] !== undefined);
    const languages: Record<string, string> = {};
    for (const l of available) languages[l] = absoluteUrl(encodePath(localizedPath(l, g.paths[l]!)));
    for (const l of available) {
      entries.push({
        url: languages[l]!,
        lastModified: g.lastModified,
        changeFrequency: g.changeFrequency,
        priority: g.priority,
        alternates: available.length > 1 ? { languages } : undefined,
      });
    }
  }
  return entries;
}

export function pathsFromTranslations<T extends { locale: AppLocale; slug: string }>(
  translations: T[],
  prefix: string,
): PathsByLocale {
  const out: PathsByLocale = {};
  for (const t of translations) out[t.locale] = `${prefix}/${t.slug}`;
  return out;
}
