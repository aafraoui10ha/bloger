import { db } from "@/lib/db";
import { isValidPublisherId, validateAdsTxt } from "@/lib/ads";
import { isProduction, liveAdsAllowedByEnv, siteUrl } from "@/lib/env";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Badge, Card } from "@/admin/components/ui";
import type { AdminKey } from "@/admin/i18n";
import { AdSettingsForm, PlacementForm } from "./AdForms";

export default async function AdsPage() {
  const { t } = await adminContext("ads.manage");
  const [s, placements, consent] = await Promise.all([
    db.adSettings.findUnique({ where: { id: "default" } }),
    db.adPlacement.findMany({ orderBy: { key: "asc" } }),
    db.consentConfiguration.findUnique({ where: { id: "default" } }),
  ]);

  const reasons: AdminKey[] = [];
  if (!s?.masterEnabled) reasons.push("ads.r.master");
  if ((s?.mode ?? "TEST") === "TEST") reasons.push("ads.r.mode");
  if (!isValidPublisherId(s?.publisherId)) reasons.push("ads.r.publisher");
  if (!s?.ownerConfirmedAuthorized) reasons.push("ads.r.confirm");
  if (!liveAdsAllowedByEnv()) reasons.push(isProduction() ? "ads.r.env" : "ads.r.prod");
  const adsTxt = s?.adsTxt ? validateAdsTxt(s.adsTxt, s.publisherId) : null;

  const checklist: [string, boolean][] = [
    [t("ads.publisherId"), isValidPublisherId(s?.publisherId)],
    [t("ads.adsTxt"), !!adsTxt?.ok],
    [t("ads.consentStatus"), consent?.mode === "EXTERNAL_CMP" || !!consent?.bannerEnabled],
    [t("ads.ownerConfirmed"), !!s?.ownerConfirmedAuthorized],
    ["ADS_ALLOW_LIVE", liveAdsAllowedByEnv()],
  ];

  return (
    <>
      <AdminPageHeader title={t("ads.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("ads.title") }]} description={t("ads.intro")} />

      <Card title={t("ads.effective")} className="mb-6">
        {reasons.length === 0 ? (
          <p className="alert-success">{t("ads.liveOn")}</p>
        ) : (
          <div className="alert-warning">
            <p className="font-medium">{t("ads.liveOff")}</p>
            <p className="mt-1">{t("ads.reasons")}</p>
            <ul className="mt-1 list-disc ps-5">{reasons.map((r) => <li key={r}>{t(r)}</li>)}</ul>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">{t("ads.rules")}</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <AdSettingsForm
            s={{
              masterEnabled: s?.masterEnabled ?? false,
              mode: s?.mode ?? "TEST",
              siteHostname: s?.siteHostname ?? "",
              publisherId: s?.publisherId ?? "",
              autoAds: s?.autoAds ?? false,
              ownerConfirmedAuthorized: s?.ownerConfirmedAuthorized ?? false,
              approvalStatus: s?.approvalStatus ?? "NOT_APPLIED",
              approvalSource: s?.approvalSource ?? "",
              adsTxt: s?.adsTxt ?? "",
            }}
          />
          <div className="mt-4 text-sm">
            {!s?.adsTxt ? (
              <p className="text-muted">{t("ads.adsTxt")}: {t("ads.adsTxtEmpty")}</p>
            ) : adsTxt?.ok ? (
              <p className="text-success">{t("ads.adsTxtOk")}</p>
            ) : (
              <div className="alert-error"><p>{t("ads.adsTxtIssues")}</p><ul className="list-disc ps-5">{adsTxt?.issues.map((i) => <li key={i}><code>{i}</code></li>)}</ul></div>
            )}
            <p className="hint">{t("ads.adsTxtPublicCheck", { url: `${siteUrl()}/ads.txt` })}</p>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title={t("ads.checklist")}>
            <ul className="space-y-2 text-sm">
              {checklist.map(([label, ok]) => (
                <li key={label} className="flex items-start justify-between gap-2">
                  <span>{label}</span>
                  {ok ? <Badge tone="success">✓</Badge> : <Badge tone="warning">—</Badge>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t("ads.preview")}>
            <p className="hint mb-3">{t("ads.previewHint")}</p>
            {/* Labelled outlines of the article layout. Deliberately unlike real ads; no ad code. */}
            <div className="space-y-2 rounded-lg border border-border p-3 text-[10px] text-muted" aria-hidden="true">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              {placements.filter((p) => p.key.startsWith("article")).map((p) => (
                <div key={p.key}>
                  <div className="h-3 w-full rounded bg-surface-2" />
                  <div className={`mt-2 grid place-items-center rounded border border-dashed ${p.enabled ? "border-accent text-accent" : "border-border-strong"}`} style={{ height: Math.max(24, p.minHeight / 8) }}>{p.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title={t("ads.placements")} className="mt-6">
        <ul className="space-y-3">
          {placements.map((p) => (
            <li key={p.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">{p.label} <code className="text-xs text-muted">{p.key}</code></p>
              <PlacementForm p={{ id: p.id, slotId: p.slotId ?? "", enabled: p.enabled, minHeight: p.minHeight, desktopOnly: p.desktopOnly }} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
