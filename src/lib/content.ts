import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/routing";
import type { Prisma } from "@/generated/prisma/client";
import type { AdSettingsSnapshot, PlacementSnapshot } from "@/lib/ads";

/**
 * Public visibility rule for articles. SCHEDULED articles whose time has come
 * are treated as published even before the cron job flips their status, so
 * scheduling never depends on cron frequency.
 */
export function publicArticleWhere(now = new Date()): Prisma.ArticleWhereInput {
  return { OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishAt: { lte: now } }] };
}

export const getSiteSettings = cache(async () => {
  const s = await db.siteSettings.findUnique({ where: { id: "default" } });
  return {
    siteName: s?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || "Toolbox Atlas",
    tagline: { en: s?.taglineEn ?? "", fr: s?.taglineFr ?? "", ar: s?.taglineAr ?? "" },
    contactEmail: s?.contactEmail ?? null,
    organizationName: s?.organizationName ?? null,
    organizationLogoUrl: s?.organizationLogoUrl ?? null,
  };
});

export const getAdState = cache(async (): Promise<{ settings: AdSettingsSnapshot; placements: PlacementSnapshot[] }> => {
  const [s, placements] = await Promise.all([
    db.adSettings.findUnique({ where: { id: "default" } }),
    db.adPlacement.findMany({ select: { key: true, enabled: true, slotId: true } }),
  ]);
  return {
    settings: {
      masterEnabled: s?.masterEnabled ?? false,
      mode: s?.mode ?? "TEST",
      publisherId: s?.publisherId ?? null,
      ownerConfirmedAuthorized: s?.ownerConfirmedAuthorized ?? false,
      autoAds: s?.autoAds ?? false,
    },
    placements,
  };
});

export const getConsentConfig = cache(async () => {
  const c = await db.consentConfiguration.findUnique({ where: { id: "default" } });
  return { mode: c?.mode ?? "BUILT_IN", bannerEnabled: c?.bannerEnabled ?? true, policyVersion: c?.policyVersion ?? 1 };
});

export const getAnalyticsConfig = cache(async () => {
  const a = await db.analyticsSettings.findUnique({ where: { id: "default" } });
  const id = a?.gaMeasurementId && /^G-[A-Z0-9]{4,12}$/.test(a.gaMeasurementId) ? a.gaMeasurementId : null;
  return { gaMeasurementId: a?.enabled ? id : null, searchConsoleVerification: a?.searchConsoleVerification ?? null };
});

export const getNavigation = cache(async (location: "HEADER" | "FOOTER" | "SOCIAL") => {
  return db.navigationItem.findMany({ where: { location, enabled: true }, orderBy: { order: "asc" } });
});

