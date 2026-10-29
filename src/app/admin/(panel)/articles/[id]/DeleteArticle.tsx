"use client";

import { deleteArticleAction } from "@/admin/actions/articles";
import { ConfirmAction, useT } from "@/admin/components/client";

export function DeleteArticle({ id }: { id: string }) {
  const t = useT();
  return (
    <ConfirmAction action={deleteArticleAction} label={t("c.delete")} title={t("art.deleteTitle")} body={t("c.confirmDelete")} hidden={{ id }} confirmLabel={t("c.delete")} className="btn-ghost btn-sm w-full text-danger">
      <div>
        <label htmlFor="redirectTo" className="label">{t("art.deleteRedirect")}</label>
        <input id="redirectTo" name="redirectTo" className="input" dir="ltr" placeholder="/en/blog" />
        <p className="hint">{t("art.deleteRedirectHint")}</p>
      </div>
    </ConfirmAction>
  );
}
