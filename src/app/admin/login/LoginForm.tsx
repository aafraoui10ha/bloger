"use client";

import { loginAction } from "@/admin/actions/auth";
import { ActionForm, SubmitButton, useT } from "@/admin/components/client";

export function LoginForm({ next }: { next: string }) {
  const t = useT();
  return (
    <ActionForm action={loginAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          {t("auth.email")}
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" dir="ltr" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("auth.password")}
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" dir="ltr" />
      </div>
      <SubmitButton className="btn-primary w-full" pendingLabel={t("auth.signingIn")}>
        {t("auth.signIn")}
      </SubmitButton>
    </ActionForm>
  );
}
