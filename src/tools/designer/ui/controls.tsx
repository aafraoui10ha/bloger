"use client";

import { useId, useState, type ReactNode } from "react";
import { parseHex, rgbToHex } from "@/tools/logic/color";

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-wide text-muted uppercase">
        {title}
        <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(String(round(value)));
  // Follow outside changes (undo, dragging) without an effect.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(String(round(value)));
  }
  const commit = (s: string) => {
    const v = Number(s.replace(",", "."));
    if (!Number.isFinite(v)) return setDraft(String(round(value)));
    onChange(clamp(v, min, max));
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="input h-9 py-1 text-sm tabular-nums"
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value !== "" && Number.isFinite(Number(e.target.value))) onChange(clamp(Number(e.target.value), min, max));
          }}
          onBlur={(e) => commit(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 end-2 grid place-items-center text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

export function SliderField({ label, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums">{format ? format(value) : round(value)}</span>
      </div>
      <input id={id} type="range" className="w-full accent-[var(--accent-2)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <select id={id} className="input h-9 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="size-4 accent-[var(--accent-2)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function TextField({ label, value, onChange, multiline, dir }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; dir?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} className="input min-h-24 text-sm" value={value} dir={dir} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input h-9 py-1 text-sm" value={value} dir={dir} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/** Colour picker with a HEX text field (accepts "none" when allowed). */
export function ColorField({ label, value, onChange, allowNone, noneLabel }: { label: string; value: string; onChange: (v: string) => void; allowNone?: boolean; noneLabel?: string }) {
  const id = useId();
  const isNone = value === "none";
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }
  const hex = parseHex(value) ? rgbToHex(parseHex(value)!) : "#000000";
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-0.5" value={hex} disabled={isNone} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <input
          id={id}
          className="input h-9 min-w-0 py-1 font-mono text-xs uppercase"
          value={isNone ? "" : draft}
          placeholder={isNone ? noneLabel : "#000000"}
          disabled={isNone}
          dir="ltr"
          onChange={(e) => {
            setDraft(e.target.value);
            const rgb = parseHex(e.target.value);
            if (rgb) onChange(rgbToHex(rgb));
          }}
        />
        {allowNone && (
          <label className="flex shrink-0 items-center gap-1 text-xs">
            <input type="checkbox" checked={isNone} onChange={(e) => onChange(e.target.checked ? "none" : "#FFFFFF")} className="accent-[var(--accent-2)]" />
            {noneLabel}
          </label>
        )}
      </div>
    </div>
  );
}

/** Segmented buttons for a small set of options. */
export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[] }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <div className="flex rounded-lg border border-border-strong p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            title={o.label}
            aria-label={o.label}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium ${value === o.value ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`}
            onClick={() => onChange(o.value)}
          >
            {o.icon ?? o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}
function clamp(v: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
}
