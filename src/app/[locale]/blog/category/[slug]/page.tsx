import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, clampDescription } from "@/lib/seo";
import { pathsFromTranslations } from "@/lib/sitemap-builder";
import { getCategoryBySlug, getSiteSettings, listPublishedArticles } from "@/lib/content";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";
import { ArticleCard, Breadcrumbs, PageHeader, Pagination } from "@/components/site/ui";
import { RegisterAlternates } from "@/components/site/alternates";

const PAGE_SIZE = 12;
type Props = { params: Promise<{ locale: AppLocale; slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = await getCategoryBySlug(locale, "ARTICLE", decodeParam(slug));
  if (!cat) return {};
  const [{ siteName }, { total }] = await Promise.all([getSiteSettings(), listPublishedArticles(locale, { categoryId: cat.categoryId, take: 1 })]);
  return buildMetadata({
    locale,
    title: cat.seoTitle || cat.name,
    description: cat.seoDescription || clampDescription(cat.description || cat.name),
    paths: pathsFromTranslations(cat.category.translations, "/blog/category"),
    siteName,
    // Empty category pages are thin content: keep them out of the index.
    noindex: total === 0,
  });
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const decoded = decodeParam(slug);
  const cat = await getCategoryBySlug(locale, "ARTICLE", decoded);
  if (!cat) return redirectOrNotFound(`/${locale}/blog/category/${decoded}`);
  const n = Number((await searchParams).page);
  const page = Number.isInteger(n) && n > 1 ? n : 1;
  const [t, tc, { items, total }] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getTranslations({ locale, namespace: "common" }),
    listPublishedArticles(locale, { categoryId: cat.categoryId, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const alternates = Object.fromEntries(cat.category.translations.map((x) => [x.locale, `/blog/category/${x.slug}`]));

  return (
    <>
      <RegisterAlternates value={alternates} />
      <PageHeader title={cat.name} intro={cat.description ?? undefined}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: tc("blog"), href: "/blog" }, { label: cat.name }]} />
      </PageHeader>
      <div className="container-page">
        {items.length === 0 ? (
          <p className="mt-10 text-muted">{t("categoryEmpty")}</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} locale={locale} readLabel={tc("minRead", { count: a.readingTimeMinutes })} />
            ))}
          </div>
        )}
        <Pagination page={page} total={pages} basePath={`/blog/category/${cat.slug}`} labels={{ previous: tc("previous"), next: tc("next"), pageOf: tc("pageOf", { page, total: pages }) }} />
      </div>
    </>
  );
}
