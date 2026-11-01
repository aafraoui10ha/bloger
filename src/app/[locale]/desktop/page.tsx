import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileCheck2, Gauge, HardDrive, Languages, MonitorDown, RefreshCw, ShieldCheck, Sparkles, WifiOff, BarChart3, Scissors } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata, samePathEverywhere } from "@/lib/seo";
import { getSiteSettings } from "@/lib/content";
import { getDesktopRelease } from "@/lib/desktop-release";
import { formatBytes } from "@/tools/logic/image";
import { Breadcrumbs, PageHeader } from "@/components/site/ui";

type Props = { params: Promise<{ locale: AppLocale }> };

// Release details come from environment variables; re-read them regularly.
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, { siteName }] = await Promise.all([getTranslations({ locale, namespace: "desktopPage" }), getSiteSettings()]);
  return buildMetadata({ locale, title: t("metaTitle"), description: t("metaDescription"), paths: samePathEverywhere("/desktop"), siteName });
}

const FEATURES = [
  { key: "desktop", icon: MonitorDown },
  { key: "local", icon: ShieldCheck },
  { key: "designer", icon: BarChart3 },
  { key: "background", icon: Scissors },
  { key: "images", icon: Sparkles },
  { key: "offline", icon: WifiOff },
  { key: "fast", icon: Gauge },
  { key: "languages", icon: Languages },
] as const;

