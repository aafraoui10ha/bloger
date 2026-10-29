"use client";

import Link from "next/link";
import { resetPasswordAction } from "@/admin/actions/auth";
import { ActionForm, FieldError, SubmitButton, useT } from "@/admin/components/client";

export function ResetForm({ token }: { token: string }) {
  const t = useT();
  return (
    <ActionForm action={resetPasswordAction} className="mt-6 space-y-4">
      {(state) =>
        state.ok ? (
          <Link href="/admin/login" className="btn-primary w-full">
            {t("auth.signIn")}
          </Link>
        ) : (
          <>
            <input type="hidden" name="token" value={token} />
            <div>
              <label htmlFor="password" className="label">
                {t("auth.newPassword")}
              </label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="input" dir="ltr" aria-describedby="password-hint" />
              <p id="password-hint" className="hint">
                {t("auth.pw.tooShort")} {t("auth.pw.tooSimple")}
              </p>
              <FieldError state={state} name="password" />
            </div>
            <div>
              <label htmlFor="confirm" className="label">
                {t("auth.confirmPassword")}
              </label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" dir="ltr" />
              <FieldError state={state} name="confirm" />
            </div>
            <SubmitButton className="btn-primary w-full">{t("auth.resetSubmit")}</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}
