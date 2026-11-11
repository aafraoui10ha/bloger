// Document model for the Chart Designer. A design is a plain, serialisable object
// so it can be undone, saved to IndexedDB and exported without losing editability.
import type { PatternConfig } from "./patterns";

export type Align = "left" | "center" | "right";
export type Dir = "auto" | "ltr" | "rtl";
export type TextRole = "title" | "subtitle" | "body" | "caption";

type Base = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
};

export type TextEl = Base & {
  type: "text";
  text: string;
  role: TextRole;
  font: string;
  size: number;
  weight: number;
  color: string;
  align: Align;
  lineHeight: number;
  letterSpacing: number;
  dir: Dir;
  uppercase?: boolean;
};

export type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "star" | "ring" | "arc" | "wave" | "dots" | "blob";
export type ShapeEl = Base & {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
};

export type IconEl = Base & { type: "icon"; icon: string; color: string; strokeWidth: number };
export type ImageEl = Base & { type: "image"; src: string; fit: "contain" | "cover"; radius: number };

export const CHART_KINDS = [
  "bar", "hbar", "line", "area", "pie", "doughnut", "radar", "scatter", "comparison", "progress", "kpi", "timeline", "infographic",
] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export type NumberFormat = {
  style: "number" | "percent" | "currency";
  currency: string;
  decimals: number;
  prefix: string;
  suffix: string;
  compact: boolean;
};

export type ChartRow = { label: string; values: number[]; note?: string; icon?: string };

export type ChartEl = Base & {
  type: "chart";
  kind: ChartKind;
  /** Layout variant: progress "bars" | "rings", kpi "cards" | "plain", timeline "horizontal" | "vertical", infographic "list" | "grid". */
  variant: string;
  /** Series names (one per value column). */
  series: string[];
  rows: ChartRow[];
  colors: string[];
  /** Colour each category (row) instead of each series. */
  colorByRow: boolean;
  font: string;
  textColor: string;
  mutedColor: string;
  gridColor: string;
  /** Background of cards/tracks (KPI, progress, timeline). */
  surfaceColor: string;
  labelSize: number;
  valueSize: number;
  showLegend: boolean;
  showValues: boolean;
  showGrid: boolean;
  showAxis: boolean;
  smooth: boolean;
  /** Bar corner radius, line width, doughnut thickness (%) depending on kind. */
  radius: number;
  lineWidth: number;
  thickness: number;
  /** Maximum value for progress charts. */
  max: number;
  format: NumberFormat;
  dir: Dir;
};

export type El = TextEl | ShapeEl | IconEl | ImageEl | ChartEl;
export type ElType = El["type"];

export type Background = { color: string; transparent: boolean; pattern: PatternConfig | null };

export type Doc = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: Background;
  elements: El[];
  /** Locale the design was started in (affects default direction). */
  locale: string;
  updatedAt: number;
};

export type CanvasPreset = { id: string; width: number; height: number };
export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "instagramPost", width: 1080, height: 1080 },
  { id: "instagramPortrait", width: 1080, height: 1350 },
  { id: "instagramStory", width: 1080, height: 1920 },
  { id: "facebookPost", width: 1200, height: 630 },
  { id: "linkedinPost", width: 1200, height: 627 },
  { id: "presentation", width: 1920, height: 1080 },
  { id: "a4Portrait", width: 1240, height: 1754 },
  { id: "a4Landscape", width: 1754, height: 1240 },
];
export const MIN_SIZE = 100;
export const MAX_SIZE = 5000;

export const DEFAULT_FORMAT: NumberFormat = { style: "number", currency: "USD", decimals: 0, prefix: "", suffix: "", compact: false };

let counter = 0;
export function newId(prefix = "el"): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function isRtlLocale(locale: string) {
  return locale === "ar";
}

/** Resolves "auto" direction from the first strong character of the text. */
export function resolveDir(dir: Dir, sample: string): "ltr" | "rtl" {
  if (dir !== "auto") return dir;
  const m = /[A-Za-zÀ-ɏ]|[֐-ࣿיִ-﷿ﹰ-﻿]/.exec(sample);
  return m && /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(m[0]) ? "rtl" : "ltr";
}

/** Scales every element when the canvas size changes, keeping the layout. */
export function resizeDoc(doc: Doc, width: number, height: number): Doc {
  const w = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, width)));
  const h = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, height)));
  const sx = w / doc.width, sy = h / doc.height, sf = Math.min(sx, sy);
  const elements = doc.elements.map((el): El => {
    const box = { ...el, x: el.x * sx, y: el.y * sy, w: el.w * sx, h: el.h * sy };
    if (el.type === "text") return { ...box, size: Math.max(4, el.size * sf) } as TextEl;
    if (el.type === "chart") return { ...box, labelSize: Math.max(4, el.labelSize * sf), valueSize: Math.max(4, el.valueSize * sf) } as ChartEl;
    if (el.type === "icon" || el.type === "image") {
      // Keep icons and logos undistorted: scale uniformly around the scaled centre.
      const cw = el.w * sf, ch = el.h * sf;
      return { ...box, x: box.x + (box.w - cw) / 2, y: box.y + (box.h - ch) / 2, w: cw, h: ch } as El;
    }
    return box as El;
  });
  return { ...doc, width: w, height: h, elements };
}

/** Every font id and weight a design uses (for loading and embedding). */
export function fontsUsed(doc: Doc): { id: string; weight: number }[] {
  const seen = new Map<string, { id: string; weight: number }>();
  for (const el of doc.elements) {
    if (el.type === "text") seen.set(`${el.font}-${el.weight}`, { id: el.font, weight: el.weight });
    if (el.type === "chart") {
      for (const w of [400, 700]) seen.set(`${el.font}-${w}`, { id: el.font, weight: w });
    }
  }
  return [...seen.values()];
}

/** All text in the design (to decide whether Arabic glyphs are needed). */
export function allText(doc: Doc): string {
  return doc.elements
    .map((el) => (el.type === "text" ? el.text : el.type === "chart" ? [...el.series, ...el.rows.flatMap((r) => [r.label, r.note ?? ""])].join(" ") : ""))
    .join(" ");
}
