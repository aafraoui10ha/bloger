import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getNavigation, getPageSlugs, listCategories, navLabel } from "@/lib/content";
import { CookieSettingsLink } from "./CookieSettingsLink";

export async function Footer({ locale, siteName }: { locale: AppLocale; siteName: string }) {
  const [t, tn, tc] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const [pages, categories, footerNav, social] = await Promise.all([
    getPageSlugs(locale),
    listCategories(locale, "TOOL"),
    getNavigation("FOOTER"),
    getNavigation("SOCIAL"),
  ]);

  const pageLink = (key: string, label: string) => {
    const p = pages[key];
    return p ? (
      <li key={key}>
        <Link href={`/${p.slug}`} className="transition-colors hover:text-fg">
          {label}
        </Link>
      </li>
    ) : null;
  };

  return (
    <footer className="band mt-24">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2.5 text-lg font-bold">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-cream text-base font-extrabold text-ink">
              {siteName.slice(0, 1)}
            </span>
            {siteName}
          </p>
          <p className="mt-2 text-sm text-muted">{t("about")}</p>
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
              {social.map((s) => (
                <li key={s.id}>
                  <a href={s.href} rel="noopener noreferrer me" target="_blank" className="transition-colors hover:text-fg">
                    {navLabel(s, locale)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-labelledby="footer-tools">
          <h2 id="footer-tools" className="eyebrow">
            {t("toolsHeading")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link href="/tools" className="transition-colors hover:text-fg">
                {tc("allTools")}
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/tools/category/${c.slug}`} className="transition-colors hover:text-fg">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-site">
          <h2 id="footer-site" className="eyebrow">
            {t("siteHeading")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link href="/blog" className="transition-colors hover:text-fg">
                {tc("blog")}
              </Link>
            </li>
            {pageLink("services", tn("services"))}
            {pageLink("about", tn("about"))}
            {pageLink("contact", tn("contact"))}
            {pageLink("editorial-policy", tn("editorial"))}
            {pageLink("corrections", tn("corrections"))}
            {footerNav.map((n) => (
              <li key={n.id}>
                {n.external ? (
                  <a href={n.href} rel="noopener noreferrer" className="transition-colors hover:text-fg">
                    {navLabel(n, locale)}
                  </a>
                ) : (
                  <Link href={n.href} className="transition-colors hover:text-fg">
                    {navLabel(n, locale)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="eyebrow">
            {t("legalHeading")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {pageLink("privacy", tn("privacy"))}
            {pageLink("terms", tn("terms"))}
            {pageLink("cookies", tn("cookies"))}
            <li>
              <CookieSettingsLink />
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>
            {t("rights", { year: new Date().getFullYear(), name: siteName })}{" "}
            <a href="https://nexoraat.com" rel="noopener" className="font-semibold text-fg underline-offset-4 hover:underline">
              {t("builtBy", { name: "Nexoraat" })}
            </a>
          </p>
          <p className="max-w-xl">{t("adsNote")}</p>
        </div>
      </div>
    </footer>
  );
}
