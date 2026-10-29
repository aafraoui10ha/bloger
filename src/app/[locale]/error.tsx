"use client";

import { useTranslations } from "next-intl";

/** Error boundary: never shows stack traces or internal details to visitors. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  return (
    <div className="container-page py-20 text-center">
      <meta name="robots" content="noindex" />
      <p className="text-6xl font-bold text-accent">500</p>
      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{t("body")}</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        {t("retry")}
      </button>
    </div>
  );
}
