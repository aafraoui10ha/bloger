"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Download } from "lucide-react";
import QRCode from "qrcode";
import { formatJson, minifyJson } from "@/tools/logic/json";
import { contrastRatio, parseHex, parseRgb, rgbToHex, rgbToHsl, type Rgb } from "@/tools/logic/color";
import { convertUnit, unitsFor, type UnitCategory } from "@/tools/logic/units";
import { parseNumber } from "@/tools/logic/numbers";
import { base64Decode, base64Encode, urlDecode, urlEncode } from "@/tools/logic/encoding";
import { CopyButton, ErrorMessage, Field, ResetButton, useNumberFormat, useToolEvents } from "@/tools/ui";

// ---------------------------------------------------------------------------
// QR code generator
// ---------------------------------------------------------------------------
export function QrCodeGenerator() {
  const t = useTranslations("qr");
  const events = useToolEvents("qr-code-generator");
  const [text, setText] = useState("");
  const [size, setSize] = useState(320);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lowContrast = useMemo(() => {
    const a = parseHex(fg), b = parseHex(bg);
    return a && b ? contrastRatio(a, b) < 4 : false;
  }, [fg, bg]);

  async function generate() {
    setError(null);
    if (!text.trim()) return setError(t("empty"));
    try {
      const opts = { errorCorrectionLevel: level, margin: 2, color: { dark: fg, light: bg } } as const;
      setPng(await QRCode.toDataURL(text, { ...opts, width: size }));
      const svgText = await QRCode.toString(text, { ...opts, type: "svg", width: size });
      setSvg(URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" })));
      events.complete({ level });
    } catch {
      setPng(null);
      setError(t("tooLong"));
    }
  }

  useEffect(() => () => { if (svg) URL.revokeObjectURL(svg); }, [svg]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <Field id="qr-text" label={t("content")}>
          <textarea id="qr-text" className="input" rows={3} maxLength={2900} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("contentPlaceholder")} dir="auto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="qr-size" label={t("size")}>
            <select id="qr-size" className="input" value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[200, 320, 512, 768, 1024].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field id="qr-level" label={t("errorLevel")}>
            <select id="qr-level" className="input" value={level} onChange={(e) => setLevel(e.target.value as "M")}>
              {(["L", "M", "Q", "H"] as const).map((l) => <option key={l} value={l}>{t(`level${l}`)}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-10 w-14 rounded border border-border-strong" />
            {t("foreground")}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-14 rounded border border-border-strong" />
            {t("backgroundColor")}
          </label>
        </div>
        {lowContrast && <p className="alert-warning">{t("contrastWarning")}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={generate}>{t("generate")}</button>
          <ResetButton onClick={() => { setText(""); setPng(null); setSvg(null); setError(null); }} />
        </div>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      {png && (
        <div aria-live="polite" className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={png} alt={t("alt")} width={240} height={240} className="mx-auto rounded-lg border border-border" />
          <div className="flex flex-col gap-2">
            <a href={png} download="qr-code.png" className="btn-primary btn-sm" onClick={() => events.downloaded("png")}>
              <Download className="size-4" aria-hidden="true" /> {t("downloadPng")}
            </a>
            {svg && (
              <a href={svg} download="qr-code.svg" className="btn-secondary btn-sm" onClick={() => events.downloaded("svg")}>
                <Download className="size-4" aria-hidden="true" /> {t("downloadSvg")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON formatter
// ---------------------------------------------------------------------------
export function JsonFormatter() {
  const t = useTranslations("json");
  const tc = useTranslations("common");
  const events = useToolEvents("json-formatter");
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(kind: "format" | "minify") {
    const r = kind === "minify" ? minifyJson(input) : formatJson(input, indent === "tab" ? "tab" : Number(indent));
    if (!r.ok) {
      setOutput("");
      setError(r.error === "empty" ? t("empty") : `${t("invalid", { message: r.error })}${r.line ? ` — ${t("position", { line: r.line, column: r.column ?? 1 })}` : ""}`);
      return;
    }
    setError(null);
    setOutput(r.output);
    events.complete({ mode: kind });
  }

  return (
    <div className="space-y-4">
      <Field id="json-in" label={t("input")}>
        <textarea id="json-in" className="input font-mono text-xs" rows={10} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} dir="ltr" placeholder='{"name":"Atlas","tools":18}' />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field id="json-indent" label={t("indent")}>
          <select id="json-indent" className="input" value={indent} onChange={(e) => setIndent(e.target.value as "2")}>
            <option value="2">{t("spaces", { count: 2 })}</option>
            <option value="4">{t("spaces", { count: 4 })}</option>
            <option value="tab">{t("tab")}</option>
          </select>
        </Field>
        <button type="button" className="btn-primary" onClick={() => run("format")}>{t("format")}</button>
        <button type="button" className="btn-secondary" onClick={() => run("minify")}>{t("minify")}</button>
        <ResetButton onClick={() => { setInput(""); setOutput(""); setError(null); }} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {output && (
        <div aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-success">{t("valid")}</p>
            <CopyButton value={output} />
          </div>
          <label htmlFor="json-out" className="sr-only">{tc("output")}</label>
          <textarea id="json-out" readOnly className="input mt-2 bg-surface-2 font-mono text-xs" rows={12} value={output} dir="ltr" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color converter
// ---------------------------------------------------------------------------
export function ColorConverter() {
  const t = useTranslations("color");
  const events = useToolEvents("color-converter");
  const [rgb, setRgb] = useState<Rgb>({ r: 11, g: 122, b: 117 });
  const [hexInput, setHexInput] = useState("#0B7A75");
  const [rgbInput, setRgbInput] = useState("11, 122, 117");
  const [error, setError] = useState<string | null>(null);
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);

  function apply(next: Rgb, from: "hex" | "rgb" | "picker") {
    setRgb(next);
    setError(null);
    if (from !== "hex") setHexInput(rgbToHex(next));
    if (from !== "rgb") setRgbInput(`${next.r}, ${next.g}, ${next.b}`);
    events.complete();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_200px]">
      <div className="space-y-4">
        <Field id="c-hex" label={t("hex")}>
          <input id="c-hex" className="input font-mono" dir="ltr" value={hexInput} onChange={(e) => {
            setHexInput(e.target.value);
            const p = parseHex(e.target.value);
            if (p) apply(p, "hex"); else setError(t("invalidHex"));
          }} />
        </Field>
        <Field id="c-rgb" label={t("rgb")}>
          <input id="c-rgb" className="input font-mono" dir="ltr" value={rgbInput} onChange={(e) => {
            setRgbInput(e.target.value);
            const p = parseRgb(e.target.value);
            if (p) apply(p, "rgb"); else setError(t("invalidRgb"));
          }} />
        </Field>
        <Field id="c-pick" label={t("picker")}>
          <input id="c-pick" type="color" value={hex.toLowerCase()} onChange={(e) => { const p = parseHex(e.target.value); if (p) apply(p, "picker"); }} className="h-10 w-20 rounded border border-border-strong" />
        </Field>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      <div aria-live="polite" className="space-y-2">
        <div role="img" aria-label={`${t("preview")}: ${hex}`} className="h-28 rounded-xl border border-border" style={{ background: hex }} />
        {[
          [t("hex"), hex],
          [t("rgb"), `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
          [t("hsl"), `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 text-sm">
            <span className="font-mono" dir="ltr">{v}</span>
            <CopyButton value={v!} className="btn-ghost btn-sm" />
          </div>
        ))}
        <p className="text-xs text-muted">{t("contrastWhite", { ratio: contrastRatio(rgb, { r: 255, g: 255, b: 255 }) })}</p>
        <p className="text-xs text-muted">{t("contrastBlack", { ratio: contrastRatio(rgb, { r: 0, g: 0, b: 0 }) })}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit converter
// ---------------------------------------------------------------------------
const CATEGORIES: UnitCategory[] = ["length", "mass", "temperature", "volume", "area", "data"];
const DEFAULTS: Record<UnitCategory, [string, string]> = {
  length: ["m", "ft"], mass: ["kg", "lb"], temperature: ["C", "F"], volume: ["l", "gal"], area: ["m2", "ft2"], data: ["MB", "MiB"],
};

export function UnitConverter() {
  const t = useTranslations("units");
  const events = useToolEvents("unit-converter");
  const fmt = useNumberFormat(10);
  const [category, setCategory] = useState<UnitCategory>("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [value, setValue] = useState("1");
  const units = unitsFor(category);
  const n = parseNumber(value);
  const result = n === null ? null : convertUnit(n, from, to, category);
  const label = (u: string) => t(`u.${u}` as "u.m");

  return (
    <div className="space-y-4">
      <Field id="u-cat" label={t("category")}>
        <select id="u-cat" className="input" value={category} onChange={(e) => {
          const c = e.target.value as UnitCategory;
          setCategory(c);
          setFrom(DEFAULTS[c][0]);
          setTo(DEFAULTS[c][1]);
        }}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
        </select>
      </Field>
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto_1fr]">
        <Field id="u-val" label={t("value")}>
          <input id="u-val" className="input" inputMode="decimal" dir="ltr" value={value} onChange={(e) => { setValue(e.target.value); events.complete({ category }); }} />
        </Field>
        <Field id="u-from" label={t("from")}>
          <select id="u-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{label(u)}</option>)}
          </select>
        </Field>
        <button type="button" className="btn-ghost size-10 p-0" aria-label={t("swap")} onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </button>
        <Field id="u-to" label={t("to")}>
          <select id="u-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{label(u)}</option>)}
          </select>
        </Field>
      </div>
      <div aria-live="polite">
        {n === null ? (
          value.trim() ? <ErrorMessage>{t("invalid")}</ErrorMessage> : null
        ) : result && !result.ok ? (
          <ErrorMessage>{result.error === "belowAbsoluteZero" ? t("belowAbsoluteZero") : t("invalid")}</ErrorMessage>
        ) : result ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
            <p className="text-2xl font-semibold tabular-nums" dir="ltr">
              {fmt(n)} {from} = {fmt(result.value)} {to}
            </p>
            <CopyButton value={String(result.value)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Base64 & URL encoders
// ---------------------------------------------------------------------------
function EncoderShell({ toolKey, encode, decode, options }: {
  toolKey: string;
  encode: (s: string) => string;
  decode: (s: string) => { ok: true; output: string } | { ok: false; error: string };
  options?: React.ReactNode;
}) {
  const t = useTranslations("encode");
  const tc = useTranslations("common");
  const events = useToolEvents(toolKey);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Field id={`${toolKey}-in`} label={tc("input")}>
        <textarea id={`${toolKey}-in`} className="input font-mono text-sm" rows={6} value={input} onChange={(e) => setInput(e.target.value)} dir="auto" spellCheck={false} />
      </Field>
      {options}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={!input} onClick={() => { setError(null); setOutput(encode(input)); events.complete({ mode: "encode" }); }}>{t("encode")}</button>
        <button type="button" className="btn-secondary" disabled={!input} onClick={() => {
          const r = decode(input);
          if (r.ok) { setError(null); setOutput(r.output); events.complete({ mode: "decode" }); }
          else { setOutput(""); setError(t(r.error as "invalidBase64")); }
        }}>{t("decode")}</button>
        <ResetButton onClick={() => { setInput(""); setOutput(""); setError(null); }} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {output && (
        <div aria-live="polite">
          <div className="flex items-center justify-between">
            <label htmlFor={`${toolKey}-out`} className="label">{tc("output")}</label>
            <CopyButton value={output} />
          </div>
          <textarea id={`${toolKey}-out`} readOnly className="input bg-surface-2 font-mono text-sm" rows={6} value={output} dir="auto" />
        </div>
      )}
    </div>
  );
}

export function Base64Converter() {
  const t = useTranslations("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  return (
    <EncoderShell
      toolKey="base64-converter"
      encode={(s) => base64Encode(s, urlSafe)}
      decode={base64Decode}
      options={
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
          {t("urlSafe")}
        </label>
      }
    />
  );
}

export function UrlEncoder() {
  const t = useTranslations("encode");
  const [mode, setMode] = useState<"component" | "full">("component");
  const [plus, setPlus] = useState(true);
  return (
    <EncoderShell
      toolKey="url-encoder"
      encode={(s) => urlEncode(s, mode)}
      decode={(s) => urlDecode(s, plus)}
      options={
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">{t("encode")}</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="url-mode" checked={mode === "component"} onChange={() => setMode("component")} className="accent-[var(--accent)]" /> {t("componentMode")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="url-mode" checked={mode === "full"} onChange={() => setMode("full")} className="accent-[var(--accent)]" /> {t("fullMode")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={plus} onChange={(e) => setPlus(e.target.checked)} className="size-4 accent-[var(--accent)]" /> {t("plusAsSpace")}
          </label>
        </fieldset>
      }
    />
  );
}
