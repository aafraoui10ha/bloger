"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { localeNames, locales, type AppLocale } from "@/i18n/routing";
import { useAlternates } from "./alternates";
import { track } from "@/lib/analytics-client";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const current = useLocale() as AppLocale;
  const pathname = usePathname();
  const search = useSearchParams();
  const alternates = useAlternates();
  const query = search.get("q");

  return (
    <nav aria-label={t("language")} className="flex items-center gap-1">
      <Languages className="size-4 text-muted" aria-hidden="true" />
      <ul className="flex items-center gap-0.5">
        {locales.map((l) => {
          // Pages with localized slugs register their alternates; others share paths.
          const target = alternates ? alternates[l] : pathname;
          const label = l.toUpperCase();
          if (l === current) {
            return (
              <li key={l}>
                <span aria-current="true" lang={l} title={localeNames[l]} className="rounded px-1.5 py-1 text-xs font-semibold text-accent">
                  {label}
                </span>
              </li>
            );
          }
          if (target === null || target === undefined) {
            return (
              <li key={l}>
                <span lang={l} title={`${localeNames[l]} — ${t("translationUnavailable")}`} className="cursor-not-allowed rounded px-1.5 py-1 text-xs text-muted/60">
                  {label}
                </span>
              </li>
            );
          }
          return (
            <li key={l}>
              <Link
                href={query && !alternates ? { pathname: target, query: { q: query } } : target}
                locale={l}
                hrefLang={l}
                lang={l}
                title={localeNames[l]}
                aria-label={localeNames[l]}
                onClick={() => track("language_changed", { from: current, to: l })}
                className="rounded px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
