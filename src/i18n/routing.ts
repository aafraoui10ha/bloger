import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // Every public URL carries its locale, so each language version is directly
  // reachable and crawlable. Only the bare "/" is redirected (by Accept-Language).
  localePrefix: "always",
});

export function isLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export function dirFor(locale: AppLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

/** BCP 47 tags used for Intl formatting and hreflang. */
export const localeTags: Record<AppLocale, string> = {
  en: "en",
  fr: "fr",
  ar: "ar",
};
