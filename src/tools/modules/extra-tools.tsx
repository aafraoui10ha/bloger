"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import {
  age, bmi, dateToTimestamp, generatePassword, hashText, HASH_ALGORITHMS, loanPayment, loremIpsum, parseTimestamp, passwordStrength,
  type HashAlgorithm, type TimestampResult,
} from "@/tools/logic/generators";
import { parseNumber } from "@/tools/logic/numbers";
import { CopyButton, ErrorMessage, Field, ResetButton, StatGrid, intlLocale, useNumberFormat, useToolEvents } from "@/tools/ui";

function NumberInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return <input id={id} className="input" inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" />;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Output({ id, label, value, rows = 3 }: { id: string; label: string; value: string; rows?: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="label mb-0">{label}</label>
        <CopyButton value={value} />
      </div>
      <textarea id={id} className="input font-mono" rows={rows} readOnly value={value} dir="ltr" />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function PasswordGenerator() {
  const t = useTranslations("extra");
  const events = useToolEvents("password-generator");
  const [opts, setOpts] = useState({ length: 16, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: false });
  const [result, setResult] = useState<{ password: string; bits: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    const r = generatePassword(opts);
    if (!r.ok) {
      setError(t(`errors.${r.error}`));
      setResult(null);
      return;
    }
    setError(null);
    setResult({ password: r.password, bits: r.entropyBits });
    events.complete({ length: opts.length });
  }
  const set = <K extends keyof typeof opts>(k: K, v: (typeof opts)[K]) => setOpts((o) => ({ ...o, [k]: v }));

  return (
    <div className="space-y-4">
      <Field id="pw-length" label={`${t("length")}: ${opts.length}`}>
        <input id="pw-length" type="range" min={4} max={64} value={opts.length} onChange={(e) => set("length", Number(e.target.value))} className="w-full accent-[var(--accent)]" />
      </Field>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="label">{t("include")}</legend>
        <Check label={t("lower")} checked={opts.lower} onChange={(v) => set("lower", v)} />
        <Check label={t("upper")} checked={opts.upper} onChange={(v) => set("upper", v)} />
        <Check label={t("digits")} checked={opts.digits} onChange={(v) => set("digits", v)} />
        <Check label={t("symbols")} checked={opts.symbols} onChange={(v) => set("symbols", v)} />
        <Check label={t("excludeAmbiguous")} checked={opts.excludeAmbiguous} onChange={(v) => set("excludeAmbiguous", v)} />
      </fieldset>
      <button type="button" className="btn-primary" onClick={generate}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {t("generate")}
      </button>
      <ErrorMessage>{error}</ErrorMessage>
      {result && (
        <div className="space-y-3" aria-live="polite">
          <Output id="pw-out" label={t("password")} value={result.password} rows={2} />
          <p className="text-sm">
            {t("strength")}: <strong>{t(`strengths.${passwordStrength(result.bits)}`)}</strong> · {t("entropy", { bits: result.bits })}
          </p>
        </div>
      )}
    </div>
  );
}

export function UuidGenerator() {
  const t = useTranslations("extra");
  const events = useToolEvents("uuid-generator");
  const [count, setCount] = useState("5");
  const [upper, setUpper] = useState(false);
  const [out, setOut] = useState("");

  function generate() {
    const n = Math.min(Math.max(Math.trunc(parseNumber(count) ?? 1), 1), 100);
    const ids = Array.from({ length: n }, () => crypto.randomUUID());
    setOut((upper ? ids.map((i) => i.toUpperCase()) : ids).join("\n"));
    events.complete({ count: n });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="uuid-count" label={t("howMany")} hint={t("howManyHint")}>
          <NumberInput id="uuid-count" value={count} onChange={setCount} />
        </Field>
        <div className="self-end pb-2">
          <Check label={t("uppercase")} checked={upper} onChange={setUpper} />
        </div>
      </div>
      <button type="button" className="btn-primary" onClick={generate}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {t("generate")}
      </button>
      {out && <Output id="uuid-out" label={t("result")} value={out} rows={Math.min(out.split("\n").length, 12)} />}
    </div>
  );
}

