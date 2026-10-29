import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeNames, type AppLocale } from "@/i18n/routing";
import { absoluteUrl, buildMetadata, clampDescription, encodePath, localizedPath } from "@/lib/seo";
import { pathsFromTranslations } from "@/lib/sitemap-builder";
import { getPublishedArticle, getSiteSettings, listPublishedArticles, listTools } from "@/lib/content";
import { getPageAds } from "@/lib/ads-server";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";
import { readFaq } from "@/lib/json-fields";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { ArticleCard, Breadcrumbs, FaqList, JsonLd, ToolCard } from "@/components/site/ui";
import { RegisterAlternates } from "@/components/site/alternates";
import { AdSlot, AdsLoader } from "@/components/ads/Ads";
import { ArticleBody, prepareArticleHtml, TableOfContents } from "@/components/site/ArticleBody";
import { TrackView } from "@/components/site/TrackView";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tr = await getPublishedArticle(locale, decodeParam(slug));
  if (!tr) return {};
  const { siteName } = await getSiteSettings();
  const a = tr.article;
  return buildMetadata({
    locale,
    title: tr.seoTitle || tr.title,
    description: tr.seoDescription || clampDescription(tr.excerpt || stripHtml(tr.contentHtml)),
    paths: pathsFromTranslations(a.translations, "/blog"),
    canonicalOverride: tr.canonicalUrl,
    noindex: tr.robotsNoindex,
    nofollow: tr.robotsNofollow,
    ogType: "article",
    ogTitle: tr.ogTitle,
    ogDescription: tr.ogDescription,
    ogImage: a.featuredImage ? absoluteUrl(`/media/${a.featuredImage.id}`) : null,
    siteName,
    publishedTime: (a.publishedAt ?? a.publishAt)?.toISOString(),
    modifiedTime: a.contentUpdatedAt?.toISOString(),
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const decoded = decodeParam(slug);
  const tr = await getPublishedArticle(locale, decoded);
  if (!tr) return redirectOrNotFound(`/${locale}/blog/${decoded}`);

  const a = tr.article;
  const [tc, { siteName }, tools] = await Promise.all([getTranslations({ locale, namespace: "common" }), getSiteSettings(), listTools(locale)]);
  const { html, toc } = prepareArticleHtml(sanitizeRichText(tr.contentHtml));
  const faq = readFaq(tr.faq);
  const wordCount = stripHtml(html).split(/\s+/).length;
  const ads = await getPageAds("article", wordCount >= 300);
  const relatedIds = a.relatedFrom.map((r) => r.toId);
  const related = relatedIds.length ? await listPublishedArticles(locale, { ids: relatedIds, take: 3 }) : await listPublishedArticles(locale, { categoryId: a.categoryId ?? undefined, excludeId: a.id, take: 3 });
  const linkedTools = tools.filter((t) => a.toolLinks.some((l) => l.toolId === t.id));
  const category = a.category?.translations[0];
  const published = a.publishedAt ?? a.publishAt;
  const fmt = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(d);
  const showUpdated = a.contentUpdatedAt && published && a.contentUpdatedAt.getTime() - published.getTime() > 86_400_000;
  const otherLocales = a.translations.filter((x) => x.locale !== locale);
  const alternates = Object.fromEntries((["en", "fr", "ar"] as const).map((l) => [l, a.translations.find((x) => x.locale === l) ? `/blog/${a.translations.find((x) => x.locale === l)!.slug}` : null]));
  const url = tr.canonicalUrl || absoluteUrl(encodePath(localizedPath(locale, `/blog/${tr.slug}`)));

  const articleLd =
    tr.structuredData === "NONE"
      ? null
      : {
          "@context": "https://schema.org",
          "@type": tr.structuredData === "ARTICLE" ? "Article" : "BlogPosting",
          headline: tr.title.slice(0, 110),
          description: tr.excerpt || undefined,
          inLanguage: locale,
          mainEntityOfPage: url,
          datePublished: published?.toISOString(),
          dateModified: (a.contentUpdatedAt ?? published)?.toISOString(),
          author: { "@type": "Person", name: a.author.name },
          publisher: { "@type": "Organization", name: siteName },
          ...(a.featuredImage ? { image: [absoluteUrl(`/media/${a.featuredImage.id}`)] } : {}),
        };
  const faqLd = faq.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
    : null;

  return (
    <>
      <RegisterAlternates value={alternates} />
      {articleLd && <JsonLd data={articleLd} />}
      {faqLd && <JsonLd data={faqLd} />}
      <TrackView event="article_viewed" params={{ locale }} />
      {ads.publisherId && <AdsLoader publisherId={ads.publisherId} />}

      <article>
        <header className="border-b border-border bg-surface">
          <div className="container-page py-10">
            <Breadcrumbs
              locale={locale}
              label={tc("breadcrumb")}
              items={[
                { label: tc("home"), href: "/" },
                { label: tc("blog"), href: "/blog" },
                ...(category ? [{ label: category.name, href: `/blog/category/${category.slug}` }] : []),
                { label: tr.title },
              ]}
            />
            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{tr.title}</h1>
            {tr.excerpt && <p className="mt-3 max-w-2xl text-lg text-muted">{tr.excerpt}</p>}
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span>{tc("by", { name: a.author.name })}</span>
              {published && (
                <time dateTime={published.toISOString()}>{tc("publishedOn", { date: fmt(published) })}</time>
              )}
              {showUpdated && <time dateTime={a.contentUpdatedAt!.toISOString()}>{tc("updatedOn", { date: fmt(a.contentUpdatedAt!) })}</time>}
              <span>{tc("minRead", { count: tr.readingTimeMinutes })}</span>
            </p>
            {otherLocales.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                {tc("alsoAvailableIn")}{" "}
                {otherLocales.map((o, i) => (
                  <span key={o.locale}>
                    {i > 0 && ", "}
                    <Link href={`/blog/${o.slug}`} locale={o.locale} hrefLang={o.locale} lang={o.locale} className="text-accent hover:underline">
                      {localeNames[o.locale]}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </header>

        <div className="container-page mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            {a.featuredImage && (
              <Image
                src={`/media/${a.featuredImage.id}`}
                alt={tr.featuredImageAlt || a.featuredImage.alt}
                width={a.featuredImage.width ?? 1200}
                height={a.featuredImage.height ?? 630}
                className="mb-8 h-auto w-full rounded-xl"
                priority
                unoptimized
              />
            )}
            <div className="lg:hidden">
              <TableOfContents toc={toc} title={tc("onThisPage")} />
            </div>
            <AdSlot {...ads.slot("article-top")} />
            <ArticleBody html={html} locale={locale} inContent={ads.slot("article-in-content")} />
            <FaqList items={faq} title={tc("faq")} />
            {a.tags.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-2">
                {a.tags
                  .filter((x) => x.tag.locale === locale)
                  .map((x) => (
                    <li key={x.tagId} className="badge border-border bg-surface-2 text-muted">
                      #{x.tag.name}
                    </li>
                  ))}
              </ul>
            )}
            <AdSlot {...ads.slot("article-bottom")} />
          </div>
          <aside className="hidden space-y-6 lg:block">
            <div className="sticky top-20 space-y-6">
              <TableOfContents toc={toc} title={tc("onThisPage")} />
              <AdSlot {...ads.slot("sidebar")} />
            </div>
          </aside>
        </div>
      </article>

      <div className="container-page">
        {linkedTools.length > 0 && (
          <section aria-labelledby="article-tools" className="mt-12">
            <h2 id="article-tools" className="text-xl font-bold">
              {tc("relatedTools")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {linkedTools.map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
            </div>
          </section>
        )}
        {related.items.length > 0 && (
          <section aria-labelledby="related" className="mt-12">
            <h2 id="related" className="text-xl font-bold">
              {tc("relatedArticles")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.items.map((r) => (
                <ArticleCard key={r.id} article={r} locale={locale} readLabel={tc("minRead", { count: r.readingTimeMinutes })} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
