import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Search, ShieldCheck, UserX, Languages, ScrollText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, samePathEverywhere, absoluteUrl, localizedPath } from "@/lib/seo";
import { getPageSlugs, getSiteSettings, listCategories, listPublishedArticles, listTools } from "@/lib/content";
import { getPageAds } from "@/lib/ads-server";
import { ArticleCard, JsonLd, ToolCard } from "@/components/site/ui";
import { AdSlot, AdsLoader } from "@/components/ads/Ads";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, { siteName }] = await Promise.all([getTranslations({ locale, namespace: "home" }), getSiteSettings()]);
  return {
    ...buildMetadata({ locale, title: t("metaTitle"), description: t("metaDescription"), paths: samePathEverywhere("/"), siteName }),
    title: { absolute: `${siteName} — ${t("metaTitle")}` },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, settings, tools, categories, articles, pages] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
    getSiteSettings(),
    listTools(locale),
    listCategories(locale, "TOOL"),
    listPublishedArticles(locale, { take: 3 }),
    getPageSlugs(locale),
  ]);
  const ads = await getPageAds("home", tools.length >= 6);
  const featured = tools.filter((t) => t.featured).slice(0, 6);
  const recent = [...tools].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4);
  const servicesHref = pages.services ? `/${pages.services.slug}` : null;

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: absoluteUrl(localizedPath(locale, "/")),
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl(localizedPath(locale, "/search"))}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  // Organization data is emitted only when the owner has entered real details.
  const orgLd = settings.organizationName
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: settings.organizationName,
        url: absoluteUrl("/"),
        ...(settings.organizationLogoUrl ? { logo: settings.organizationLogoUrl } : {}),
        ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
      }
    : null;

  const trust = [
    { icon: ShieldCheck, title: t("trust1Title"), body: t("trust1Body") },
    { icon: UserX, title: t("trust2Title"), body: t("trust2Body") },
    { icon: Languages, title: t("trust3Title"), body: t("trust3Body") },
    { icon: ScrollText, title: t("trust4Title"), body: t("trust4Body") },
  ];
  const stats = [
    { n: tools.length, label: t("statTools") },
    { n: 3, label: t("statLanguages") },
    { n: 0, label: t("statUploads") },
  ];

  return (
    <>
      <JsonLd data={websiteLd} />
      {orgLd && <JsonLd data={orgLd} />}
      {ads.publisherId && <AdsLoader publisherId={ads.publisherId} />}

      <section className="band relative overflow-hidden">
        {/* Flat decorative shapes (no gradients). */}
        <span aria-hidden="true" data-float className="pointer-events-none absolute -end-16 top-10 size-72 rounded-full bg-plum" />
        <span aria-hidden="true" data-float className="pointer-events-none absolute end-48 bottom-10 hidden size-28 rotate-12 rounded-[2rem] bg-berry md:block" />
        <span aria-hidden="true" data-float className="pointer-events-none absolute end-24 top-24 hidden size-10 rounded-full bg-cream lg:block" />
        <span aria-hidden="true" data-float className="pointer-events-none absolute -start-12 -bottom-16 size-40 rounded-full border-[14px] border-plum" />

        <div className="container-page relative py-16 sm:py-24">
          <p data-anim-step className="inline-flex rounded-full bg-cream px-3 py-1 text-xs font-bold tracking-wide text-ink">
            {t("heroEyebrow")}
          </p>
          <h1 data-anim-step className="mt-6 max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl">
            {t("heroTitle")}
          </h1>
          <p data-anim-step className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            {t("heroSubtitle")}
          </p>
          <form data-anim-step action={`/${locale}/search`} method="get" role="search" className="mt-8 flex max-w-xl gap-2">
            <label htmlFor="hero-search" className="sr-only">
              {tc("searchTools")}
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink/60" aria-hidden="true" />
              <input
                id="hero-search"
                name="q"
                type="search"
                required
                maxLength={100}
                placeholder={tc("searchPlaceholder")}
                className="input h-14 border-cream bg-cream ps-12 text-base text-ink placeholder:text-ink/60 focus:ring-cream/40"
              />
            </div>
            <button type="submit" className="btn-primary h-14 px-6">
              {tc("search")}
            </button>
          </form>
          <div data-anim-step className="mt-6 flex flex-wrap gap-3">
            <Link href="/tools" className="btn-secondary">
              {t("browseTools")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link href="/blog" className="btn-ghost">
              {t("readGuides")}
            </Link>
          </div>
          <dl data-anim-step className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-6">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-muted">{s.label}</dt>
                <dd className="text-3xl font-extrabold tabular-nums sm:text-4xl" data-count={s.n || undefined}>
                  {s.n}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page">
        {featured.length > 0 && (
          <section aria-labelledby="featured" className="mt-20">
            <SectionHead id="featured" eyebrow={tc("tools")} title={t("featured")} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="by-category" className="mt-24">
          <SectionHead id="by-category" eyebrow={tc("allTools")} title={t("byCategory")} />
          <div className="mt-8 space-y-14">
            {categories.map((cat) => {
              const inCat = tools.filter((x) => x.categoryId === cat.id);
              if (!inCat.length) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                    <h3 className="text-xl font-bold">
                      <Link href={`/tools/category/${cat.slug}`} className="hover:text-accent-2">
                        {cat.name}
                      </Link>
                    </h3>
                    <Link href={`/tools/category/${cat.slug}`} className="text-sm font-semibold text-accent-2 hover:underline">
                      {tc("viewAll")} ({tc("toolCount", { count: inCat.length })})
                    </Link>
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {inCat.slice(0, 4).map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <AdSlot {...ads.slot("home-mid")} />

        {servicesHref && (
          <section aria-labelledby="services-teaser" data-reveal className="relative mt-24 overflow-hidden rounded-[2rem] bg-cream p-8 text-ink sm:p-12">
            <span aria-hidden="true" data-float className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-berry" />
            <span aria-hidden="true" className="pointer-events-none absolute end-24 -bottom-8 hidden size-20 rounded-2xl bg-plum sm:block" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold tracking-[0.14em] text-berry uppercase">Nexoraat</p>
              <h2 id="services-teaser" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("servicesTitle")}
              </h2>
              <p className="mt-3 text-lg text-ink/80">{t("servicesBody")}</p>
              <Link href={servicesHref} className="btn mt-6 bg-ink text-cream hover:bg-plum">
                {t("servicesCta")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section aria-labelledby="recent" className="mt-24">
            <SectionHead id="recent" eyebrow={tc("tools")} title={t("recent")} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="how" className="mt-24">
          <SectionHead id="how" eyebrow="01 · 02 · 03" title={t("howTitle")} />
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} data-reveal className="card p-6">
                <span className="text-5xl font-extrabold text-accent-2" aria-hidden="true">
                  0{n}
                </span>
                <h3 className="mt-4 text-lg font-bold">{t(`how${n}Title` as "how1Title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`how${n}Body` as "how1Body")}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="guides" className="mt-24">
          <div className="flex items-end justify-between gap-4">
            <SectionHead id="guides" eyebrow={tc("blog")} title={t("articles")} />
            {articles.total > 0 && (
              <Link href="/blog" className="text-sm font-semibold text-accent-2 hover:underline">
                {tc("viewAll")}
              </Link>
            )}
          </div>
          {articles.items.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {articles.items.map((a) => (
                <ArticleCard key={a.id} article={a} locale={locale} readLabel={tc("minRead", { count: a.readingTimeMinutes })} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted">{t("noArticles")}</p>
          )}
        </section>

        <section aria-labelledby="trust" className="mt-24">
          <SectionHead id="trust" eyebrow={settings.siteName} title={t("trustTitle")} />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map(({ icon: Icon, title, body }) => (
              <li key={title} data-reveal className="card p-6">
                <span className="icon-tile">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function SectionHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-extrabold tracking-tight">
        {title}
      </h2>
    </div>
  );
}