export function HashGenerator() {
  const t = useTranslations("extra");
  const events = useToolEvents("hash-generator");
  const [text, setText] = useState("");
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string> | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const entries = await Promise.all(HASH_ALGORITHMS.map(async (a) => [a, await hashText(text, a)] as const));
    setHashes(Object.fromEntries(entries) as Record<HashAlgorithm, string>);
    events.complete();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="hash-in" label={t("textToHash")}>
        <textarea id="hash-in" className="input" rows={5} value={text} onChange={(e) => { setText(e.target.value); setHashes(null); }} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{t("computeHashes")}</button>
        <ResetButton onClick={() => { setText(""); setHashes(null); events.reset(); }} disabled={!text} />
      </div>
      {hashes && (
        <div className="space-y-3">
          {HASH_ALGORITHMS.map((a) => (
            <Output key={a} id={`hash-${a}`} label={a} value={hashes[a]} rows={a === "SHA-1" || a === "SHA-256" ? 1 : 2} />
          ))}
          <p className="hint">{t("sha1Note")}</p>
        </div>
      )}
    </form>
  );
}

export function TimestampConverter() {
  const t = useTranslations("extra");
  const locale = useLocale();
  const events = useToolEvents("timestamp-converter");
  const [ts, setTs] = useState("");
  const [date, setDate] = useState("");
  const [utc, setUtc] = useState(true);
  const [result, setResult] = useState<TimestampResult | null>(null);

  const show = (r: TimestampResult) => {
    setResult(r);
    if (r.ok) events.complete();
  };
  const fmt = (d: Date, timeZone?: string) => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "full", timeStyle: "long", ...(timeZone ? { timeZone } : {}) }).format(d);

  return (
    <div className="space-y-6">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); show(parseTimestamp(ts)); }}>
        <Field id="ts-in" label={t("timestamp")} hint={t("timestampHint")}>
          <input id="ts-in" className="input font-mono" inputMode="numeric" value={ts} onChange={(e) => setTs(e.target.value)} dir="ltr" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">{t("toDate")}</button>
          <button type="button" className="btn-secondary" onClick={() => { const now = String(Math.floor(Date.now() / 1000)); setTs(now); show(parseTimestamp(now)); }}>{t("now")}</button>
        </div>
      </form>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); show(dateToTimestamp(date, utc)); }}>
        <Field id="date-in" label={t("dateTime")}>
          <input id="date-in" type="datetime-local" step={1} className="input" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" />
        </Field>
        <Check label={t("interpretUtc")} checked={utc} onChange={setUtc} />
        <button type="submit" className="btn-primary">{t("toTimestamp")}</button>
      </form>
      {result && !result.ok && <ErrorMessage>{t("errors.timestamp")}</ErrorMessage>}
      {result?.ok && (
        <StatGrid
          items={[
            { label: t("seconds"), value: <span dir="ltr" className="font-mono text-base">{result.seconds}</span> },
            { label: t("milliseconds"), value: <span dir="ltr" className="font-mono text-base">{result.milliseconds}</span> },
            { label: "ISO 8601 (UTC)", value: <span dir="ltr" className="font-mono text-sm">{result.date.toISOString()}</span> },
            { label: t("utcTime"), value: <span className="text-sm">{fmt(result.date, "UTC")}</span> },
            { label: t("localTime"), value: <span className="text-sm">{fmt(result.date)}</span> },
          ]}
        />
      )}
    </div>
  );
}

export function BmiCalculator() {
  const t = useTranslations("extra");
  const events = useToolEvents("bmi-calculator");
  const fmt = useNumberFormat(1);
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [result, setResult] = useState<ReturnType<typeof bmi> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = bmi(parseNumber(w) ?? NaN, parseNumber(h) ?? NaN);
    setResult(r);
    if (r.ok) events.complete({ category: r.category });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bmi-w" label={t("weightKg")}><NumberInput id="bmi-w" value={w} onChange={setW} /></Field>
        <Field id="bmi-h" label={t("heightCm")}><NumberInput id="bmi-h" value={h} onChange={setH} /></Field>
      </div>
      <button type="submit" className="btn-primary">{t("calculate")}</button>
      {result && !result.ok && <ErrorMessage>{t(result.error === "range" ? "errors.bmiRange" : "errors.invalid")}</ErrorMessage>}
      {result?.ok && (
        <div className="space-y-3" aria-live="polite">
          <StatGrid items={[{ label: t("bmi"), value: fmt(result.bmi) }, { label: t("category"), value: t(`bmiCategories.${result.category}`) }]} />
          <p className="hint">{t("bmiNote")}</p>
        </div>
      )}
    </form>
  );
}

