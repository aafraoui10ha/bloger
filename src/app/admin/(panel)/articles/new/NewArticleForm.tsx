"use client";

import { createArticleAction } from "@/admin/actions/articles";
import { ActionForm, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function NewArticleForm({ defaultLocale }: { defaultLocale: string }) {
  const t = useT();
  return (
    <ActionForm action={createArticleAction}>
      {(state) => (
        <>
          <div>
            <label htmlFor="title" className="label">{t("c.title")}</label>
            <input id="title" name="title" required maxLength={200} className="input" dir="auto" />
            <FieldError state={state} name="title" />
          </div>
          <div>
            <label htmlFor="locale" className="label">{t("art.initialLocale")}</label>
            <select id="locale" name="locale" defaultValue={defaultLocale} className="input">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <SubmitButton>{t("c.create")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
