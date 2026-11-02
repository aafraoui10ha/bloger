"use client";

// "A new version is available" checks against the website's release endpoint.
// Notification only: nothing is downloaded or installed automatically.

export type LatestRelease = { version: string; channel: string; date: string | null; page: string };
export type UpdateCheck =
  | { state: "available"; current: string; latest: LatestRelease }
  | { state: "current"; current: string }
  | { state: "unconfigured" }
  | { state: "error"; message: string };

export const SITE_URL = (process.env.NEXT_PUBLIC_TOOLBOX_SITE_URL || "").replace(/\/+$/, "");
const DISMISSED_KEY = "toolbox:update-dismissed";

/** Compares MAJOR.MINOR.PATCH versions: >0 when a is newer than b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export async function checkForUpdate(current: string, site = SITE_URL, fetcher: typeof fetch = fetch): Promise<UpdateCheck> {
  if (!site) return { state: "unconfigured" };
  try {
    const res = await fetcher(`${site}/api/desktop/releases/latest?platform=windows-x86_64&channel=stable`, { cache: "no-store", credentials: "omit" });
    if (res.status === 404) return { state: "current", current };
    if (!res.ok) return { state: "error", message: `HTTP ${res.status}` };
    const body = (await res.json()) as Partial<LatestRelease>;
    if (typeof body.version !== "string" || !/^\d+\.\d+\.\d+$/.test(body.version)) return { state: "error", message: "Invalid response" };
    const latest: LatestRelease = { version: body.version, channel: String(body.channel ?? "stable"), date: body.date ?? null, page: typeof body.page === "string" && body.page.startsWith("https://") ? body.page : `${site}/desktop` };
    return compareVersions(latest.version, current) > 0 ? { state: "available", current, latest } : { state: "current", current };
  } catch (err) {
    return { state: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export function dismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function dismissVersion(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // Storage unavailable: the banner shows again next time.
  }
}

/** The download page in the user's language. */
export function downloadPage(latest: LatestRelease, locale: string): string {
  try {
    const u = new URL(latest.page);
    if (!/^\/(en|fr|ar)\//.test(u.pathname)) u.pathname = `/${locale}${u.pathname}`;
    return u.href;
  } catch {
    return latest.page;
  }
}
