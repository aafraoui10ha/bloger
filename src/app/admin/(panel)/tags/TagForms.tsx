"use client";

import { deleteTagAction, saveTagAction } from "@/admin/actions/site";
import { ActionForm, ConfirmAction, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function NewTagForm({ locale }: { locale: string }) {
  const t = useT();
  return (
    <ActionForm action={saveTagAction} className="flex flex-wrap items-end gap-2" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label htmlFor="new-tag" className="label">{t("tag.new")}</label>
            <input id="new-tag" name="name" className="input w-64" dir="auto" />
            <FieldError state={state} name="name" />
          </div>
          <SubmitButton>{t("c.add")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function TagRowActions({ tag, others }: { tag: { id: string; name: string; locale: string }; others: { id: string; name: string }[] }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionForm action={saveTagAction} className="flex gap-1">
        <input type="hidden" name="id" value={tag.id} />
        <input type="hidden" name="locale" value={tag.locale} />
        <label className="sr-only" htmlFor={`tag-${tag.id}`}>{t("c.name")}</label>
        <input id={`tag-${tag.id}`} name="name" defaultValue={tag.name} className="input h-8 w-40 py-1" dir="auto" />
        <SubmitButton className="btn-secondary btn-sm">{t("c.save")}</SubmitButton>
      </ActionForm>
      <ConfirmAction action={deleteTagAction} label={t("c.delete")} title={t("c.delete")} body={t("c.confirmDelete")} hidden={{ id: tag.id }}>
        <div>
          <label className="label" htmlFor={`merge-${tag.id}`}>{t("tag.mergeInto")}</label>
          <select id={`merge-${tag.id}`} name="mergeInto" className="input">
            <option value="">{t("c.none")}</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </ConfirmAction>
    </div>
  );
}
