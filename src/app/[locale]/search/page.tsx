import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { publicArticleWhere, listTools } from "@/lib/content";
import { Breadcrumbs, PageHeader, ToolCard } from "@/components/site/ui";
import { TrackView } from "@/components/site/TrackView";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  // Internal search results are never indexed.
  return { title: t("metaTitle"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const [t, tc] = await Promise.all([getTranslations({ locale, namespace: "search" }), getTranslations({ locale, namespace: "common" })]);

  let tools: Awaited<ReturnType<typeof listTools>> = [];
  let articles: { slug: string; title: string; excerpt: string }[] = [];
  if (q.length >= 2) {
    const terms = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 5);
    const all = await listTools(locale);
    const lower = (s: string) => s.toLocaleLowerCase(locale);
    tools = all.filter((x) => terms.every((term) => lower(`${x.title} ${x.description} ${x.moduleKey.replace(/-/g, " ")}`).includes(lower(term))));
    articles = await db.articleTranslation.findMany({
      where: {
        locale,
        isComplete: true,
        article: publicArticleWhere(),
        AND: terms.map((term) => ({ OR: [{ title: { contains: term } }, { excerpt: { contains: term } }] })),
      },
      select: { slug: true, title: true, excerpt: true },
      take: 20,
    });
  }
  const suggestions = [1, 2, 3, 4, 5].map((n) => t(`suggestion${n}` as "suggestion1"));
  const nothing = q.length >= 2 && tools.length === 0 && articles.length === 0;

  return (
    <>
      <PageHeader title={q ? t("resultsFor", { query: q }) : t("title")}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: t("title") }]} />
      </PageHeader>
      <div className="container-page">
        {q.length >= 2 && <TrackView event="internal_search" params={{ results: String(tools.length + articles.length) }} />}
        <form method="get" role="search" className="mt-8 flex max-w-xl gap-2">
          <label htmlFor="search-q" className="sr-only">
            {tc("searchTools")}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id="search-q" name="q" type="search" defaultValue={q} maxLength={100} placeholder={tc("searchPlaceholder")} className="input h-11 ps-9" />
          </div>
          <button className="btn-primary h-11">{tc("search")}</button>
        </form>

        {!q && <p className="mt-6 text-muted">{t("prompt")}</p>}
        {(nothing || !q) && (
          <div className="mt-6">
            {nothing && <p className="font-medium">{t("empty", { query: q })}</p>}
            <p className="mt-1 text-sm text-muted">{t("emptyHint")}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <Link href={{ pathname: "/search", query: { q: s } }} className="badge border-border bg-surface px-3 py-1 text-sm hover:border-accent">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tools.length > 0 && (
          <section aria-labelledby="r-tools" className="mt-10">
            <h2 id="r-tools" className="text-xl font-bold">
              {t("tools")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}
        {articles.length > 0 && (
          <section aria-labelledby="r-articles" className="mt-10">
            <h2 id="r-articles" className="text-xl font-bold">
              {t("articles")}
            </h2>
            <ul className="mt-4 space-y-3">
              {articles.map((a) => (
                <li key={a.slug} className="card p-4">
                  <Link href={`/blog/${a.slug}`} className="font-semibold hover:text-accent">
                    {a.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{a.excerpt}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
