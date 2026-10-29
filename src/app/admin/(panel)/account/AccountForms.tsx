"use client";

import { changePasswordAction, updateProfileAction } from "@/admin/actions/users";
import { ActionForm, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function ProfileForm({ me }: { me: { name: string; locale: string; bio: string } }) {
  const t = useT();
  return (
    <ActionForm action={updateProfileAction}>
      {(state) => (
        <>
          <div>
            <label className="label" htmlFor="name">{t("c.name")}</label>
            <input id="name" name="name" defaultValue={me.name} className="input" />
            <FieldError state={state} name="name" />
          </div>
          <div>
            <label className="label" htmlFor="locale">{t("acc.dashboardLanguage")}</label>
            <select id="locale" name="locale" defaultValue={me.locale} className="input">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bio">{t("acc.bio")}</label>
            <textarea id="bio" name="bio" rows={3} defaultValue={me.bio} className="input" dir="auto" />
          </div>
          <SubmitButton>{t("c.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  const t = useT();
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess>
      {(state) => (
        <>
          <div>
            <label className="label" htmlFor="current">{t("acc.currentPassword")}</label>
            <input id="current" name="current" type="password" autoComplete="current-password" className="input" dir="ltr" />
            <FieldError state={state} name="current" />
          </div>
          <div>
            <label className="label" htmlFor="password">{t("auth.newPassword")}</label>
            <input id="password" name="password" type="password" autoComplete="new-password" className="input" dir="ltr" />
            <FieldError state={state} name="password" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">{t("auth.confirmPassword")}</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" dir="ltr" />
            <FieldError state={state} name="confirm" />
          </div>
          <SubmitButton>{t("acc.changePassword")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
