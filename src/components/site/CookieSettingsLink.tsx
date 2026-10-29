"use client";

import { useTranslations } from "next-intl";
import { useConsent } from "@/components/consent/ConsentProvider";

export function CookieSettingsLink() {
  const t = useTranslations("consent");
  const { openPreferences } = useConsent();
  return (
    <button type="button" onClick={openPreferences} className="text-start hover:text-fg">
      {t("panelTitle")}
    </button>
  );
}
