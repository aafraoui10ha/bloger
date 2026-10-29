"use client";

import { useActionState } from "react";
import { bulkArticlesAction } from "@/admin/actions/articles";
import { FormMessage, SubmitButton, useT } from "@/admin/components/client";

export function BulkBar({ canPublish, canDelete, formId }: { canPublish: boolean; canDelete: boolean; formId: string }) {
  const t = useT();
  const [state, action] = useActionState(bulkArticlesAction, {});
  if (!canPublish && !canDelete) return null;
  return (
    <form
      id={formId}
      action={action}
      className="mb-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "delete" && !window.confirm(t("c.confirmDelete"))) e.preventDefault();
      }}
    >
      {canPublish && <SubmitButton className="btn-secondary btn-sm" name="op" value="publish">{t("art.bulkPublish")}</SubmitButton>}
      {canPublish && <SubmitButton className="btn-secondary btn-sm" name="op" value="archive">{t("art.bulkArchive")}</SubmitButton>}
      {canDelete && <SubmitButton className="btn-danger btn-sm" name="op" value="delete">{t("art.bulkDelete")}</SubmitButton>}
      <FormMessage state={state} />
    </form>
  );
}
