import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { absoluteUrl, buildMetadata, clampDescription, encodePath, localizedPath } from "@/lib/seo";
import { pathsFromTranslations } from "@/lib/sitemap-builder";
import { getSiteSettings, getToolBySlug, listPublishedArticles } from "@/lib/content";
import { getPageAds } from "@/lib/ads-server";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";
import { readFaq, readStringList } from "@/lib/json-fields";
import { sanitizeRichText } from "@/lib/sanitize";
import { isToolModuleKey, TOOL_MODULES, type ToolModuleKey } from "@/tools/registry";
import { ArticleCard, Breadcrumbs, FaqList, JsonLd, ToolCard } from "@/components/site/ui";
import { RegisterAlternates } from "@/components/site/alternates";
import { AdSlot, AdsLoader } from "@/components/ads/Ads";
import { ToolRenderer } from "@/tools/ToolRenderer";
import { ToolIconView } from "@/components/icons";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tr = await getToolBySlug(locale, decodeParam(slug));
  if (!tr) return {};
  const { siteName } = await getSiteSettings();
  return buildMetadata({
    locale,
    title: tr.seoTitle || tr.title,
    description: tr.seoDescription || clampDescription(tr.shortDescription),
    paths: pathsFromTranslations(tr.tool.translations, "/tools"),
    siteName,
  });
}

export default async function ToolPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const decoded = decodeParam(slug);
  const tr = await getToolBySlug(locale, decoded);
  if (!tr || !isToolModuleKey(tr.tool.moduleKey)) return redirectOrNotFound(`/${locale}/tools/${decoded}`);

  const [t, tc, { siteName }] = await Promise.all([
    getTranslations({ locale, namespace: "tool" }),
    getTranslations({ locale, namespace: "common" }),
    getSiteSettings(),
  ]);
  const tool = tr.tool;
  const moduleKey = tool.moduleKey as ToolModuleKey;
  const steps = readStringList(tr.steps);
  const examples = readStringList(tr.examples);
  const faq = readFaq(tr.faq);
  const aboutHtml = sanitizeRichText(tr.aboutHtml);
  const related = tool.relatedFrom.map((r) => r.to).filter((x) => x.translations[0]);
  const articleIds = tool.articleLinks.map((a) => a.articleId);
  const articles = articleIds.length ? await listPublishedArticles(locale, { ids: articleIds, take: 3 }) : { items: [] };
  const allowedPlacements = tool.adPlacements.map((p) => p.placement.key);
  const hasContent = aboutHtml.length > 200 && steps.length > 0;
  const ads = await getPageAds("tool", hasContent, allowedPlacements);
  const category = tool.category?.translations[0];
  const alternates = Object.fromEntries(tool.translations.map((x) => [x.locale, `/tools/${x.slug}`]));
  const url = absoluteUrl(encodePath(localizedPath(locale, `/tools/${tr.slug}`)));

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tr.title,
    description: tr.shortDescription,
    url,
    applicationCategory: TOOL_MODULES[moduleKey].category === "developer" ? "DeveloperApplication" : "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript",
    inLanguage: locale,
    isAccessibleForFree: true,
    // Accurate: every tool is free to use.
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: siteName },
  };
  const faqLd = faq.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
    : null;

  return (
    <>
      <RegisterAlternates value={alternates} />
      <JsonLd data={appLd} />
      {faqLd && <JsonLd data={faqLd} />}
      {ads.publisherId && <AdsLoader publisherId={ads.publisherId} />}

      <div className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <Breadcrumbs
            locale={locale}
            label={tc("breadcrumb")}
            items={[
              { label: tc("home"), href: "/" },
              { label: tc("tools"), href: "/tools" },
              ...(category ? [{ label: category.name, href: `/tools/category/${category.slug}` }] : []),
              { label: tr.title },
            ]}
          />
          <div className="mt-4 flex items-start gap-4">
            <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent sm:grid">
              <ToolIconView name={tool.icon} className="size-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tr.title}</h1>
              <p className="mt-2 max-w-2xl text-muted">{tr.shortDescription}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page">
        <p className="mt-6 flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          {t("privacyLocal")}
        </p>

        {/* The interactive tool. No ads are ever placed inside this container. */}
        <section aria-label={tr.title} className="card mt-4 p-4 sm:p-6">
          <noscript>
            <p className="alert-warning">{tc("noJavascript")}</p>
          </noscript>
          <ToolRenderer moduleKey={moduleKey} toolKey={moduleKey} />
        </section>

        <AdSlot {...ads.slot("tool-below-result")} />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {aboutHtml && (
              <section aria-labelledby="about-tool">
                <h2 id="about-tool" className="text-xl font-bold">
                  {t("about")}
                </h2>
                <div className="prose-content mt-4" dangerouslySetInnerHTML={{ __html: aboutHtml }} />
              </section>
            )}
            {steps.length > 0 && (
              <section aria-labelledby="how-to" className="mt-12">
                <h2 id="how-to" className="text-xl font-bold">
                  {t("howTo")}
                </h2>
                <ol className="mt-4 space-y-3">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {examples.length > 0 && (
              <section aria-labelledby="examples" className="mt-12">
                <h2 id="examples" className="text-xl font-bold">
                  {t("examples")}
                </h2>
                <ul className="mt-4 space-y-2">
                  {examples.map((e, i) => (
                    <li key={i} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                      {e}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <FaqList items={faq} title={tc("faq")} />
            <AdSlot {...ads.slot("tool-bottom")} />
          </div>
          <aside className="space-y-8">
            {related.length > 0 && (
              <section aria-labelledby="related-tools">
                <h2 id="related-tools" className="font-semibold">
                  {tc("relatedTools")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {related.map((r) => (
                    <li key={r.id}>
                      <ToolCard
                        tool={{ id: r.id, moduleKey: r.moduleKey, icon: r.icon, slug: r.translations[0]!.slug, title: r.translations[0]!.title, description: r.translations[0]!.shortDescription, categoryId: r.categoryId, featured: r.featured, createdAt: r.createdAt }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <AdSlot {...ads.slot("sidebar")} />
          </aside>
        </div>

        {articles.items.length > 0 && (
          <section aria-labelledby="related-guides" className="mt-12">
            <h2 id="related-guides" className="text-xl font-bold">
              {tc("relatedArticles")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.items.map((a) => (
                <ArticleCard key={a.id} article={a} locale={locale} readLabel={tc("minRead", { count: a.readingTimeMinutes })} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
