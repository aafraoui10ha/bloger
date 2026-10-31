"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Trash2, X } from "lucide-react";
import { parseNumber } from "../format";
import { ICON_NAMES } from "../icons";
import type { ChartEl, ChartKind, ChartRow } from "../model";

/** How many value columns each chart kind uses (min, max). */
export function seriesLimits(kind: ChartKind): [number, number] {
  switch (kind) {
    case "scatter":
    case "comparison":
      return [2, 2];
    case "pie":
    case "doughnut":
    case "progress":
    case "kpi":
    case "infographic":
      return [1, 1];
    case "timeline":
      return [0, 0];
    default:
      return [1, 6];
  }
}
const usesNotes = (k: ChartKind) => k === "kpi" || k === "timeline" || k === "infographic";

/** Parses pasted spreadsheet data (tab, semicolon or comma separated). */
export function parsePastedTable(text: string): { series: string[]; rows: ChartRow[] } | null {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return null;
  const sep = lines[0]!.includes("\t") ? "\t" : lines[0]!.includes(";") ? ";" : ",";
  const cells = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
  const width = Math.max(...cells.map((r) => r.length));
  if (width < 2) return null;
  const hasHeader = cells[0]!.slice(1).some((c) => c && parseNumber(c) === null);
  const header = hasHeader ? cells.shift()! : null;
  const series = Array.from({ length: width - 1 }, (_, i) => header?.[i + 1] || `${i + 1}`);
  const rows = cells.map((r) => ({ label: r[0] ?? "", values: series.map((_, i) => parseNumber(r[i + 1] ?? "") ?? 0) }));
  return rows.length ? { series, rows } : null;
}