export function navLabel(item: { labelEn: string; labelFr: string; labelAr: string }, locale: AppLocale): string {
  return locale === "ar" ? item.labelAr : locale === "fr" ? item.labelFr : item.labelEn;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const toolCardSelect = (locale: AppLocale) =>
  ({
    id: true,
    moduleKey: true,
    icon: true,
    featured: true,
    createdAt: true,
    categoryId: true,
    translations: { where: { locale, isComplete: true }, select: { slug: true, title: true, shortDescription: true } },
  }) satisfies Prisma.ToolSelect;

export type ToolCard = { id: string; moduleKey: string; icon: string; slug: string; title: string; description: string; categoryId: string | null; featured: boolean; createdAt: Date };

function toCard(t: Prisma.ToolGetPayload<{ select: ReturnType<typeof toolCardSelect> }>): ToolCard | null {
  const tr = t.translations[0];
  if (!tr) return null;
  return { id: t.id, moduleKey: t.moduleKey, icon: t.icon, slug: tr.slug, title: tr.title, description: tr.shortDescription, categoryId: t.categoryId, featured: t.featured, createdAt: t.createdAt };
}

export const listTools = cache(async (locale: AppLocale): Promise<ToolCard[]> => {
  const tools = await db.tool.findMany({ where: { enabled: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: toolCardSelect(locale) });
  return tools.map(toCard).filter((t): t is ToolCard => t !== null);
});

export const listCategories = cache(async (locale: AppLocale, kind: "TOOL" | "ARTICLE") => {
  const cats = await db.category.findMany({
    where: { kind },
    orderBy: { order: "asc" },
    include: { translations: { where: { locale } } },
  });
  return cats
    .map((c) => (c.translations[0] ? { ...c.translations[0], id: c.id, icon: c.icon } : null))
    .filter((c): c is NonNullable<typeof c> => c !== null);
});

export const getCategoryBySlug = cache(async (locale: AppLocale, kind: "TOOL" | "ARTICLE", slug: string) => {
  return db.categoryTranslation.findUnique({
    where: { kind_locale_slug: { kind, locale, slug } },
    include: { category: { include: { translations: { select: { locale: true, slug: true } } } } },
  });
});

export const getToolBySlug = cache(async (locale: AppLocale, slug: string) => {
  const tr = await db.toolTranslation.findUnique({
    where: { locale_slug: { locale, slug } },
    include: {
      tool: {
        include: {
          translations: { where: { isComplete: true }, select: { locale: true, slug: true } },
          category: { include: { translations: { where: { locale } } } },
          relatedFrom: { include: { to: { select: toolCardSelect(locale) } } },
          adPlacements: { include: { placement: { select: { key: true } } } },
          articleLinks: { select: { articleId: true } },
        },
      },
    },
  });
  if (!tr || !tr.isComplete || !tr.tool.enabled) return null;
  return tr;
});

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  publishedAt: Date | null;
  updatedAt: Date | null;
  imageId: string | null;
  imageAlt: string;
};

export async function listPublishedArticles(
  locale: AppLocale,
  opts: { categoryId?: string; skip?: number; take?: number; ids?: string[]; excludeId?: string } = {},
): Promise<{ items: ArticleCard[]; total: number }> {
  const where: Prisma.ArticleTranslationWhereInput = {
    locale,
    isComplete: true,
    article: {
      ...publicArticleWhere(),
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.ids ? { id: { in: opts.ids } } : {}),
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
  };
  const [rows, total] = await Promise.all([
    db.articleTranslation.findMany({
      where,
      orderBy: { article: { publishedAt: "desc" } },
      skip: opts.skip ?? 0,
      take: opts.take ?? 12,
      include: { article: { select: { publishedAt: true, publishAt: true, contentUpdatedAt: true, featuredImageId: true, featuredImage: { select: { alt: true } } } } },
    }),
    db.articleTranslation.count({ where }),
  ]);
  return {
    total,
    items: rows.map((r) => ({
      id: r.articleId,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      readingTimeMinutes: r.readingTimeMinutes,
      publishedAt: r.article.publishedAt ?? r.article.publishAt,
      updatedAt: r.article.contentUpdatedAt,
      imageId: r.article.featuredImageId,
      imageAlt: r.featuredImageAlt || r.article.featuredImage?.alt || "",
    })),
  };
}

export const getPublishedArticle = cache(async (locale: AppLocale, slug: string) => {
  const tr = await db.articleTranslation.findUnique({
    where: { locale_slug: { locale, slug } },
    include: {
      article: {
        include: {
          author: { select: { name: true, bio: true } },
          featuredImage: { select: { id: true, alt: true, width: true, height: true } },
          category: { include: { translations: { where: { locale } } } },
          translations: { where: { isComplete: true }, select: { locale: true, slug: true } },
          tags: { include: { tag: true } },
          relatedFrom: { select: { toId: true } },
          toolLinks: { select: { toolId: true } },
        },
      },
    },
  });
  if (!tr || !tr.isComplete) return null;
  const a = tr.article;
  const visible = a.status === "PUBLISHED" || (a.status === "SCHEDULED" && a.publishAt && a.publishAt <= new Date());
  return visible ? tr : null;
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const getPageBySlug = cache(async (locale: AppLocale, slug: string) => {
  const tr = await db.pageTranslation.findUnique({
    where: { locale_slug: { locale, slug } },
    include: { page: { include: { translations: { where: { isPublished: true }, select: { locale: true, slug: true } } } } },
  });
  return tr && tr.isPublished ? tr : null;
});

export const getPageSlugs = cache(async (locale: AppLocale) => {
  const rows = await db.pageTranslation.findMany({ where: { locale, isPublished: true }, select: { slug: true, title: true, page: { select: { key: true } } } });
  return Object.fromEntries(rows.map((r) => [r.page.key, { slug: r.slug, title: r.title }])) as Record<string, { slug: string; title: string } | undefined>;
});

// ---------------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------------

export async function findRedirect(path: string) {
  const r = await db.redirect.findUnique({ where: { fromPath: path } });
  if (r) await db.redirect.update({ where: { id: r.id }, data: { hits: { increment: 1 } } }).catch(() => {});
  return r;
}
