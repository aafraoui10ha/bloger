import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, samePathEverywhere } from "@/lib/seo";
import { getSiteSettings, listCategories, listTools } from "@/lib/content";
import { Breadcrumbs, PageHeader, ToolCard } from "@/components/site/ui";
import { ToolIconView } from "@/components/icons";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, { siteName }] = await Promise.all([getTranslations({ locale, namespace: "toolsIndex" }), getSiteSettings()]);
  return buildMetadata({ locale, title: t("metaTitle"), description: t("metaDescription"), paths: samePathEverywhere("/tools"), siteName });
}

export default async function ToolsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, tools, categories] = await Promise.all([
    getTranslations({ locale, namespace: "toolsIndex" }),
    getTranslations({ locale, namespace: "common" }),
    listTools(locale),
    listCategories(locale, "TOOL"),
  ]);
  const uncategorized = tools.filter((x) => !x.categoryId || !categories.some((c) => c.id === x.categoryId));

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: tc("tools") }]} />
      </PageHeader>
      <div className="container-page">
        {tools.length === 0 && <p className="mt-10 text-muted">{t("empty")}</p>}
        {categories.length > 1 && (
          <nav aria-label={tc("tools")} className="mt-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <a key={c.id} href={`#cat-${c.slug}`} className="badge border-border bg-surface px-3 py-1 text-sm hover:border-accent">
                {c.name}
              </a>
            ))}
          </nav>
        )}
        {categories.map((cat) => {
          const inCat = tools.filter((x) => x.categoryId === cat.id);
          if (!inCat.length) return null;
          return (
            <section key={cat.id} id={`cat-${cat.slug}`} aria-labelledby={`h-${cat.id}`} className="mt-12 scroll-mt-20">
              <h2 id={`h-${cat.id}`} className="flex items-center gap-2 text-xl font-bold">
                <ToolIconView name={cat.icon} className="size-5 text-accent" />
                <Link href={`/tools/category/${cat.slug}`} className="hover:text-accent">
                  {cat.name}
                </Link>
                <span className="text-sm font-normal text-muted">({tc("toolCount", { count: inCat.length })})</span>
              </h2>
              {cat.description && <p className="mt-1 text-sm text-muted">{cat.description}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inCat.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
        {uncategorized.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uncategorized.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
