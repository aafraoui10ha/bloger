import type { Align, NumberFormat } from "./model";

/** Intl locale for numbers. Arabic designs use Western digits, as is common in Morocco. */
export function numberLocale(locale: string): string {
  return locale === "ar" ? "ar-u-nu-latn" : locale === "fr" ? "fr-FR" : "en-US";
}

/** Formats a chart value. Percent values are entered as percentages (45 → 45 %). */
export function formatValue(value: number, f: NumberFormat, locale: string): string {
  if (!Number.isFinite(value)) return "–";
  const digits = Math.max(0, Math.min(6, Math.round(f.decimals)));
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (f.compact) {
    opts.notation = "compact";
    opts.maximumFractionDigits = Math.max(digits, 1);
    opts.minimumFractionDigits = 0;
  }
  let v = value;
  if (f.style === "percent") {
    opts.style = "percent";
    v = value / 100;
  } else if (f.style === "currency") {
    opts.style = "currency";
    opts.currency = /^[A-Z]{3}$/.test(f.currency) ? f.currency : "USD";
  }
  let out: string;
  try {
    out = new Intl.NumberFormat(numberLocale(locale), opts).format(v);
  } catch {
    out = String(value);
  }
  return `${f.prefix}${out}${f.suffix}`;
}

/** Parses a number typed by a user ("1 234,5", "1,234.5", "12%"). Returns null if empty/invalid. */
export function parseNumber(input: string): number | null {
  let s = input.trim().replace(/[\s  %]/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!s) return null;
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

// ---- Text layout ---------------------------------------------------------------

export type Measure = (text: string, fontCss: string) => number;

/** Rough width estimate used outside the browser (tests, server). */
export const estimateMeasure: Measure = (text, fontCss) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(fontCss)?.[1] ?? 16);
  return text.length * size * 0.55;
};

let canvasCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
/** Browser text measurement with the real (loaded) font. */
export const canvasMeasure: Measure = (text, fontCss) => {
  if (!canvasCtx) {
    if (typeof OffscreenCanvas !== "undefined") canvasCtx = new OffscreenCanvas(1, 1).getContext("2d");
    else if (typeof document !== "undefined") canvasCtx = document.createElement("canvas").getContext("2d");
  }
  if (!canvasCtx) return estimateMeasure(text, fontCss);
  canvasCtx.font = fontCss;
  return canvasCtx.measureText(text).width;
};

/** Greedy word wrap; very long words are broken by characters. Explicit newlines are kept. */
export function wrapText(text: string, maxWidth: number, measure: Measure, fontCss: string, letterSpacing = 0): string[] {
  const width = (s: string) => measure(s, fontCss) + letterSpacing * s.length;
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth || !line) {
        if (!line && width(word) > maxWidth) {
          // Break an over-long word.
          let part = "";
          for (const ch of word) {
            if (part && width(part + ch) > maxWidth) {
              out.push(part);
              part = ch;
            } else part += ch;
          }
          line = part;
        } else line = candidate;
      } else {
        out.push(line);
        line = word;
        if (width(word) > maxWidth) {
          let part = "";
          for (const ch of word) {
            if (part && width(part + ch) > maxWidth) {
              out.push(part);
              part = ch;
            } else part += ch;
          }
          line = part;
        }
      }
    }
    out.push(line);
  }
  return out;
}

/** SVG text-anchor for a visual alignment, taking the text direction into account. */
export function textAnchor(align: Align, dir: "ltr" | "rtl"): "start" | "middle" | "end" {
  if (align === "center") return "middle";
  const startSide = dir === "rtl" ? "right" : "left";
  return align === startSide ? "start" : "end";
}

/** x coordinate of the anchor point inside a box for a visual alignment. */
export function anchorX(align: Align, x: number, w: number): number {
  return align === "left" ? x : align === "right" ? x + w : x + w / 2;
}

export const fontCss = (weight: number, size: number, stack: string) => `${weight} ${Math.max(1, size)}px ${stack}`;
