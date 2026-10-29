"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { discount, percentChange, percentOf, stats, whatPercent, type CalcResult } from "@/tools/logic/calculators";
import { parseNumber, parseNumberList } from "@/tools/logic/numbers";
import { CopyButton, ErrorMessage, Field, ResetButton, StatGrid, useNumberFormat, useToolEvents } from "@/tools/ui";

function NumberInput({ id, value, onChange, describedBy }: { id: string; value: string; onChange: (v: string) => void; describedBy?: string }) {
  // type="text" + inputMode keeps decimal commas and Arabic-Indic digits usable.
  return <input id={id} className="input" inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} dir="ltr" />;
}

type PercentMode = "percentOf" | "whatPercent" | "percentChange";

export function PercentageCalculator() {
  const t = useTranslations("calc");
  const events = useToolEvents("percentage-calculator");
  const fmt = useNumberFormat(4);
  const [mode, setMode] = useState<PercentMode>("percentOf");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<{ text: string; value: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels: Record<PercentMode, [string, string]> = {
    percentOf: [t("percent"), t("value")],
    whatPercent: [t("part"), t("whole")],
    percentChange: [t("from"), t("to")],
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const x = parseNumber(a);
    const y = parseNumber(b);
    if (x === null || y === null) {
      setError(t("errors.invalid"));
      setResult(null);
      return;
    }
    const r: CalcResult = mode === "percentOf" ? percentOf(x, y) : mode === "whatPercent" ? whatPercent(x, y) : percentChange(x, y);
    if (!r.ok) {
      setError(t(`errors.${r.error}`));
      setResult(null);
      return;
    }
    setError(null);
    const text =
      mode === "percentOf"
        ? `${fmt(x)}% × ${fmt(y)} = ${fmt(r.value)}`
        : mode === "whatPercent"
          ? `${fmt(x)} / ${fmt(y)} = ${fmt(r.value)}%`
          : `${r.value >= 0 ? t("increase") : t("decrease")}: ${fmt(Math.abs(r.value))}%`;
    setResult({ text, value: r.value });
    events.complete({ mode });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="label">{t("mode")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["percentOf", "whatPercent", "percentChange"] as const).map((m) => (
            <label key={m} className={`btn-secondary btn-sm cursor-pointer ${mode === m ? "border-accent bg-accent-soft" : ""}`}>
              <input type="radio" name="mode" className="sr-only" checked={mode === m} onChange={() => { setMode(m); setResult(null); setError(null); }} />
              {t(m)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pa" label={labels[mode][0]}>
          <NumberInput id="pa" value={a} onChange={setA} />
        </Field>
        <Field id="pb" label={labels[mode][1]}>
          <NumberInput id="pb" value={b} onChange={setB} />
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{t("calculate")}</button>
        <ResetButton onClick={() => { setA(""); setB(""); setResult(null); setError(null); }} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {result && (
        <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <p className="text-2xl font-semibold tabular-nums" dir="ltr">{result.text}</p>
          <CopyButton value={String(result.value)} />
        </div>
      )}
    </form>
  );
}

export function DiscountCalculator() {
  const t = useTranslations("calc");
  const events = useToolEvents("discount-calculator");
  const fmt = useNumberFormat(2);
  const [price, setPrice] = useState("");
  const [pct, setPct] = useState("");
  const [tax, setTax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Extract<ReturnType<typeof discount>, { ok: true }> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = parseNumber(price);
    const d = parseNumber(pct);
    const x = tax.trim() ? parseNumber(tax) : 0;
    if (p === null || d === null || x === null) {
      setError(t("errors.invalid"));
      setRes(null);
      return;
    }
    const r = discount(p, d, x);
    if (!r.ok) {
      setError(t(`errors.${r.error}`));
      setRes(null);
      return;
    }
    setError(null);
    setRes(r);
    events.complete();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="price" label={t("price")}>
          <NumberInput id="price" value={price} onChange={setPrice} />
        </Field>
        <Field id="pct" label={t("discount")}>
          <NumberInput id="pct" value={pct} onChange={setPct} />
        </Field>
        <Field id="tax" label={`${t("tax")}`}>
          <NumberInput id="tax" value={tax} onChange={setTax} />
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{t("calculate")}</button>
        <ResetButton onClick={() => { setPrice(""); setPct(""); setTax(""); setRes(null); setError(null); }} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {res && (
        <div aria-live="polite" className="space-y-3">
          <StatGrid
            items={[
              { label: t("saving"), value: fmt(res.saving) },
              { label: t("afterDiscount"), value: fmt(res.priceAfterDiscount) },
              ...(res.tax ? [{ label: t("taxAmount"), value: fmt(res.tax) }] : []),
              { label: t("finalPrice"), value: <span className="text-accent">{fmt(res.finalPrice)}</span> },
            ]}
          />
          <CopyButton value={String(res.finalPrice)} />
        </div>
      )}
    </form>
  );
}

export function AverageCalculator() {
  const t = useTranslations("calc");
  const events = useToolEvents("average-calculator");
  const fmt = useNumberFormat(6);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<ReturnType<typeof stats>>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseNumberList(input);
    if (!parsed.ok) {
      setError(t("errors.invalidTokens", { list: parsed.invalid.slice(0, 5).join(", ") }));
      setRes(null);
      return;
    }
    if (!parsed.values.length) {
      setError(t("errors.empty"));
      setRes(null);
      return;
    }
    setError(null);
    setRes(stats(parsed.values));
    events.complete({ count: parsed.values.length });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field id="nums" label={t("numbers")} hint={t("numbersHint")}>
        <textarea id="nums" className="input" rows={5} value={input} onChange={(e) => setInput(e.target.value)} aria-describedby="nums-hint" dir="ltr" placeholder="12  15.5  9,75  20" />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{t("calculate")}</button>
        <ResetButton onClick={() => { setInput(""); setRes(null); setError(null); }} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {res && (
        <div aria-live="polite" className="space-y-3">
          <StatGrid
            items={[
              { label: t("mean"), value: <span className="text-accent">{fmt(res.mean)}</span> },
              { label: t("median"), value: fmt(res.median) },
              { label: t("sum"), value: fmt(res.sum) },
              { label: t("count"), value: fmt(res.count) },
              { label: t("min"), value: fmt(res.min) },
              { label: t("max"), value: fmt(res.max) },
              { label: t("range"), value: fmt(res.range) },
            ]}
          />
          <CopyButton value={String(res.mean)} />
        </div>
      )}
    </form>
  );
}
