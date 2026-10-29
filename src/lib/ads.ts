/**
 * Advertising gate. Pure functions so every rule is unit-tested.
 * Live ad code loads only when ALL of these are true:
 *  - environment kill-switch ADS_ALLOW_LIVE=true and NODE_ENV=production
 *  - dashboard master switch on, mode LIVE
 *  - valid publisher ID
 *  - owner explicitly confirmed the site is authorized in their AdSense account
 *  - the page type is eligible and has substantial content
 *  - the placement is enabled, has a valid slot (and is allowed on that tool)
 *  - (client side) the visitor's consent state permits it
 */

export const PUBLISHER_ID_PATTERN = /^ca-pub-\d{16}$/;
export const SLOT_ID_PATTERN = /^\d{10}$/;

export type AdSettingsSnapshot = {
  masterEnabled: boolean;
  mode: "TEST" | "LIVE";
  publisherId: string | null;
  ownerConfirmedAuthorized: boolean;
  autoAds: boolean;
};

export type PageKind =
  | "home"
  | "tool"
  | "toolIndex"
  | "toolCategory"
  | "article"
  | "blogIndex"
  | "blogCategory"
  | "legal"
  | "search"
  | "auth"
  | "admin"
  | "error"
  | "preview";

/** Page kinds where ads are never shown (policy, private, thin or utility pages). */
const INELIGIBLE: ReadonlySet<PageKind> = new Set(["legal", "search", "auth", "admin", "error", "preview"]);

export type AdEnv = { liveAllowed: boolean; isProduction: boolean };

export type AdRenderMode = "none" | "placeholder" | "live";

export function isValidPublisherId(id: string | null | undefined): id is string {
  return !!id && PUBLISHER_ID_PATTERN.test(id);
}

export function isValidSlotId(id: string | null | undefined): id is string {
  return !!id && SLOT_ID_PATTERN.test(id);
}

/** Site-wide decision for a page (script loading, auto ads). */
export function pageAdMode(settings: AdSettingsSnapshot, page: { kind: PageKind; hasSubstantialContent: boolean }, env: AdEnv): AdRenderMode {
  if (INELIGIBLE.has(page.kind) || !page.hasSubstantialContent) return "none";
  if (!settings.masterEnabled || !isValidPublisherId(settings.publisherId)) return "none";
  if (settings.mode === "TEST") return env.isProduction ? "none" : "placeholder";
  if (!settings.ownerConfirmedAuthorized || !env.liveAllowed || !env.isProduction) return "none";
  return "live";
}

export type PlacementSnapshot = { key: string; enabled: boolean; slotId: string | null };

/** Decision for one manual placement on a page. */
export function placementAdMode(
  pageMode: AdRenderMode,
  placement: PlacementSnapshot | undefined,
  allowedForTool?: string[] | null,
): AdRenderMode {
  if (pageMode === "none" || !placement || !placement.enabled) return "none";
  if (allowedForTool && !allowedForTool.includes(placement.key)) return "none";
  if (pageMode === "live" && !isValidSlotId(placement.slotId)) return "none";
  return pageMode;
}

export type AdsTxtCheck = { ok: boolean; issues: string[] };

/**
 * Validates owner-supplied ads.txt text. It never generates seller records —
 * the exact line must come from the owner's AdSense account.
 */
export function validateAdsTxt(content: string, publisherId: string | null): AdsTxtCheck {
  const issues: string[] = [];
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) issues.push("empty");
  for (const line of lines) {
    if (/^(contact|subdomain|ownerdomain|managerdomain)=/i.test(line)) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3 || parts.length > 4) issues.push(`malformed:${line.slice(0, 60)}`);
    else if (!/^(DIRECT|RESELLER)$/i.test(parts[2]!)) issues.push(`relationship:${line.slice(0, 60)}`);
  }
  if (publisherId && isValidPublisherId(publisherId)) {
    const pub = publisherId.replace(/^ca-/, "");
    const hasGoogle = lines.some((l) => /^google\.com\s*,/i.test(l) && l.includes(pub));
    if (!hasGoogle) issues.push("publisherMismatch");
  }
  return { ok: issues.length === 0, issues };
}
