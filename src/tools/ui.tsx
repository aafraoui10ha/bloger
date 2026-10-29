"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, RotateCcw } from "lucide-react";
import { track } from "@/lib/analytics-client";

/** Fires tool_opened once, and returns a function that records tool_completed (once per result). */
export function useToolEvents(toolKey: string) {
  const completed = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => track("tool_opened", { tool: toolKey }), 1500);
    return () => clearTimeout(id);
  }, [toolKey]);
  return {
    complete: useCallback(
      (params: Record<string, string | number> = {}) => {
        if (completed.current) return;
        completed.current = true;
        track("tool_completed", { tool: toolKey, ...params });
      },
      [toolKey],
    ),
    reset: useCallback(() => {
      completed.current = false;
    }, []),
    downloaded: useCallback((format: string) => track("result_downloaded", { tool: toolKey, format }), [toolKey]),
  };
}

export function CopyButton({ value, disabled, className = "btn-secondary btn-sm" }: { value: string; disabled?: boolean; className?: string }) {
  const t = useTranslations("common");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(id);
  }, [state]);
  return (
    <button
      type="button"
      className={className}
      disabled={disabled || !value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setState("copied");
        } catch {
          setState("failed");
        }
      }}
    >
      {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? t("copied") : state === "failed" ? t("copyFailed") : t("copy")}</span>
    </button>
  );
}

export function ResetButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const t = useTranslations("common");
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={onClick} disabled={disabled}>
      <RotateCcw className="size-4" aria-hidden="true" />
      {t("reset")}
    </button>
  );
}

export function ErrorMessage({ children, id }: { children: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="alert-error mt-3">
      {children}
    </p>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function StatGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-border bg-surface-2 p-3">
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Locale-aware number formatting. Arabic pages use Western digits, as is common in Morocco. */
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-MA-u-nu-latn" : locale;
}

export function useNumberFormat(maximumFractionDigits = 6) {
  const locale = useLocale();
  const nf = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits });
  return (n: number) => nf.format(n);
}
