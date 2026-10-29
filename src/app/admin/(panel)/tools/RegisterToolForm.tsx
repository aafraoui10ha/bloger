"use client";

import { registerToolAction } from "@/admin/actions/content";
import { ActionForm, SubmitButton, useT } from "@/admin/components/client";

export function RegisterToolForm({ modules }: { modules: string[] }) {
  const t = useT();
  return (
    <ActionForm action={registerToolAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="moduleKey">{t("tool.module")}</label>
        <select id="moduleKey" name="moduleKey" className="input w-64">
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <SubmitButton>{t("tool.add")}</SubmitButton>
    </ActionForm>
  );
}
