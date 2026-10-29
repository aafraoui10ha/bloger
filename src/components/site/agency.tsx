import { getTranslations } from "next-intl/server";
import { ArrowRight, Bot, ChartLine, ExternalLink, Globe, Megaphone, MessageCircle, PenTool, SearchCheck, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export const AGENCY_URL = "https://nexoraat.com";
const WHATSAPP_URL = "https://wa.me/212619043143";

const SERVICES: { key: string; icon: LucideIcon }[] = [
  { key: "web", icon: Globe },
  { key: "mobile", icon: Smartphone },
  { key: "design", icon: PenTool },
  { key: "seo", icon: SearchCheck },
  { key: "geo", icon: Sparkles },
  { key: "marketing", icon: Megaphone },
  { key: "ai", icon: Bot },
  { key: "analytics", icon: ChartLine },
];

/** Locale path prefix for links to the agency site, which is available in English and French. */
const agencyLocale = (locale: AppLocale) => (locale === "fr" ? "fr" : "en");

/** Service grid and call to action shown on the Services page. */
export async function ServicesSection({ locale, contactHref, form }: { locale: AppLocale; contactHref: string | null; form?: React.ReactNode }) {
  const t = await getTranslations({ locale, namespace: "services" });
  return (
    <>
      <section aria-labelledby="services-grid" className="mt-14">
        <div data-reveal>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="services-grid" className="mt-2 text-3xl font-extrabold tracking-tight">
            {t("gridTitle")}
          </h2>
        </div>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ key, icon: Icon }) => (
            <li key={key} data-reveal className="card card-hover group flex flex-col p-6">
              <span className="icon-tile transition-colors duration-300 group-hover:bg-berry">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`items.${key}.body`)}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {(t.raw(`items.${key}.points`) as string[]).map((p) => (
                  <li key={p} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
                    {p}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="services-cta" className="band relative mt-20 overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <span aria-hidden="true" data-float className="pointer-events-none absolute -end-12 -top-12 size-48 rounded-full bg-plum" />
        <span aria-hidden="true" data-float className="pointer-events-none absolute end-1/3 -bottom-10 hidden size-24 rounded-3xl bg-berry md:block" />
        <div className="relative grid gap-10 lg:grid-cols-2">
          <div data-reveal>
            <h2 id="services-cta" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-3 text-lg text-muted">{t("ctaBody")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {contactHref && !form && (
                <Link href={contactHref} className="btn-primary">
                  {t("ctaContact")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              )}
              <a href={`${AGENCY_URL}/${agencyLocale(locale)}/services`} rel="noopener" className="btn-secondary">
                {t("visitSite")}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
              <a href={WHATSAPP_URL} rel="noopener noreferrer" target="_blank" className="btn-ghost">
                <MessageCircle className="size-4" aria-hidden="true" />
                {t("whatsapp")}
              </a>
            </div>
          </div>
          {form && <div data-reveal>{form}</div>}
        </div>
      </section>
    </>
  );
}

/** "Built by Nexoraat" card shown on the About page. */
export async function AgencyCard({ locale, servicesHref }: { locale: AppLocale; servicesHref: string | null }) {
  const t = await getTranslations({ locale, namespace: "agency" });
  return (
    <section aria-labelledby="agency" data-reveal className="relative mt-12 max-w-3xl overflow-hidden rounded-[2rem] bg-cream p-8 text-ink">
      <span aria-hidden="true" data-float className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full bg-berry" />
      <div className="relative">
        <h2 id="agency" className="text-2xl font-extrabold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-3 max-w-xl text-ink/80">{t("body")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`${AGENCY_URL}/${agencyLocale(locale)}/about`} rel="noopener" className="btn bg-ink text-cream hover:bg-plum">
            {t("visit")}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          {servicesHref && (
            <Link href={servicesHref} className="btn border border-ink/30 text-ink hover:border-ink">
              {t("services")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
