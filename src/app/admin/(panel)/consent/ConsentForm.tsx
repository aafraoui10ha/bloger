"use client";

import { saveConsentAction } from "@/admin/actions/site";
import { ActionForm, SubmitButton, useT } from "@/admin/components/client";

export function ConsentForm({ c }: { c: { mode: string; bannerEnabled: boolean; policyVersion: number; externalCmpNotes: string } }) {
  const t = useT();
  return (
    <ActionForm action={saveConsentAction}>
      <fieldset>
        <legend className="label">{t("cs.mode")}</legend>
        {(["BUILT_IN", "EXTERNAL_CMP"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value={m} defaultChecked={c.mode === m} /> {t(`cs.mode.${m}`)}</label>
        ))}
        <p className="hint">{t("cs.modeHint")}</p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bannerEnabled" defaultChecked={c.bannerEnabled} /> {t("cs.banner")}</label>
      <p className="text-sm">{t("cs.version")}: <strong>{c.policyVersion}</strong></p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bump" /> {t("cs.bump")}</label>
      <div>
        <label className="label" htmlFor="externalCmpNotes">{t("cs.notes")}</label>
        <textarea id="externalCmpNotes" name="externalCmpNotes" rows={3} className="input" defaultValue={c.externalCmpNotes} />
      </div>
      <SubmitButton>{t("c.save")}</SubmitButton>
    </ActionForm>
  );
}
