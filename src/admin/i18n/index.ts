import { en, type AdminKey } from "./en";
import { fr } from "./fr";
import { ar } from "./ar";

export type { AdminKey };
export type AdminLocale = "en" | "fr" | "ar";

const DICTS = { en, fr, ar } as const;

export type AdminT = (key: AdminKey, vars?: Record<string, string | number>) => string;

export function adminT(locale: AdminLocale): AdminT {
  const dict = DICTS[locale] ?? en;
  return (key, vars) => {
    let s: string = dict[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export const LOCALE_LABELS: Record<AdminLocale, string> = { en: "English", fr: "Français", ar: "العربية" };