export function DataEditor({ el, onChange }: { el: ChartEl; onChange: (patch: Partial<ChartEl>, mergeKey?: string) => void }) {
  const t = useTranslations("designer.data");
  const [paste, setPaste] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState(false);
  const [min, max] = seriesLimits(el.kind);
  const cols = Math.min(Math.max(el.series.length, min), max);
  const series = Array.from({ length: cols }, (_, i) => el.series[i] ?? `${i + 1}`);
  const notes = usesNotes(el.kind);
  const icons = el.kind === "infographic";

  const setRow = (i: number, row: Partial<ChartRow>, key: string) => onChange({ rows: el.rows.map((r, j) => (j === i ? { ...r, ...row } : r)) }, key);
  const setValue = (i: number, si: number, raw: string) => {
    const v = parseNumber(raw);
    const values = [...(el.rows[i]?.values ?? [])];
    while (values.length < cols) values.push(0);
    values[si] = v ?? 0;
    setRow(i, { values }, `cell-${el.id}-${i}-${si}`);
  };
  const addRow = () => onChange({ rows: [...el.rows, { label: t("newRow", { n: el.rows.length + 1 }), values: series.map(() => 0), ...(notes ? { note: "" } : {}), ...(icons ? { icon: "star" } : {}) }] });
  const move = (i: number, d: -1 | 1) => {
    const rows = [...el.rows];
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    onChange({ rows });
  };

  return (
    <div className="space-y-2">
      <div className="max-h-80 overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-max text-xs" aria-label={t("tableLabel")}>
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              <th className="p-1 text-start font-medium">{el.kind === "timeline" ? t("date") : t("label")}</th>
              {series.map((s, si) => (
                <th key={si} className="p-1 font-medium">
                  <div className="flex items-center gap-1">
                    <input aria-label={t("seriesName", { n: si + 1 })} className="input h-7 w-24 px-1.5 py-0 text-xs" value={s} onChange={(e) => onChange({ series: series.map((x, j) => (j === si ? e.target.value : x)) }, `series-${el.id}-${si}`)} />
                    {cols > min && (
                      <button type="button" className="text-muted hover:text-danger" aria-label={t("removeSeries", { name: s })} onClick={() => onChange({ series: series.filter((_, j) => j !== si), rows: el.rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== si) })) })}>
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {notes && <th className="p-1 text-start font-medium">{el.kind === "timeline" ? t("description") : t("note")}</th>}
              {icons && <th className="p-1 text-start font-medium">{t("icon")}</th>}
              <th className="p-1">
                <span className="sr-only">{t("actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {el.rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-1">
                  <input aria-label={t("rowLabel", { n: i + 1 })} className="input h-7 w-28 px-1.5 py-0 text-xs" value={r.label} onChange={(e) => setRow(i, { label: e.target.value }, `label-${el.id}-${i}`)} />
                </td>
                {series.map((_, si) => (
                  <td key={si} className="p-1">
                    <NumberCell value={r.values[si] ?? 0} label={t("cell", { row: r.label || i + 1, series: series[si]! })} onChange={(v) => setValue(i, si, v)} />
                  </td>
                ))}
                {notes && (
                  <td className="p-1">
                    <input aria-label={t("noteFor", { row: r.label || i + 1 })} className="input h-7 w-40 px-1.5 py-0 text-xs" value={r.note ?? ""} onChange={(e) => setRow(i, { note: e.target.value }, `note-${el.id}-${i}`)} />
                  </td>
                )}
                {icons && (
                  <td className="p-1">
                    <select aria-label={t("iconFor", { row: r.label || i + 1 })} className="input h-7 w-28 px-1 py-0 text-xs" value={r.icon ?? "star"} onChange={(e) => setRow(i, { icon: e.target.value }, `icon-${el.id}-${i}`)}>
                      {ICON_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="p-1">
                  <div className="flex items-center gap-0.5 text-muted">
                    <button type="button" className="p-0.5 hover:text-fg disabled:opacity-30" disabled={i === 0} aria-label={t("moveUp")} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" className="p-0.5 hover:text-fg disabled:opacity-30" disabled={i === el.rows.length - 1} aria-label={t("moveDown")} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button type="button" className="p-0.5 hover:text-danger disabled:opacity-30" disabled={el.rows.length <= 1} aria-label={t("removeRow", { row: r.label || i + 1 })} onClick={() => onChange({ rows: el.rows.filter((_, j) => j !== i) })}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={addRow}>
          <Plus className="size-3.5" aria-hidden="true" />
          {t("addRow")}
        </button>
        {cols < max && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => onChange({ series: [...series, t("newSeries", { n: cols + 1 })], rows: el.rows.map((r) => ({ ...r, values: [...r.values.slice(0, cols), 0] })) })}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t("addSeries")}
          </button>
        )}
        {el.kind !== "timeline" && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setPaste(paste === null ? "" : null)}>
            <ClipboardPaste className="size-3.5" aria-hidden="true" />
            {t("paste")}
          </button>
        )}
      </div>
      {paste !== null && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-2">
          <label className="block text-xs text-muted" htmlFor={`paste-${el.id}`}>
            {t("pasteHint")}
          </label>
          <textarea id={`paste-${el.id}`} className="input min-h-24 font-mono text-xs" dir="ltr" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Month\tSales\tCosts\nJan\t120\t80\nFeb\t150\t95"} />
          {pasteError && <p className="text-xs text-danger">{t("pasteError")}</p>}
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => {
              const parsed = parsePastedTable(paste);
              if (!parsed) return setPasteError(true);
              const [, maxCols] = seriesLimits(el.kind);
              const keep = Math.max(1, Math.min(maxCols || 1, parsed.series.length));
              onChange({ series: parsed.series.slice(0, keep), rows: parsed.rows.map((r) => ({ ...r, values: r.values.slice(0, keep) })) });
              setPaste(null);
              setPasteError(false);
            }}
          >
            {t("usePasted")}
          </button>
        </div>
      )}
    </div>
  );
}

function NumberCell({ value, label, onChange }: { value: number; label: string; onChange: (raw: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      dir="ltr"
      className="input h-7 w-20 px-1.5 py-0 text-end text-xs tabular-nums"
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
