/** Canonical public origin without trailing slash. */
export function siteUrl(): string {
  // On Vercel, fall back to the project's production domain if NEXT_PUBLIC_SITE_URL was forgotten,
  // so canonical links and the sitemap never point at localhost in production.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Hard environment kill-switch for live ads (defaults to off). */
export function liveAdsAllowedByEnv(): boolean {
  return process.env.ADS_ALLOW_LIVE === "true" && isProduction();
}
