// Nexoraat (the agency behind Toolbox): links shared by the website and the desktop app.
export const AGENCY_URL = "https://nexoraat.com";
export const WHATSAPP_URL = "https://wa.me/212619043143";

/** The agency site is available in English and French; Arabic visitors get English. */
export function agencyUrl(locale: string): string {
  return `${AGENCY_URL}/${locale === "fr" ? "fr" : "en"}`;
}
