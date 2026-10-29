"use client";

import { saveAdSettingsAction, savePlacementAction } from "@/admin/actions/site";
import { ActionForm, FieldError, SubmitButton, useT } from "@/admin/components/client";

type S = { masterEnabled: boolean; mode: string; siteHostname: string; publisherId: string; autoAds: boolean; ownerConfirmedAuthorized: boolean; approvalStatus: string; approvalSource: string; adsTxt: string };

export function AdSettingsForm({ s }: { s: S }) {
  const t = useT();
  return (
    <ActionForm action={saveAdSettingsAction}>
      {(state) => (
        <>
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="masterEnabled" defaultChecked={s.masterEnabled} /> {t("ads.masterEnabled")}</label>
          <fieldset>
            <legend className="label">{t("ads.mode")}</legend>
            {(["TEST", "LIVE"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value={m} defaultChecked={s.mode === m} /> {t(`ads.mode.${m}`)}</label>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="siteHostname">{t("ads.siteHostname")}</label>
              <input id="siteHostname" name="siteHostname" className="input" dir="ltr" defaultValue={s.siteHostname} />
              <FieldError state={state} name="siteHostname" />
            </div>
            <div>
              <label className="label" htmlFor="publisherId">{t("ads.publisherId")}</label>
              <input id="publisherId" name="publisherId" className="input font-mono" dir="ltr" placeholder="ca-pub-0000000000000000" defaultValue={s.publisherId} aria-describedby="pub-hint" />
              <p id="pub-hint" className="hint">{t("ads.publisherIdHint")}</p>
              <FieldError state={state} name="publisherId" />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="autoAds" defaultChecked={s.autoAds} className="mt-1" /> <span>{t("ads.autoAds")}<span className="hint block">{t("ads.autoAdsHint")}</span></span></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="approvalStatus">{t("ads.approvalStatus")}</label>
              <select id="approvalStatus" name="approvalStatus" className="input" defaultValue={s.approvalStatus}>
                {(["NOT_APPLIED", "UNDER_REVIEW", "APPROVED", "REJECTED", "UNKNOWN"] as const).map((a) => <option key={a} value={a}>{t(`ads.ap.${a}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="approvalSource">{t("ads.approvalSource")}</label>
              <input id="approvalSource" name="approvalSource" className="input" defaultValue={s.approvalSource} aria-describedby="src-hint" />
              <p id="src-hint" className="hint">{t("ads.approvalSourceHint")}</p>
              <FieldError state={state} name="approvalSource" />
            </div>
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
            <input type="checkbox" name="ownerConfirmedAuthorized" defaultChecked={s.ownerConfirmedAuthorized} className="mt-1" /> {t("ads.ownerConfirmed")}
          </label>
          <FieldError state={state} name="ownerConfirmedAuthorized" />
          <div>
            <label className="label" htmlFor="adsTxt">{t("ads.adsTxt")}</label>
            <textarea id="adsTxt" name="adsTxt" rows={3} className="input font-mono text-xs" dir="ltr" defaultValue={s.adsTxt} placeholder="google.com, pub-…, DIRECT, …" aria-describedby="adstxt-hint" />
            <p id="adstxt-hint" className="hint">{t("ads.adsTxtHint")}</p>
          </div>
          <SubmitButton>{t("c.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PlacementForm({ p }: { p: { id: string; slotId: string; enabled: boolean; minHeight: number; desktopOnly: boolean } }) {
  const t = useT();
  return (
    <ActionForm action={savePlacementAction} className="flex flex-wrap items-end gap-3">
      {(state) => (
        <>
          <input type="hidden" name="id" value={p.id} />
          <div>
            <label className="label" htmlFor={`slot-${p.id}`}>{t("ads.slotId")}</label>
            <input id={`slot-${p.id}`} name="slotId" className="input w-40 font-mono" dir="ltr" defaultValue={p.slotId} />
            <FieldError state={state} name="slotId" />
          </div>
          <div>
            <label className="label" htmlFor={`h-${p.id}`}>{t("ads.minHeight")}</label>
            <input id={`h-${p.id}`} name="minHeight" type="number" min={50} max={1000} className="input w-28" defaultValue={p.minHeight} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={p.enabled} /> {t("c.enabled")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="desktopOnly" defaultChecked={p.desktopOnly} /> {t("ads.desktopOnly")}</label>
          <SubmitButton className="btn-secondary btn-sm">{t("c.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
