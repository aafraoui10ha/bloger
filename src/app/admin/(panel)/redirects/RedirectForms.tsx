"use client";

import { deleteRedirectAction, saveRedirectAction } from "@/admin/actions/site";
import { ActionForm, ConfirmAction, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function NewRedirectForm() {
  const t = useT();
  return (
    <ActionForm action={saveRedirectAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end" resetOnSuccess>
      {(state) => (
        <>
          <div>
            <label className="label" htmlFor="fromPath">{t("rd.from")}</label>
            <input id="fromPath" name="fromPath" className="input font-mono text-xs" dir="ltr" placeholder="/en/blog/old-slug" />
            <FieldError state={state} name="fromPath" />
          </div>
          <div>
            <label className="label" htmlFor="toPath">{t("rd.to")}</label>
            <input id="toPath" name="toPath" className="input font-mono text-xs" dir="ltr" placeholder="/en/blog/new-slug" />
            <FieldError state={state} name="toPath" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="permanent" defaultChecked /> {t("rd.permanent")}</label>
          <SubmitButton>{t("c.add")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DeleteRedirect({ id }: { id: string }) {
  const t = useT();
  return <ConfirmAction action={deleteRedirectAction} label={t("c.delete")} title={t("c.delete")} body={t("c.confirmDelete")} hidden={{ id }} className="btn-ghost btn-sm text-danger" />;
}
