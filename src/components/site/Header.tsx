import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Mail, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getNavigation, getPageSlugs, getSiteSettings, navLabel } from "@/lib/content";
import { AGENCY_URL } from "./agency";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

/**
 * Two-row header: a thin utility strip (scrolls away) and the main navigation
 * row, which stays pinned to the top of the window.
 */
export async function Header({ locale, siteName }: { locale: AppLocale; siteName: string }) {
  const [t, tn, tf] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  const [nav, pages, settings] = await Promise.all([getNavigation("HEADER"), getPageSlugs(locale), getSiteSettings()]);
  const items = nav.length
    ? nav.map((n) => ({ href: n.href, label: navLabel(n, locale), external: n.external }))
    : [
        { href: "/tools", label: t("tools"), external: false },
        { href: "/blog", label: t("blog"), external: false },
      ];
  // Page links use each language's own slug, so they live here rather than in the navigation table.
  if (pages.services) items.push({ href: `/${pages.services.slug}`, label: tn("services"), external: false });
  if (pages.about) items.push({ href: `/${pages.about.slug}`, label: tn("about"), external: false });
  const contact = pages.contact ? { href: `/${pages.contact.slug}`, label: tn("contact"), external: false } : null;
  const linkClass =
    "relative rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-fg after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-cream after:transition-transform after:duration-300 hover:after:scale-x-100 rtl:after:origin-right";

  return (
    <>
      <div className="band band-ink border-b border-border text-xs">
        <div className="container-page flex h-10 items-center gap-4">
          <a href={AGENCY_URL} rel="noopener" className="font-semibold text-muted transition-colors hover:text-fg">
            {tf("builtBy", { name: "Nexoraat" })}
          </a>
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="hidden items-center gap-1.5 text-muted transition-colors hover:text-fg sm:inline-flex" dir="ltr">
              <Mail className="size-3.5" aria-hidden="true" />
              {settings.contactEmail}
            </a>
          )}
          <div className="ms-auto flex items-center gap-2">
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
            <span aria-hidden="true" className="h-4 w-px bg-border" />
            <ThemeToggle labels={{ theme: t("theme"), light: t("themeLight"), dark: t("themeDark"), system: t("themeSystem") }} />
          </div>
        </div>
      </div>

      <header className="band band-plum sticky top-0 z-40 border-b border-border">
        <div className="container-page flex h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight" aria-label={`${siteName} — ${t("home")}`}>
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-cream text-base font-extrabold text-ink">
              {siteName.slice(0, 1)}
            </span>
            <span className="text-lg">{siteName}</span>
          </Link>

          <nav aria-label={t("menu")} className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a href={item.href} rel="noopener noreferrer" className={linkClass}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1 lg:ms-0">
            <Link href="/search" className="btn-ghost size-10 p-0" aria-label={t("search")}>
              <Search className="size-5" aria-hidden="true" />
            </Link>
            {contact && (
              <Link href={contact.href} className="btn-primary ms-1 hidden lg:inline-flex">
                {contact.label}
              </Link>
            )}
            <MobileMenu items={contact ? [...items, contact] : items} labels={{ open: t("menu"), close: t("closeMenu") }} />
          </div>
        </div>
      </header>
    </>
  );
}