export function AgeCalculator() {
  const t = useTranslations("extra");
  const events = useToolEvents("age-calculator");
  const fmt = useNumberFormat(0);
  const [birth, setBirth] = useState("");
  const [on, setOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<ReturnType<typeof age> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = age(new Date(`${birth}T00:00:00Z`), new Date(`${on}T00:00:00Z`));
    setResult(r);
    if (r.ok) events.complete();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="age-birth" label={t("birthDate")}><input id="age-birth" type="date" className="input" value={birth} onChange={(e) => setBirth(e.target.value)} dir="ltr" /></Field>
        <Field id="age-on" label={t("onDate")}><input id="age-on" type="date" className="input" value={on} onChange={(e) => setOn(e.target.value)} dir="ltr" /></Field>
      </div>
      <button type="submit" className="btn-primary">{t("calculate")}</button>
      {result && !result.ok && <ErrorMessage>{t(result.error === "future" ? "errors.future" : "errors.date")}</ErrorMessage>}
      {result?.ok && (
        <StatGrid
          items={[
            { label: t("years"), value: fmt(result.years) },
            { label: t("months"), value: fmt(result.months) },
            { label: t("days"), value: fmt(result.days) },
            { label: t("totalDays"), value: fmt(result.totalDays) },
            { label: t("nextBirthday"), value: result.daysToBirthday === 0 ? t("today") : t("inDays", { count: result.daysToBirthday }) },
          ]}
        />
      )}
    </form>
  );
}

export function LoanCalculator() {
  const t = useTranslations("extra");
  const events = useToolEvents("loan-calculator");
  const fmt = useNumberFormat(2);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<ReturnType<typeof loanPayment> | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const y = parseNumber(years) ?? NaN;
    const r = loanPayment(parseNumber(amount) ?? NaN, parseNumber(rate) ?? NaN, Math.round(y * 12));
    setResult(r);
    if (r.ok) events.complete();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="loan-amount" label={t("loanAmount")}><NumberInput id="loan-amount" value={amount} onChange={setAmount} /></Field>
        <Field id="loan-rate" label={t("annualRate")}><NumberInput id="loan-rate" value={rate} onChange={setRate} /></Field>
        <Field id="loan-years" label={t("termYears")}><NumberInput id="loan-years" value={years} onChange={setYears} /></Field>
      </div>
      <button type="submit" className="btn-primary">{t("calculate")}</button>
      {result && !result.ok && <ErrorMessage>{t(result.error === "range" ? "errors.loanRange" : "errors.invalid")}</ErrorMessage>}
      {result?.ok && (
        <div className="space-y-3" aria-live="polite">
          <StatGrid items={[{ label: t("monthlyPayment"), value: fmt(result.monthly) }, { label: t("totalPaid"), value: fmt(result.totalPaid) }, { label: t("totalInterest"), value: fmt(result.totalInterest) }]} />
          <p className="hint">{t("loanNote")}</p>
        </div>
      )}
    </form>
  );
}

export function LoremIpsumGenerator() {
  const t = useTranslations("extra");
  const events = useToolEvents("lorem-ipsum-generator");
  const [paragraphs, setParagraphs] = useState("3");
  const [words, setWords] = useState("50");
  const [classic, setClassic] = useState(true);
  const [out, setOut] = useState("");

  function generate() {
    setOut(loremIpsum(parseNumber(paragraphs) ?? 3, parseNumber(words) ?? 50, classic).join("\n\n"));
    events.complete();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lorem-p" label={t("paragraphs")} hint={t("paragraphsHint")}><NumberInput id="lorem-p" value={paragraphs} onChange={setParagraphs} /></Field>
        <Field id="lorem-w" label={t("wordsPerParagraph")} hint={t("wordsHint")}><NumberInput id="lorem-w" value={words} onChange={setWords} /></Field>
      </div>
      <Check label={t("startWithLorem")} checked={classic} onChange={setClassic} />
      <button type="button" className="btn-primary" onClick={generate}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {t("generate")}
      </button>
      {out && <Output id="lorem-out" label={t("result")} value={out} rows={10} />}
    </div>
  );
}
