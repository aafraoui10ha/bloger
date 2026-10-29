"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConsentPreferences, useConsent } from "./ConsentProvider";

/** Cookie settings panel embedded on the Cookie Settings page. */
export function ConsentPanelInline() {
  const t = useTranslations("consent");
  const { consent, ready } = useConsent();
  const [saved, setSaved] = useState(false);
  return (
    <section aria-labelledby="cookie-panel" className="card p-5">
      <h2 id="cookie-panel" className="text-lg font-semibold">
        {t("panelTitle")}
      </h2>
      {ready && (
        <p className="mt-1 text-sm text-muted">
          {consent
            ? `${t("currentChoice")}: ${t("analytics")} — ${consent.analytics ? t("on") : t("off")}, ${t("ads")} — ${consent.ads ? t("on") : t("off")}`
            : t("noChoice")}
        </p>
      )}
      <div className="mt-3">
        <ConsentPreferences onSaved={() => setSaved(true)} />
      </div>
      <p role="status" className="mt-3 text-sm text-success">
        {saved ? t("saved") : ""}
      </p>
    </section>
  );
}
