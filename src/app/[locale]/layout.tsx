import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { dirFor, routing, type AppLocale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { getAnalyticsConfig, getConsentConfig, getSiteSettings } from "@/lib/content";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AlternatesProvider } from "@/components/site/alternates";
import { themeInitScript } from "@/components/site/ThemeToggle";
import { ConsentProvider, consentDefaultsScript } from "@/components/consent/ConsentProvider";
import { Motion, motionInitScript } from "@/components/site/Motion";
import "../globals.css";

const latin = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-latin", display: "swap" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", weight: ["400", "500", "600", "700"] });

// Public pages are cached and revalidated; dashboard mutations also purge them.
export const revalidate = 300;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#290044" },
    { media: "(prefers-color-scheme: dark)", color: "#290044" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [{ siteName }, analytics] = await Promise.all([getSiteSettings(), getAnalyticsConfig()]);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: siteName, template: `%s | ${siteName}` },
    applicationName: siteName,
    formatDetection: { telephone: false },
    ...(analytics.searchConsoleVerification ? { verification: { google: analytics.searchConsoleVerification } } : {}),
    other: { "content-language": locale },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const l = locale as AppLocale;

  const [settings, consent, analytics, t] = await Promise.all([
    getSiteSettings(),
    getConsentConfig(),
    getAnalyticsConfig(),
    getTranslations({ locale: l, namespace: "common" }),
  ]);

  return (
    <html lang={l} dir={dirFor(l)} className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
        <script dangerouslySetInnerHTML={{ __html: motionInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <ConsentProvider config={{ ...consent, gaMeasurementId: analytics.gaMeasurementId }}>
            <AlternatesProvider>
              <Header locale={l} siteName={settings.siteName} />
              <main id="main" className="flex-1" tabIndex={-1}>
                {children}
              </main>
              <Footer locale={l} siteName={settings.siteName} />
              <Motion />
            </AlternatesProvider>
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
