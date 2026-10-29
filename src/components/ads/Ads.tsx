"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useConsent } from "@/components/consent/ConsentProvider";
import type { AdRenderMode } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ID = "adsbygoogle-js";

/**
 * Loads the AdSense script for a page that the server already determined is
 * eligible for live ads, once the visitor's consent configuration allows it.
 */
export function AdsLoader({ publisherId }: { publisherId: string }) {
  const { adsAllowed } = useConsent();
  useEffect(() => {
    if (!adsAllowed || document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
    document.head.appendChild(s);
  }, [adsAllowed, publisherId]);
  return null;
}

/**
 * One manual ad placement. Always labelled, always separated from tool
 * controls, with reserved height to avoid layout shift.
 */
export function AdSlot({
  mode,
  placementKey,
  publisherId,
  slotId,
  minHeight = 280,
  desktopOnly = false,
}: {
  mode: AdRenderMode;
  placementKey: string;
  publisherId?: string | null;
  slotId?: string | null;
  minHeight?: number;
  desktopOnly?: boolean;
}) {
  const t = useTranslations("ads");
  const { adsAllowed } = useConsent();
  const pushed = useRef(false);
  // Live slots render only once consent allows ad code; the push runs after the <ins> is in the DOM.
  const visible = mode === "placeholder" || (mode === "live" && adsAllowed);

  useEffect(() => {
    if (mode !== "live" || !adsAllowed || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or script failures must never break the page.
    }
  }, [mode, adsAllowed]);

  if (mode === "none" || !visible) return null;

  return (
    <aside
      aria-label={t("label")}
      className={`my-8 ${desktopOnly ? "hidden lg:block" : ""}`}
      data-ad-placement={placementKey}
    >
      <p className="mb-1 text-center text-[11px] uppercase tracking-wider text-muted">{t("label")}</p>
      {mode === "placeholder" ? (
        <div
          className="flex items-center justify-center rounded-lg border-2 border-dashed border-border-strong p-4 text-center text-xs text-muted"
          style={{ minHeight }}
        >
          {t("placeholder", { key: placementKey })}
        </div>
      ) : (
        <div style={{ minHeight }}>
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={publisherId ?? undefined}
            data-ad-slot={slotId ?? undefined}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </aside>
  );
}