export default async function DesktopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations({ locale, namespace: "desktopPage" }), getTranslations({ locale, namespace: "common" })]);
  const release = getDesktopRelease();
  const exe = release?.installers.find((i) => i.format === "exe") ?? release?.installers[0];
  const date = release?.date ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(release.date)) : null;

  return (
    <>
      <PageHeader title={t("title")} intro={t("subtitle")}>
        <Breadcrumbs locale={locale} label={tc("breadcrumb")} items={[{ label: tc("home"), href: "/" }, { label: t("title") }]} />
      </PageHeader>

      <div className="container-page">
        {/* Hero actions and key facts */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-labelledby="desktop-intro">
          <div>
            <h2 id="desktop-intro" className="sr-only">
              {t("title")}
            </h2>
            <p className="max-w-2xl text-lg">{t("description")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {exe ? (
                <a href={exe.url} className="btn-primary" download data-testid="primary-download">
                  <Download className="size-4" aria-hidden="true" />
                  {t("downloadWindows")}
                </a>
              ) : (
                <p className="alert-info" data-testid="coming-soon">
                  {t("comingSoon")}
                </p>
              )}
              <a href="#release-notes" className="btn-secondary">
                {t("viewNotes")}
              </a>
              <a href="#install" className="btn-ghost">
                {t("installGuide")}
              </a>
            </div>
          </div>
          <dl className="card grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
            <dt className="text-muted">{t("facts.version")}</dt>
            <dd className="font-semibold">{release ? release.version : t("facts.notYet")}</dd>
            <dt className="text-muted">{t("facts.windows")}</dt>
            <dd className="font-semibold">{t("facts.windowsValue")}</dd>
            <dt className="text-muted">{t("facts.size")}</dt>
            <dd className="font-semibold">{exe ? formatBytes(exe.size, locale) : "—"}</dd>
            <dt className="text-muted">{t("facts.date")}</dt>
            <dd className="font-semibold">{date ?? "—"}</dd>
            <dt className="text-muted">{t("facts.price")}</dt>
            <dd className="font-semibold">{t("facts.free")}</dd>
          </dl>
        </section>

        {/* Download cards: only published, valid installers */}
        {release && (
          <section className="mt-12" aria-labelledby="downloads-h">
            <h2 id="downloads-h" className="text-2xl font-bold">
              {t("downloads")}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {release.installers.map((i) => (
                <article key={i.format} className="card flex flex-col gap-3 p-5" data-testid={`download-${i.format}`}>
                  <div className="flex items-center gap-3">
                    <span className="icon-tile size-10">
                      <MonitorDown className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{t(i.format === "exe" ? "exeTitle" : "msiTitle")}</h3>
                      <p className="text-sm text-muted">{t(i.format === "exe" ? "exeHint" : "msiHint")}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted">{t("card.platform")}</dt>
                    <dd>Windows 10 / 11</dd>
                    <dt className="text-muted">{t("card.arch")}</dt>
                    <dd>x64 (64-bit)</dd>
                    <dt className="text-muted">{t("card.format")}</dt>
                    <dd>.{i.format}</dd>
                    <dt className="text-muted">{t("card.version")}</dt>
                    <dd>
                      {release.version} · {t(`channels.${release.channel}`)}
                    </dd>
                    <dt className="text-muted">{t("card.size")}</dt>
                    <dd>{formatBytes(i.size, locale)}</dd>
                    <dt className="text-muted">{t("card.date")}</dt>
                    <dd>{date ?? "—"}</dd>
                  </dl>
                  <div>
                    <p className="text-xs text-muted">SHA-256</p>
                    <code className="block rounded-md bg-surface-2 p-2 font-mono text-xs break-all" dir="ltr">
                      {i.sha256}
                    </code>
                  </div>
                  <a href={i.url} download className="btn-primary mt-auto self-start">
                    <Download className="size-4" aria-hidden="true" />
                    {t("downloadFormat", { format: `.${i.format}` })}
                  </a>
                </article>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted">
              <FileCheck2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("verifyHint")}
            </p>
          </section>
        )}

        {/* Features */}
        <section className="mt-14" aria-labelledby="features-h">
          <h2 id="features-h" className="text-2xl font-bold">
            {t("featuresTitle")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ key, icon: Icon }) => (
              <div key={key} className="card p-5">
                <span className="icon-tile size-10">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`features.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section className="mt-14 grid gap-6 lg:grid-cols-2" aria-labelledby="req-h">
          <div>
            <h2 id="req-h" className="text-2xl font-bold">
              {t("requirementsTitle")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {(["os", "arch", "webview", "internet", "storage"] as const).map((k) => (
                <li key={k} className="flex gap-2">
                  <HardDrive className="mt-0.5 size-4 shrink-0 text-accent-2" aria-hidden="true" />
                  {t(`requirements.${k}`)}
                </li>
              ))}
            </ul>
            <p className="hint mt-3">{t("requirementsNote")}</p>
          </div>
          <div id="release-notes" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">{t("notesTitle")}</h2>
            {release ? (
              <article className="card mt-4 p-5">
                <h3 className="font-semibold">
                  {t("notesVersion", { version: release.version })} <span className="badge ms-2">{t(`channels.${release.channel}`)}</span>
                </h3>
                {date && <p className="text-sm text-muted">{date}</p>}
                <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
                  {(["n1", "n2", "n3", "n4", "n5"] as const).map((k) => (
                    <li key={k}>{t(`notes.${k}`)}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">{t("notesPlatforms")}</p>
              </article>
            ) : (
              <p className="mt-4 text-sm text-muted">{t("notesNone")}</p>
            )}
          </div>
        </section>

        {/* Installation guide */}
        <section id="install" className="mt-14 scroll-mt-24" aria-labelledby="install-h">
          <h2 id="install-h" className="text-2xl font-bold">
            {t("installTitle")}
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(["download", "verify", "run", "open", "update", "uninstall"] as const).map((k, i) => (
              <li key={k} className="card p-5">
                <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{t(`install.${k}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`install.${k}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Troubleshooting */}
        <section className="mt-14 mb-16" aria-labelledby="trouble-h">
          <h2 id="trouble-h" className="text-2xl font-bold">
            {t("troubleTitle")}
          </h2>
          <div className="mt-4 space-y-3">
            {(["smartscreen", "webview", "model", "update"] as const).map((k) => (
              <details key={k} className="card p-4">
                <summary className="flex cursor-pointer items-center gap-2 font-semibold">
                  <RefreshCw className="size-4 text-accent-2" aria-hidden="true" />
                  {t(`trouble.${k}.q`)}
                </summary>
                <p className="mt-2 text-sm text-muted">{t(`trouble.${k}.a`)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
