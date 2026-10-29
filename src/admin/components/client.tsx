"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { AdminDict, AdminKey } from "@/admin/i18n/en";
import type { ActionState } from "@/admin/server";

const I18nCtx = createContext<AdminDict | null>(null);

export function AdminI18nProvider({ dict, children }: { dict: AdminDict; children: ReactNode }) {
  return <I18nCtx.Provider value={dict}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const dict = useContext(I18nCtx);
  return (key: AdminKey, vars?: Record<string, string | number>) => {
    let s: string = dict?.[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function SubmitButton({ children, className = "btn-primary", pendingLabel, name, value, disabled }: { children: ReactNode; className?: string; pendingLabel?: string; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value} aria-disabled={pending}>
      {pending ? (pendingLabel ?? t("c.saving")) : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  const t = useT();
  if (state.error) {
    return (
      <p role="alert" className="alert-error">
        {t(state.error)}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="alert-success">
        {t(state.message, state.data)}
      </p>
    );
  }
  return null;
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const t = useT();
  const key = state.fieldErrors?.[name];
  if (!key) return null;
  return (
    <p id={`${name}-error`} className="mt-1 text-xs text-danger">
      {t(key)}
    </p>
  );
}

type FormAction = (state: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Form bound to a server action with pending, success and error feedback.
 * Children may be a render function receiving the latest state (for field errors).
 */
export function ActionForm({ action, children, className = "space-y-4", resetOnSuccess = false, id }: { action: FormAction; children: ReactNode | ((s: ActionState) => ReactNode); className?: string; resetOnSuccess?: boolean; id?: string }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id} noValidate>
      {typeof children === "function" ? children(state) : children}
      <FormMessage state={state} />
    </form>
  );
}

/** Accessible confirmation dialog (native <dialog>: focus trap and Escape handling built in). */
export function ConfirmAction({
  action,
  label,
  title,
  body,
  hidden,
  confirmLabel,
  className = "btn-danger btn-sm",
  children,
}: {
  action: FormAction;
  label: ReactNode;
  title: string;
  body?: string;
  hidden?: Record<string, string>;
  confirmLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, {});
  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state]);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog ref={ref} className="m-auto w-[min(32rem,92vw)] rounded-xl border border-border bg-surface p-0 text-fg shadow-xl backdrop:bg-black/40" aria-labelledby="confirm-title">
        <form action={formAction} className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {body && <p className="text-sm text-muted">{body}</p>}
          {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {children}
          <FormMessage state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => ref.current?.close()}>
              {t("c.cancel")}
            </button>
            <SubmitButton className="btn-danger" pendingLabel={t("c.saving")}>
              {confirmLabel ?? t("c.confirm")}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Live character counter for SEO fields. */
export function CountedInput({ name, defaultValue, id, max, textarea, className = "input", dir }: { name: string; defaultValue?: string | null; id: string; max: number; textarea?: boolean; className?: string; dir?: string }) {
  const t = useT();
  const [len, setLen] = useState((defaultValue ?? "").length);
  const props = {
    id,
    name,
    defaultValue: defaultValue ?? "",
    maxLength: max + 40,
    className,
    dir,
    onChange: (e: { target: { value: string } }) => setLen(e.target.value.length),
    "aria-describedby": `${id}-count`,
  };
  return (
    <>
      {textarea ? <textarea rows={3} {...props} /> : <input {...props} />}
      <p id={`${id}-count`} className={`hint ${len > max ? "text-warning" : ""}`}>
        {t("c.chars", { count: len })}
      </p>
    </>
  );
}

/** Tabs for switching between locales of a translated entity. */
export function LocaleTabs({ locales, render, labels, initial }: { locales: string[]; render: (l: string) => ReactNode; labels: Record<string, ReactNode>; initial?: string }) {
  const [active, setActive] = useState(initial ?? locales[0]!);
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            id={`tab-${l}`}
            aria-selected={active === l}
            aria-controls={`panel-${l}`}
            onClick={() => setActive(l)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${active === l ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-fg"}`}
          >
            {labels[l]}
          </button>
        ))}
      </div>
      {locales.map((l) => (
        <div key={l} role="tabpanel" id={`panel-${l}`} aria-labelledby={`tab-${l}`} hidden={active !== l} className="pt-4">
          {render(l)}
        </div>
      ))}
    </div>
  );
}

export function OneTimeSecret({ value }: { value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="alert-warning space-y-2">
      <p className="font-medium">{t("usr.resetLinkCreated")}</p>
      <code className="block break-all rounded bg-surface p-2 text-xs text-fg" dir="ltr">
        {value}
      </code>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {});
          setCopied(true);
        }}
      >
        {copied ? t("c.saved") : t("c.copyLink")}
      </button>
    </div>
  );
}
