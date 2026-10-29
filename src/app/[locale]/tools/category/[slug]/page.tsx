import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, clampDescription } from "@/lib/seo";
import { pathsFromTranslations } from "@/lib/sitemap-builder";
import { getCategoryBySlug, getSiteSettings, listTools } from "@/lib/content";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";
import { Breadcrumbs, PageHeader, ToolCard } from "@/components/site/ui";
import { RegisterAlternates } from "@/components/site/alternates";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = await getCategoryBySlug(locale, "TOOL", decodeParam(slug));
  if (!cat) return {};
  const { siteName } = await getSiteSettings();
  return buildMetadata({
    locale,
    title: cat.seoTitle || cat.name,
    description: cat.seoDescription || clampDescription(cat.description || cat.name),
    paths: pathsFromTranslations(cat.category.translations, "/tools/category"),
    siteName,
  });
}

export default async function ToolCategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const decoded = decodeParam(slug);
  const cat = await getCategoryBySlug(locale, "TOOL", decoded);
  if (!cat) return redirectOrNotFound(`/${locale}/tools/category/${decoded}`);
  const [tc, tools] = await Promise.all([getTranslations({ locale, namespace: "common" }), listTools(locale)]);
  const inCat = tools.filter((t) => t.categoryId === cat.categoryId);
  const alternates = Object.fromEntries(cat.category.translations.map((t) => [t.locale, `/tools/category/${t.slug}`]));

  return (
    <>
      <RegisterAlternates value={alternates} />
      <PageHeader title={cat.name} intro={cat.description ?? undefined}>
        <Breadcrumbs
          locale={locale}
          label={tc("breadcrumb")}
          items={[{ label: tc("home"), href: "/" }, { label: tc("tools"), href: "/tools" }, { label: cat.name }]}
        />
      </PageHeader>
      <div className="container-page mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inCat.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </>
  );
}
