"use client";

import { restoreRevisionAction } from "@/admin/actions/articles";
import { ConfirmAction, useT } from "@/admin/components/client";

export function RestoreRevision({ revisionId }: { revisionId: string }) {
  const t = useT();
  return <ConfirmAction action={restoreRevisionAction} label={t("c.restore")} title={t("c.restore")} body={t("art.restoreConfirm")} hidden={{ revisionId }} className="btn-secondary btn-sm" />;
}
