/** Visitor consent state, stored in a first-party cookie. Pure helpers (client + server). */

export const CONSENT_COOKIE = "ta_consent";
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentState = {
  /** Policy version the visitor answered; a newer version re-asks. */
  version: number;
  analytics: boolean;
  ads: boolean;
  /** Unix seconds. */
  decidedAt: number;
};

export function serializeConsent(state: ConsentState): string {
  return `v${state.version}.a${state.analytics ? 1 : 0}.d${state.ads ? 1 : 0}.t${state.decidedAt}`;
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  const m = /^v(\d+)\.a([01])\.d([01])\.t(\d+)$/.exec(decodeURIComponent(raw));
  if (!m) return null;
  return { version: Number(m[1]), analytics: m[2] === "1", ads: m[3] === "1", decidedAt: Number(m[4]) };
}

/** Returns the stored state only when it answers the current policy version. */
export function effectiveConsent(raw: string | null | undefined, policyVersion: number): ConsentState | null {
  const state = parseConsent(raw);
  if (!state || state.version !== policyVersion) return null;
  return state;
}

/** Google Consent Mode v2 signals derived from the visitor's choices. */
export function consentModeSignals(state: ConsentState | null) {
  const analytics = state?.analytics ? "granted" : "denied";
  const ads = state?.ads ? "granted" : "denied";
  return {
    analytics_storage: analytics,
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  } as const;
}
