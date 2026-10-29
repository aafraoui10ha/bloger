"use client";

import { deleteMediaAction, updateMediaAction, uploadMediaAction } from "@/admin/actions/content";
import { ActionForm, ConfirmAction, SubmitButton, useT } from "@/admin/components/client";

export function UploadForm() {
  const t = useT();
  return (
    <ActionForm action={uploadMediaAction} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" resetOnSuccess>
      <div>
        <label className="label" htmlFor="file">{t("media.upload")}</label>
        <input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" required className="input" aria-describedby="upload-hint" />
      </div>
      <div>
        <label className="label" htmlFor="alt">{t("media.alt")}</label>
        <input id="alt" name="alt" className="input" dir="auto" aria-describedby="alt-hint" />
        <p id="alt-hint" className="hint">{t("media.altHint")}</p>
      </div>
      <div>
        <label className="label" htmlFor="caption">{t("media.caption")}</label>
        <input id="caption" name="caption" className="input" dir="auto" />
      </div>
      <SubmitButton>{t("media.upload")}</SubmitButton>
      <p id="upload-hint" className="hint md:col-span-4">{t("media.uploadHint")}</p>
    </ActionForm>
  );
}

export function MediaItemForms({ item, canDelete, inUse }: { item: { id: string; alt: string; caption: string }; canDelete: boolean; inUse: boolean }) {
  const t = useT();
  return (
    <div className="space-y-2">
      <ActionForm action={updateMediaAction} className="space-y-2">
        <input type="hidden" name="id" value={item.id} />
        <label className="sr-only" htmlFor={`alt-${item.id}`}>{t("media.alt")}</label>
        <input id={`alt-${item.id}`} name="alt" defaultValue={item.alt} placeholder={t("media.alt")} className="input h-8 py-1 text-xs" dir="auto" />
        <label className="sr-only" htmlFor={`cap-${item.id}`}>{t("media.caption")}</label>
        <input id={`cap-${item.id}`} name="caption" defaultValue={item.caption} placeholder={t("media.caption")} className="input h-8 py-1 text-xs" dir="auto" />
        <SubmitButton className="btn-secondary btn-sm">{t("c.save")}</SubmitButton>
      </ActionForm>
      {canDelete && (
        <ConfirmAction action={deleteMediaAction} label={t("c.delete")} title={t("c.delete")} body={inUse ? t("media.inUse") : t("c.confirmDelete")} hidden={{ id: item.id }} className="btn-ghost btn-sm text-danger" />
      )}
    </div>
  );
}
