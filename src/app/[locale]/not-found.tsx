import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });
  const tc = await getTranslations({ locale, namespace: "common" });
  return (
    <div className="container-page py-20 text-center">
      <title>{t("metaTitle")}</title>
      <meta name="robots" content="noindex" />
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{t("body")}</p>
      <form action={`/${locale}/search`} method="get" role="search" className="mx-auto mt-6 flex max-w-md gap-2">
        <label htmlFor="nf-q" className="sr-only">
          {tc("searchTools")}
        </label>
        <input id="nf-q" name="q" type="search" className="input" placeholder={tc("searchPlaceholder")} maxLength={100} />
        <button className="btn-primary">{tc("search")}</button>
      </form>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-secondary">
          {t("home")}
        </Link>
        <Link href="/tools" className="btn-secondary">
          {t("tools")}
        </Link>
      </div>
    </div>
  );
}
