import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, clampDescription } from "@/lib/seo";
import { getPageBySlug, getPageSlugs, getSiteSettings } from "@/lib/content";
import { redirectOrNotFound } from "@/lib/not-found";
import { decodeParam } from "@/lib/urls";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { Breadcrumbs, PageHeader } from "@/components/site/ui";
import { RegisterAlternates } from "@/components/site/alternates";
import { ConsentPanelInline } from "@/components/consent/ConsentPanelInline";
import { ContactForm } from "@/components/site/ContactForm";
import { mailConfigured } from "@/lib/mail";
import { AgencyCard, ServicesSection } from "@/components/site/agency";

type Props = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPageBySlug(locale, decodeParam(slug));
  if (!page) return {};
  const { siteName } = await getSiteSettings();
  return buildMetadata({
    locale,
    title: page.seoTitle || page.title,
    description: page.seoDescription || clampDescription(stripHtml(page.contentHtml)),
    paths: Object.fromEntries(page.page.translations.map((t) => [t.locale, `/${t.slug}`])),
    siteName,
  });
}

/** Static pages (About, Services, Contact, Privacy, Terms, Cookies, Editorial, Corrections) managed in the dashboard. */
export default async function StaticPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const decoded = decodeParam(slug);
  const page = await getPageBySlug(locale, decoded);
  if (!page) return redirectOrNotFound(`/${locale}/${decoded}`);
  const [tc, settings, pageSlugs] = await Promise.all([getTranslations({ locale, namespace: "common" }), getSiteSettings(), getPageSlugs(locale)]);
  const alternates = Object.fromEntries(page.page.translations.map((t) => [t.locale, `/${t.slug}`]));
  const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(page.updatedAt);
  const key = page.page.key;
  const hrefOf = (k: string) => (pageSlugs[k] ? `/${pageSlugs[k].slug}` : null);
  const showForm = mailConfigured();

  const body = (
    <>
      <p className="text-sm text-muted">
        <time dateTime={page.updatedAt.toISOString()}>{tc("updatedOn", { date: updated })}</time>
      </p>
      <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.contentHtml) }} />
    </>
  );

  return (
    <>
      <RegisterAlternates value={alternates} />
      <PageHeader title={page.title}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: page.title }]} />
      </PageHeader>
      <div className="container-page py-12">
        {key === "contact" ? (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              {body}
              {settings.contactEmail && (
                <p className="card mt-8 p-5 text-lg">
                  <a href={`mailto:${settings.contactEmail}`} className="font-semibold text-accent-2 hover:underline" dir="ltr">
                    {settings.contactEmail}
                  </a>
                </p>
              )}
            </div>
            {showForm && (
              <div data-reveal>
                <ContactForm />
              </div>
            )}
          </div>
        ) : (
          body
        )}
        {key === "services" && <ServicesSection locale={locale} contactHref={hrefOf("contact")} form={showForm ? <ContactForm /> : undefined} />}
        {key === "about" && <AgencyCard locale={locale} servicesHref={hrefOf("services")} />}
        {page.page.key === "cookies" && (
          <div className="mt-10 max-w-xl">
            <ConsentPanelInline />
          </div>
        )}
      </div>
    </>
  );
}
