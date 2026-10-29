"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  consentModeSignals,
  effectiveConsent,
  serializeConsent,
  type ConsentState,
} from "@/lib/consent";

export type ConsentConfig = {
  mode: "BUILT_IN" | "EXTERNAL_CMP";
  bannerEnabled: boolean;
  policyVersion: number;
  gaMeasurementId: string | null;
};

type Ctx = {
  config: ConsentConfig;
  consent: ConsentState | null;
  ready: boolean;
  save: (choice: { analytics: boolean; ads: boolean }) => void;
  openPreferences: () => void;
  /** Whether advertising scripts may load under the current consent configuration. */
  adsAllowed: boolean;
};

const ConsentCtx = createContext<Ctx | null>(null);

export function useConsent(): Ctx {
  const ctx = useContext(ConsentCtx);
  if (!ctx) throw new Error("useConsent must be used inside ConsentProvider");
  return ctx;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? m[1]! : null;
}

function loadScript(id: string, src: string, attrs: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

export function ConsentProvider({ config, children }: { config: ConsentConfig; children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from first-party cookie
    setConsent(effectiveConsent(readCookie(CONSENT_COOKIE), config.policyVersion));
    setReady(true);
  }, [config.policyVersion]);

  // Apply consent: update Consent Mode signals and load analytics only when granted.
  useEffect(() => {
    if (!ready) return;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }
    window.gtag("consent", "update", consentModeSignals(consent));
    const analytics = !!consent?.analytics && !!config.gaMeasurementId;
    window.__taAnalyticsGranted = analytics;
    if (analytics && config.gaMeasurementId) {
      loadScript("ga-gtag", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`);
      window.gtag("js", new Date());
      window.gtag("config", config.gaMeasurementId, { send_page_view: true });
    }
  }, [consent, ready, config.gaMeasurementId]);

  const save = useCallback(
    (choice: { analytics: boolean; ads: boolean }) => {
      const state: ConsentState = { version: config.policyVersion, ...choice, decidedAt: Math.floor(Date.now() / 1000) };
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CONSENT_COOKIE}=${serializeConsent(state)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
      setConsent(state);
      setPanelOpen(false);
      // Withdrawing consent: reload so already-loaded optional scripts are removed.
      if (consent && ((consent.analytics && !choice.analytics) || (consent.ads && !choice.ads))) location.reload();
    },
    [config.policyVersion, consent],
  );

  const adsAllowed = ready && (config.mode === "EXTERNAL_CMP" || !!consent?.ads);

  const value = useMemo<Ctx>(
    () => ({ config, consent, ready, save, openPreferences: () => setPanelOpen(true), adsAllowed }),
    [config, consent, ready, save, adsAllowed],
  );

  const showBanner = ready && config.bannerEnabled && config.mode === "BUILT_IN" && consent === null;

  return (
    <ConsentCtx.Provider value={value}>
      {children}
      {(showBanner || panelOpen) && <ConsentBanner initialExpanded={panelOpen} onClose={consent ? () => setPanelOpen(false) : undefined} />}
    </ConsentCtx.Provider>
  );
}

function Toggle({ id, checked, onChange, label, description, disabled }: { id: string; checked: boolean; onChange?: (v: boolean) => void; label: string; description: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-desc`} className="text-xs text-muted">
          {description}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-describedby={`${id}-desc`}
        className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </div>
  );
}

export function ConsentPreferences({ onSaved }: { onSaved?: () => void }) {
  const { consent } = useConsent();
  return <PreferencesForm key={consent ? serializeConsent(consent) : "none"} onSaved={onSaved} />;
}

function PreferencesForm({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations("consent");
  const { consent, save, config } = useConsent();
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [ads, setAds] = useState(consent?.ads ?? false);

  return (
    <div>
      <Toggle id="c-necessary" checked disabled label={t("necessary")} description={t("necessaryDesc")} />
      <Toggle id="c-analytics" checked={analytics} onChange={setAnalytics} label={t("analytics")} description={t("analyticsDesc")} />
      {config.mode === "BUILT_IN" ? (
        <Toggle id="c-ads" checked={ads} onChange={setAds} label={t("ads")} description={t("adsDesc")} />
      ) : (
        <p className="border-t border-border py-3 text-xs text-muted">{t("externalCmp")}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            save({ analytics, ads: config.mode === "BUILT_IN" ? ads : false });
            onSaved?.();
          }}
        >
          {t("save")}
        </button>
      </div>
    </div>
  );
}

function ConsentBanner({ initialExpanded, onClose }: { initialExpanded: boolean; onClose?: () => void }) {
  const t = useTranslations("consent");
  const { save, config } = useConsent();
  const [expanded, setExpanded] = useState(initialExpanded);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (initialExpanded) headingRef.current?.focus();
  }, [initialExpanded]);

  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] sm:inset-x-auto sm:bottom-4 sm:end-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="consent-title" ref={headingRef} tabIndex={-1} className="text-base font-semibold">
          {expanded ? t("panelTitle") : t("title")}
        </h2>
        {onClose && (
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="×">
            ×
          </button>
        )}
      </div>
      {!expanded ? (
        <>
          <p className="mt-2 text-sm text-muted">{t("body")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Accept and reject are equally prominent, as regulators expect. */}
            <button type="button" className="btn-primary" onClick={() => save({ analytics: true, ads: config.mode === "BUILT_IN" })}>
              {t("acceptAll")}
            </button>
            <button type="button" className="btn-primary" onClick={() => save({ analytics: false, ads: false })}>
              {t("rejectAll")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setExpanded(true)}>
              {t("customize")}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2">
          <ConsentPreferences />
        </div>
      )}
    </section>
  );
}

/** Consent Mode v2 defaults; must run before any Google tag. */
export const consentDefaultsScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`;
