import "server-only";
import { db } from "@/lib/db";
import { publicArticleWhere } from "@/lib/content";
import { samePathEverywhere } from "@/lib/seo";
import { buildSitemapEntries, pathsFromTranslations, type SitemapGroup } from "@/lib/sitemap-builder";

/**
 * Collects every canonical, public, indexable URL. Excludes drafts, previews,
 * noindex articles, articles with external canonicals, disabled tools,
 * incomplete translations, empty categories, search and dashboard pages.
 */
export async function getSitemapEntries() {
  const groups: SitemapGroup[] = [
    { paths: samePathEverywhere("/"), priority: 1, changeFrequency: "weekly" },
    { paths: samePathEverywhere("/tools"), priority: 0.9, changeFrequency: "weekly" },
  ];

  const [tools, toolCats, articles, articleCats, pages] = await Promise.all([
    db.tool.findMany({ where: { enabled: true }, select: { updatedAt: true, translations: { where: { isComplete: true }, select: { locale: true, slug: true, updatedAt: true } } } }),
    db.category.findMany({ where: { kind: "TOOL", tools: { some: { enabled: true } } }, select: { translations: { select: { locale: true, slug: true } } } }),
    db.article.findMany({
      where: publicArticleWhere(),
      select: {
        contentUpdatedAt: true,
        publishedAt: true,
        translations: { where: { isComplete: true, robotsNoindex: false, canonicalUrl: null }, select: { locale: true, slug: true } },
      },
    }),
    db.category.findMany({ where: { kind: "ARTICLE", articles: { some: publicArticleWhere() } }, select: { translations: { select: { locale: true, slug: true } } } }),
    db.page.findMany({ select: { translations: { where: { isPublished: true }, select: { locale: true, slug: true, updatedAt: true } } } }),
  ]);

  for (const t of tools) if (t.translations.length) groups.push({ paths: pathsFromTranslations(t.translations, "/tools"), lastModified: t.updatedAt, priority: 0.8, changeFrequency: "monthly" });
  for (const c of toolCats) if (c.translations.length) groups.push({ paths: pathsFromTranslations(c.translations, "/tools/category"), priority: 0.6 });

  const publishedArticles = articles.filter((a) => a.translations.length);
  if (publishedArticles.length) {
    // Blog index only for locales that actually have published guides.
    const blogLocales = new Set(publishedArticles.flatMap((a) => a.translations.map((t) => t.locale)));
    groups.push({ paths: Object.fromEntries([...blogLocales].map((l) => [l, "/blog"])), priority: 0.7, changeFrequency: "weekly" });
  }
  for (const a of publishedArticles) groups.push({ paths: pathsFromTranslations(a.translations, "/blog"), lastModified: a.contentUpdatedAt ?? a.publishedAt ?? undefined, priority: 0.7 });
  for (const c of articleCats) if (c.translations.length) groups.push({ paths: pathsFromTranslations(c.translations, "/blog/category"), priority: 0.5 });
  for (const p of pages) if (p.translations.length) groups.push({ paths: pathsFromTranslations(p.translations, ""), priority: 0.3, changeFrequency: "yearly" });

  return buildSitemapEntries(groups);
}
