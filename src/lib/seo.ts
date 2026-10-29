import type { Metadata } from "next";
import { locales, type AppLocale } from "@/i18n/routing";
import { siteUrl } from "./env";

/** Prefixes a locale-less path ("/tools/x") with the locale ("/fr/tools/x"). */
export function localizedPath(locale: AppLocale, path: string): string {
  const clean = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Encodes non-ASCII path segments (Arabic slugs) for use in canonical/hreflang URLs. */
export function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => (/^[\x21-\x7e]*$/.test(seg) ? seg : encodeURIComponent(seg)))
    .join("/");
}

export type PathsByLocale = Partial<Record<AppLocale, string>>;

/**
 * Builds canonical + hreflang alternates. `paths` holds the locale-less path of
 * each existing translation. x-default points to English when available.
 */
export function buildAlternates(current: AppLocale, paths: PathsByLocale, canonicalOverride?: string | null) {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    const p = paths[l];
    if (p !== undefined) languages[l] = absoluteUrl(encodePath(localizedPath(l, p)));
  }
  const xDefault = languages.en ?? languages[current];
  if (xDefault && Object.keys(languages).length > 1) languages["x-default"] = xDefault;
  const self = paths[current];
  const canonical = canonicalOverride || (self !== undefined ? absoluteUrl(encodePath(localizedPath(current, self))) : undefined);
  return { canonical, languages };
}

/** Same path in every locale (tools index, blog index, home, etc.). */
export function samePathEverywhere(path: string): PathsByLocale {
  return Object.fromEntries(locales.map((l) => [l, path])) as PathsByLocale;
}

export type PageMetaInput = {
  locale: AppLocale;
  title: string;
  description: string;
  paths: PathsByLocale;
  canonicalOverride?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  ogType?: "website" | "article";
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  siteName: string;
  publishedTime?: string;
  modifiedTime?: string;
};

export function buildMetadata(input: PageMetaInput): Metadata {
  const alternates = buildAlternates(input.locale, input.paths, input.canonicalOverride);
  const ogLocale = { en: "en_US", fr: "fr_FR", ar: "ar_AR" }[input.locale];
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: alternates.canonical, languages: alternates.languages },
    robots: { index: !input.noindex, follow: !input.nofollow },
    openGraph: {
      type: input.ogType ?? "website",
      title: input.ogTitle || input.title,
      description: input.ogDescription || input.description,
      url: alternates.canonical,
      siteName: input.siteName,
      locale: ogLocale,
      ...(input.ogImage ? { images: [{ url: input.ogImage }] } : {}),
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: input.ogImage ? "summary_large_image" : "summary",
      title: input.ogTitle || input.title,
      description: input.ogDescription || input.description,
    },
  };
}

/** Truncates a description to a search-friendly length on a word boundary. */
export function clampDescription(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

/** Serializes JSON-LD safely for embedding in a <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
