import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, samePathEverywhere } from "@/lib/seo";
import { getSiteSettings, listCategories, listPublishedArticles } from "@/lib/content";
import { ArticleCard, Breadcrumbs, PageHeader, Pagination } from "@/components/site/ui";

const PAGE_SIZE = 12;
type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ page?: string }> };

function pageNumber(raw?: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 && n < 10_000 ? n : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = pageNumber((await searchParams).page);
  const [t, { siteName }] = await Promise.all([getTranslations({ locale, namespace: "blog" }), getSiteSettings()]);
  const meta = buildMetadata({ locale, title: t("metaTitle"), description: t("metaDescription"), paths: samePathEverywhere("/blog"), siteName });
  // Paginated pages are crawlable but self-canonical to avoid duplicate signals.
  if (page > 1) meta.alternates = { ...meta.alternates, canonical: `${meta.alternates?.canonical}?page=${page}` };
  return meta;
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = pageNumber((await searchParams).page);
  const [t, tc, categories, { items, total }] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getTranslations({ locale, namespace: "common" }),
    listCategories(locale, "ARTICLE"),
    listPublishedArticles(locale, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: tc("blog") }]} />
      </PageHeader>
      <div className="container-page">
        {categories.length > 0 && (
          <nav aria-label={tc("blog")} className="mt-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.id} href={`/blog/category/${c.slug}`} className="badge border-border bg-surface px-3 py-1 text-sm hover:border-accent">
                {c.name}
              </Link>
            ))}
          </nav>
        )}
        {items.length === 0 ? (
          <div className="mt-10 card p-8 text-center">
            <p className="text-muted">{t("empty")}</p>
            <Link href="/tools" className="btn-primary mt-4">
              {tc("allTools")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} locale={locale} readLabel={tc("minRead", { count: a.readingTimeMinutes })} />
            ))}
          </div>
        )}
        <Pagination page={page} total={pages} basePath="/blog" labels={{ previous: tc("previous"), next: tc("next"), pageOf: tc("pageOf", { page, total: pages }) }} />
      </div>
    </>
  );
}
