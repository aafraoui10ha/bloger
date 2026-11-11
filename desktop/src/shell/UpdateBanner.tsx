"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Sparkles, X } from "lucide-react";
import { appInfo, isTauri, openExternal } from "./native";
import { checkForUpdate, dismissedVersion, dismissVersion, downloadPage, type UpdateCheck } from "./updates";

const FIRST_CHECK_MS = 8_000;
const RECHECK_MS = 6 * 60 * 60 * 1000;

/** Banner shown when the website publishes a newer version of the app. */
export function UpdateBanner() {
  const t = useTranslations("desktop.updates");
  const locale = useLocale();
  const [check, setCheck] = useState<Extract<UpdateCheck, { state: "available" }> | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    const run = async () => {
      const info = await appInfo().catch(() => null);
      if (!info || !alive) return;
      const result = await checkForUpdate(info.version);
      if (alive && result.state === "available" && dismissedVersion() !== result.latest.version) setCheck(result);
    };
    const first = setTimeout(run, FIRST_CHECK_MS);
    const every = setInterval(run, RECHECK_MS);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  if (!check) return null;
  return (
    <div role="status" className="band band-plum flex flex-wrap items-center gap-3 px-6 py-3 text-sm" data-testid="update-banner">
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <strong>{t("available", { version: check.latest.version })}</strong> <span className="text-muted">{t("current", { current: check.current })}</span>
      </p>
      <button type="button" className="btn-primary btn-sm" onClick={() => void openExternal(downloadPage(check.latest, locale))}>
        <Download className="size-4" aria-hidden="true" />
        {t("download")}
      </button>
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => {
          dismissVersion(check.latest.version);
          setCheck(null);
        }}
      >
        <X className="size-4" aria-hidden="true" />
        {t("later")}
      </button>
    </div>
  );
}
