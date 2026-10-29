"use client";

import { useActionState } from "react";
import { createUserAction, resetLinkAction, revokeSessionsAction, updateUserAction } from "@/admin/actions/users";
import { ActionForm, FieldError, FormMessage, OneTimeSecret, SubmitButton, useT } from "@/admin/components/client";

export function NewUserForm({ roles }: { roles: readonly string[] }) {
  const t = useT();
  return (
    <ActionForm action={createUserAction} className="space-y-3" resetOnSuccess>
      {(state) => (
        <>
          <div className="grid gap-3 md:grid-cols-4 md:items-end">
            <div>
              <label className="label" htmlFor="nu-name">{t("c.name")}</label>
              <input id="nu-name" name="name" className="input" />
              <FieldError state={state} name="name" />
            </div>
            <div>
              <label className="label" htmlFor="nu-email">{t("c.email")}</label>
              <input id="nu-email" name="email" type="email" className="input" dir="ltr" />
              <FieldError state={state} name="email" />
            </div>
            <div>
              <label className="label" htmlFor="nu-role">{t("c.role")}</label>
              <select id="nu-role" name="role" className="input" defaultValue="AUTHOR">
                {roles.map((r) => <option key={r} value={r}>{t(`role.${r}` as "role.AUTHOR")}</option>)}
              </select>
              <FieldError state={state} name="role" />
            </div>
            <SubmitButton>{t("c.create")}</SubmitButton>
          </div>
          {state.ok && state.data?.link && <OneTimeSecret value={state.data.link} />}
        </>
      )}
    </ActionForm>
  );
}

export function UserRowActions({ u, roles, self }: { u: { id: string; name: string; role: string; isActive: boolean }; roles: readonly string[]; self: boolean }) {
  const t = useT();
  const [linkState, linkAction] = useActionState(resetLinkAction, {});
  const [revokeState, revokeAction] = useActionState(revokeSessionsAction, {});
  return (
    <div className="space-y-2">
      <ActionForm action={updateUserAction} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="id" value={u.id} />
        <input type="hidden" name="name" value={u.name} />
        <label className="sr-only" htmlFor={`role-${u.id}`}>{t("c.role")}</label>
        <select id={`role-${u.id}`} name="role" defaultValue={u.role} disabled={self} className="input h-8 w-40 py-1 text-xs">
          {roles.map((r) => <option key={r} value={r}>{t(`role.${r}` as "role.AUTHOR")}</option>)}
        </select>
        {self && <input type="hidden" name="role" value={u.role} />}
        <label className="sr-only" htmlFor={`active-${u.id}`}>{t("c.status")}</label>
        <select id={`active-${u.id}`} name="isActive" defaultValue={String(u.isActive)} disabled={self} className="input h-8 w-28 py-1 text-xs">
          <option value="true">{t("usr.activate")}</option>
          <option value="false">{t("usr.deactivate")}</option>
        </select>
        {self && <input type="hidden" name="isActive" value="true" />}
        <SubmitButton className="btn-secondary btn-sm" disabled={self}>{t("c.save")}</SubmitButton>
      </ActionForm>
      <div className="flex flex-wrap gap-1">
        <form action={linkAction}>
          <input type="hidden" name="id" value={u.id} />
          <SubmitButton className="btn-ghost btn-sm">{t("usr.resetLink")}</SubmitButton>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="id" value={u.id} />
          <SubmitButton className="btn-ghost btn-sm">{t("usr.revokeSessions")}</SubmitButton>
        </form>
      </div>
      {linkState.data?.link && <OneTimeSecret value={linkState.data.link} />}
      <FormMessage state={linkState.error ? linkState : revokeState} />
    </div>
  );
}
