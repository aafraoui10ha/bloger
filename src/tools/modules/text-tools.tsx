"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cleanText, convertCase, countText, defaultCleanOptions, type CaseMode, type CleanOptions } from "@/tools/logic/text";
import { CopyButton, ResetButton, StatGrid, useNumberFormat, useToolEvents } from "@/tools/ui";

function TextInput({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  const t = useTranslations("text");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholder")}
        rows={10}
        dir="auto"
        spellCheck={false}
        maxLength={500_000}
        className="input min-h-48 resize-y font-[inherit] leading-relaxed"
      />
    </div>
  );
}

export function WordCounter() {
  const t = useTranslations("text");
  const tc = useTranslations("common");
  const events = useToolEvents("word-counter");
  const fmt = useNumberFormat(0);
  const [text, setText] = useState("");
  const c = useMemo(() => countText(text), [text]);
  const reading = c.readingTimeSeconds < 60 ? t("seconds", { count: c.readingTimeSeconds }) : t("minutesSeconds", { m: Math.floor(c.readingTimeSeconds / 60), s: c.readingTimeSeconds % 60 });

  return (
    <div className="space-y-4">
      <TextInput
        id="wc-text"
        label={tc("input")}
        value={text}
        onChange={(v) => {
          setText(v);
          if (v.trim()) events.complete();
        }}
      />
      <div aria-live="polite">
        <StatGrid
          items={[
            { label: t("words"), value: fmt(c.words) },
            { label: t("characters"), value: fmt(c.characters) },
            { label: t("charactersNoSpaces"), value: fmt(c.charactersNoSpaces) },
            { label: t("sentences"), value: fmt(c.sentences) },
            { label: t("paragraphs"), value: fmt(c.paragraphs) },
            { label: t("lines"), value: fmt(c.lines) },
            { label: t("readingTime"), value: reading },
          ]}
        />
      </div>
      <ResetButton onClick={() => setText("")} disabled={!text} />
    </div>
  );
}

export function TextCleaner() {
  const t = useTranslations("text");
  const tc = useTranslations("common");
  const events = useToolEvents("text-cleaner");
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<CleanOptions>(defaultCleanOptions);
  const [result, setResult] = useState("");
  const options: { key: keyof CleanOptions; label: string }[] = [
    { key: "collapseSpaces", label: t("collapseSpaces") },
    { key: "trimLines", label: t("trimLines") },
    { key: "removeTabs", label: t("removeTabs") },
    { key: "removeEmptyLines", label: t("removeEmptyLines") },
    { key: "joinLines", label: t("joinLines") },
  ];

  return (
    <div className="space-y-4">
      <TextInput id="clean-in" label={tc("input")} value={text} onChange={setText} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{t("clean")}</legend>
        {options.map((o) => (
          <label key={o.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.checked })} />
            {o.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!text}
          onClick={() => {
            setResult(cleanText(text, opts));
            events.complete();
          }}
        >
          {t("clean")}
        </button>
        <ResetButton
          onClick={() => {
            setText("");
            setResult("");
          }}
          disabled={!text && !result}
        />
      </div>
      {result && (
        <div aria-live="polite">
          <div className="flex items-center justify-between">
            <label htmlFor="clean-out" className="label">
              {tc("output")}
            </label>
            <CopyButton value={result} />
          </div>
          <textarea id="clean-out" readOnly value={result} rows={8} dir="auto" className="input bg-surface-2" />
        </div>
      )}
    </div>
  );
}

export function CaseConverter() {
  const t = useTranslations("text");
  const tc = useTranslations("common");
  const locale = useLocale();
  const events = useToolEvents("case-converter");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const modes: CaseMode[] = ["upper", "lower", "title", "sentence", "alternating"];
  const hasArabic = /[؀-ۿ]/.test(text);

  return (
    <div className="space-y-4">
      <TextInput id="case-in" label={tc("input")} value={text} onChange={setText} />
      <div className="flex flex-wrap gap-2" role="group" aria-label={tc("output")}>
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            className="btn-secondary"
            disabled={!text}
            onClick={() => {
              // Use the text's own language rules: Turkish/Azeri aside, the page locale is a safe default.
              setResult(convertCase(text, m, locale === "ar" ? undefined : locale));
              events.complete({ mode: m });
            }}
          >
            {t(m)}
          </button>
        ))}
      </div>
      {hasArabic && <p className="text-sm text-muted">{t("arabicNote")}</p>}
      {result && (
        <div aria-live="polite">
          <div className="flex items-center justify-between">
            <label htmlFor="case-out" className="label">
              {tc("output")}
            </label>
            <div className="flex gap-2">
              <CopyButton value={result} />
              <ResetButton
                onClick={() => {
                  setText("");
                  setResult("");
                }}
              />
            </div>
          </div>
          <textarea id="case-out" readOnly value={result} rows={8} dir="auto" className="input bg-surface-2" />
        </div>
      )}
    </div>
  );
}
