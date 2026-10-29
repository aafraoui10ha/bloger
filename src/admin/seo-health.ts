import "server-only";
import { db } from "@/lib/db";
import { publicArticleWhere } from "@/lib/content";
import { stripHtml } from "@/lib/html-text";
import { isValidCanonical, normalizePath } from "@/lib/urls";
import type { AdminKey } from "./i18n";

export type SeoIssue = { key: AdminKey; vars?: Record<string, string>; item: string; href: string; severity: "error" | "warning" };

const LOCALES = ["en", "fr", "ar"] as const;

function words(html: string) {
  const t = stripHtml(html);
  return t ? t.split(/\s+/).length : 0;
}

/** Extracts internal links ("/en/…") from stored HTML. */
export function internalLinks(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) out.push(m[1]!);
  return out;
}

export function imagesWithoutAlt(html: string): number {
  return [...html.matchAll(/<img\b[^>]*>/g)].filter((m) => !/\salt="[^"]+"/.test(m[0])).length;
}

/** Runs every automated content check. Pure reads; safe to call on each dashboard load. */
export async function computeSeoIssues(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  const [tools, articles, media, pages, redirects, cats] = await Promise.all([
    db.tool.findMany({ where: { enabled: true }, include: { translations: true } }),
    db.article.findMany({ where: publicArticleWhere(), include: { translations: true, featuredImage: { select: { alt: true } } } }),
    db.mediaAsset.findMany({ where: { alt: "" }, select: { id: true, filename: true } }),
    db.page.findMany({ include: { translations: true } }),
    db.redirect.findMany({ select: { fromPath: true } }),
    db.categoryTranslation.findMany({ select: { kind: true, locale: true, slug: true } }),
  ]);

  // Valid public paths, used for broken-link detection.
  const valid = new Set<string>(LOCALES.flatMap((l) => [`/${l}`, `/${l}/tools`, `/${l}/blog`, `/${l}/search`]));
  for (const t of tools) for (const tr of t.translations) if (tr.isComplete) valid.add(`/${tr.locale}/tools/${tr.slug}`);
  for (const a of articles) for (const tr of a.translations) if (tr.isComplete) valid.add(`/${tr.locale}/blog/${tr.slug}`);
  for (const p of pages) for (const tr of p.translations) if (tr.isPublished) valid.add(`/${tr.locale}/${tr.slug}`);
  for (const c of cats) valid.add(`/${c.locale}/${c.kind === "TOOL" ? "tools" : "blog"}/category/${c.slug}`);
  const redirected = new Set(redirects.map((r) => r.fromPath));
  const isBroken = (href: string) => {
    if (!/^\/(en|fr|ar)(\/|$)/.test(href)) return false;
    const p = normalizePath(href);
    return !valid.has(p) && !redirected.has(p);
  };

  const seoChecks = (item: string, href: string, l: string, seoTitle: string | null, seoDescription: string | null) => {
    if (!seoDescription) issues.push({ key: "seo.i.missingSeoDescription", vars: { locale: l }, item, href, severity: "warning" });
    else if (seoDescription.length < 70 || seoDescription.length > 160) issues.push({ key: "seo.i.seoDescriptionLength", vars: { locale: l }, item, href, severity: "warning" });
    if (seoTitle && (seoTitle.length < 30 || seoTitle.length > 60)) issues.push({ key: "seo.i.seoTitleLength", vars: { locale: l }, item, href, severity: "warning" });
  };

  for (const t of tools) {
    const name = t.translations.find((x) => x.locale === "en")?.title ?? t.moduleKey;
    const href = `/admin/tools/${t.id}`;
    for (const l of LOCALES) {
      const tr = t.translations.find((x) => x.locale === l);
      if (!tr || !tr.isComplete) {
        issues.push({ key: "seo.i.missingTranslation", vars: { locale: l }, item: name, href, severity: "error" });
        continue;
      }
      seoChecks(name, href, l, tr.seoTitle, tr.seoDescription);
      const steps = Array.isArray(tr.steps) ? tr.steps.length : 0;
      if (words(tr.aboutHtml) < 80 || steps === 0) issues.push({ key: "seo.i.toolThin", vars: { locale: l }, item: name, href, severity: "warning" });
    }
  }

  for (const a of articles) {
    const name = a.translations[0]?.title ?? a.id;
    const href = `/admin/articles/${a.id}`;
    if (a.featuredImage && !a.featuredImage.alt && a.translations.some((t) => t.isComplete && !t.featuredImageAlt)) {
      issues.push({ key: "seo.i.missingFeaturedAlt", item: name, href, severity: "error" });
    }
    for (const l of LOCALES) {
      const tr = a.translations.find((x) => x.locale === l);
      if (!tr || !tr.isComplete) {
        issues.push({ key: "seo.i.missingTranslation", vars: { locale: l }, item: name, href, severity: "warning" });
        continue;
      }
      seoChecks(name, href, l, tr.seoTitle, tr.seoDescription);
      if (words(tr.contentHtml) < 300) issues.push({ key: "seo.i.thinContent", vars: { locale: l }, item: name, href, severity: "warning" });
      if (imagesWithoutAlt(tr.contentHtml)) issues.push({ key: "seo.i.imageNoAlt", vars: { locale: l }, item: name, href, severity: "error" });
      if (tr.canonicalUrl && !isValidCanonical(tr.canonicalUrl)) issues.push({ key: "seo.i.invalidCanonical", vars: { locale: l }, item: name, href, severity: "error" });
      for (const link of internalLinks(tr.contentHtml)) {
        if (isBroken(link)) issues.push({ key: "seo.i.brokenLink", vars: { locale: l, href: link }, item: name, href, severity: "error" });
      }
    }
  }

  for (const p of pages) {
    for (const tr of p.translations) {
      for (const link of internalLinks(tr.contentHtml)) {
        if (isBroken(link)) issues.push({ key: "seo.i.brokenLink", vars: { locale: tr.locale, href: link }, item: tr.title, href: `/admin/pages/${p.id}`, severity: "error" });
      }
      if (p.isLegal && !tr.legalReviewed) issues.push({ key: "seo.i.legalUnreviewed", vars: { locale: tr.locale }, item: tr.title, href: `/admin/pages/${p.id}`, severity: "warning" });
    }
  }

  for (const m of media) issues.push({ key: "seo.i.mediaNoAlt", item: m.filename, href: "/admin/media", severity: "warning" });
  return issues;
}
