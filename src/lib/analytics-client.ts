/**
 * Consent-aware analytics events. Only whitelisted event names and short,
 * non-sensitive parameters (tool key, locale, format) are ever sent — never
 * user text, file contents, file names or results.
 */
export type AnalyticsEvent =
  | "tool_opened"
  | "tool_completed"
  | "result_downloaded"
  | "article_viewed"
  | "internal_search"
  | "language_changed";

type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __taAnalyticsGranted?: boolean;
  }
}

const SAFE_VALUE = /^[\w\-.:/ ]{0,60}$/;

export function sanitizeParams(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (!/^[a-z_]{1,30}$/.test(k)) continue;
    if (typeof v === "string" && !SAFE_VALUE.test(v)) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: AnalyticsEvent, params: Params = {}): void {
  if (typeof window === "undefined" || !window.__taAnalyticsGranted || typeof window.gtag !== "function") return;
  window.gtag("event", event, sanitizeParams(params));
}
