/** Canonical public origin without trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Hard environment kill-switch for live ads (defaults to off). */
export function liveAdsAllowedByEnv(): boolean {
  return process.env.ADS_ALLOW_LIVE === "true" && isProduction();
}
