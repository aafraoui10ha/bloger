import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { liveAdsAllowedByEnv, isProduction } from "@/lib/env";
import { pageAdMode, placementAdMode, type AdRenderMode, type PageKind } from "@/lib/ads";
import { getAdState } from "@/lib/content";

export type PlacementProps = { mode: AdRenderMode; placementKey: string; publisherId: string | null; slotId: string | null; minHeight: number; desktopOnly: boolean };

export type PageAds = {
  pageMode: AdRenderMode;
  publisherId: string | null;
  slot: (key: string) => PlacementProps;
};

const placementMeta = cache(() => db.adPlacement.findMany({ select: { key: true, minHeight: true, desktopOnly: true } }));

/** Server-side ad decision for one page; returns serializable props per placement. */
export async function getPageAds(kind: PageKind, hasSubstantialContent: boolean, allowedForTool?: string[] | null): Promise<PageAds> {
  const [{ settings, placements }, meta] = await Promise.all([getAdState(), placementMeta()]);
  const pageMode = pageAdMode(settings, { kind, hasSubstantialContent }, { liveAllowed: liveAdsAllowedByEnv(), isProduction: isProduction() });
  return {
    pageMode,
    publisherId: pageMode === "live" ? settings.publisherId : null,
    slot: (key: string) => {
      const p = placements.find((x) => x.key === key);
      const m = meta.find((x) => x.key === key);
      return {
        mode: placementAdMode(pageMode, p, allowedForTool),
        placementKey: key,
        publisherId: pageMode === "live" ? settings.publisherId : null,
        slotId: p?.slotId ?? null,
        minHeight: m?.minHeight ?? 280,
        desktopOnly: m?.desktopOnly ?? false,
      };
    },
  };
}
