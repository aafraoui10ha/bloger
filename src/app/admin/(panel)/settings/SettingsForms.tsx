"use client";

import { useActionState } from "react";
import { runSchedulerAction, saveSettingsAction } from "@/admin/actions/site";
import { ActionForm, FieldError, FormMessage, SubmitButton, useT } from "@/admin/components/client";

type S = { siteName: string; taglineEn: string; taglineFr: string; taglineAr: string; contactEmail: string; organizationName: string; organizationLogoUrl: string; defaultLocale: string };

export function SettingsForm({ s }: { s: S }) {
  const t = useT();
  return (
    <ActionForm action={saveSettingsAction}>
      {(state) => (
        <>
          <div>
            <label className="label" htmlFor="siteName">{t("st.siteName")}</label>
            <input id="siteName" name="siteName" className="input" defaultValue={s.siteName} />
            <FieldError state={state} name="siteName" />
          </div>
          {(["En", "Fr", "Ar"] as const).map((l) => (
            <div key={l}>
              <label className="label" htmlFor={`tagline${l}`}>{t("st.tagline", { locale: l.toUpperCase() })}</label>
              <input id={`tagline${l}`} name={`tagline${l}`} className="input" dir={l === "Ar" ? "rtl" : "ltr"} defaultValue={s[`tagline${l}`]} />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="contactEmail">{t("st.contactEmail")}</label>
            <input id="contactEmail" name="contactEmail" type="email" className="input" dir="ltr" defaultValue={s.contactEmail} />
            <FieldError state={state} name="contactEmail" />
          </div>
          <div>
            <label className="label" htmlFor="organizationName">{t("st.orgName")}</label>
            <input id="organizationName" name="organizationName" className="input" defaultValue={s.organizationName} />
          </div>
          <div>
            <label className="label" htmlFor="organizationLogoUrl">{t("st.orgLogo")}</label>
            <input id="organizationLogoUrl" name="organizationLogoUrl" className="input" dir="ltr" placeholder="https://" defaultValue={s.organizationLogoUrl} />
            <FieldError state={state} name="organizationLogoUrl" />
          </div>
          <div>
            <label className="label" htmlFor="defaultLocale">{t("st.defaultLocale")}</label>
            <select id="defaultLocale" name="defaultLocale" className="input" defaultValue={s.defaultLocale}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <SubmitButton>{t("c.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RunScheduler() {
  const t = useT();
  const [state, action] = useActionState(runSchedulerAction, {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton className="btn-secondary">{t("st.runNow")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
