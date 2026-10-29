"use client";

import { saveAnalyticsAction } from "@/admin/actions/site";
import { ActionForm, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function AnalyticsForm({ a }: { a: { enabled: boolean; gaMeasurementId: string; searchConsoleVerification: string } }) {
  const t = useT();
  return (
    <ActionForm action={saveAnalyticsAction}>
      {(state) => (
        <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={a.enabled} /> {t("an.enabled")}</label>
          <div>
            <label className="label" htmlFor="gaMeasurementId">{t("an.measurementId")}</label>
            <input id="gaMeasurementId" name="gaMeasurementId" className="input font-mono" dir="ltr" placeholder="G-XXXXXXXXXX" defaultValue={a.gaMeasurementId} />
            <p className="hint">{t("an.measurementHint")}</p>
            <FieldError state={state} name="gaMeasurementId" />
          </div>
          <div>
            <label className="label" htmlFor="searchConsoleVerification">{t("an.searchConsole")}</label>
            <input id="searchConsoleVerification" name="searchConsoleVerification" className="input font-mono" dir="ltr" defaultValue={a.searchConsoleVerification} />
            <FieldError state={state} name="searchConsoleVerification" />
          </div>
          <SubmitButton>{t("c.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
