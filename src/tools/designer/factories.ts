// Creates new elements with sensible defaults, sized relative to the canvas.
import { DEFAULT_FORMAT, newId, type ChartEl, type ChartKind, type Doc, type IconEl, type ImageEl, type ShapeEl, type ShapeKind, type TextEl, type TextRole } from "./model";
import { months, samplesFor } from "./samples";

const unit = (doc: Doc) => Math.min(doc.width, doc.height) / 1080;
const rtl = (doc: Doc) => doc.locale === "ar";

/** Fonts for new elements: taken from the design's existing text when possible. */
function pickFont(doc: Doc, role: TextRole): string {
  const same = doc.elements.find((e): e is TextEl => e.type === "text" && e.role === role);
  if (same) return same.font;
  const any = doc.elements.find((e): e is TextEl => e.type === "text");
  if (any) return any.font;
  return doc.locale === "ar" ? "cairo" : "inter";
}

const TEXT_PRESET: Record<TextRole, { size: number; weight: number; lh: number }> = {
  title: { size: 64, weight: 800, lh: 1.12 },
  subtitle: { size: 34, weight: 600, lh: 1.25 },
  body: { size: 26, weight: 400, lh: 1.4 },
  caption: { size: 18, weight: 400, lh: 1.3 },
};

export function createText(doc: Doc, role: TextRole, text: string): TextEl {
  const u = unit(doc);
  const p = TEXT_PRESET[role];
  const w = doc.width * 0.7;
  const textColor = doc.elements.find((e): e is TextEl => e.type === "text")?.color ?? "#1A1423";
  return {
    id: newId("text"),
    type: "text",
    text,
    role,
    x: (doc.width - w) / 2,
    y: doc.height * 0.4,
    w,
    h: p.size * u * p.lh,
    rotation: 0,
    opacity: 1,
    font: pickFont(doc, role),
    size: p.size * u,
    weight: p.weight,
    color: textColor,
    align: "center",
    lineHeight: p.lh,
    letterSpacing: 0,
    dir: "auto",
  };
}

export function createShape(doc: Doc, shape: ShapeKind, fill: string): ShapeEl {
  const u = unit(doc);
  const size = 260 * u;
  const wide = shape === "line" || shape === "wave";
  const w = wide ? 420 * u : shape === "dots" ? 240 * u : size;
  const h = shape === "line" ? 8 * u : shape === "wave" ? 40 * u : shape === "arc" ? size / 2 : shape === "dots" ? 160 * u : size;
  return {
    id: newId("shape"),
    type: "shape",
    shape,
    x: (doc.width - w) / 2,
    y: (doc.height - h) / 2,
    w,
    h,
    rotation: 0,
    opacity: 1,
    fill,
    stroke: "#000000",
    strokeWidth: shape === "ring" ? 24 * u : shape === "wave" ? 6 * u : 0,
    radius: shape === "rect" ? 24 * u : shape === "dots" ? 32 * u : shape === "line" ? 1 : 0,
  };
}

export function createIcon(doc: Doc, icon: string, color: string): IconEl {
  const s = 140 * unit(doc);
  return { id: newId("icon"), type: "icon", icon, x: (doc.width - s) / 2, y: (doc.height - s) / 2, w: s, h: s, rotation: 0, opacity: 1, color, strokeWidth: 2 };
}

export function createImage(doc: Doc, src: string, naturalW: number, naturalH: number): ImageEl {
  const max = Math.min(doc.width, doc.height) * 0.4;
  const k = Math.min(1, max / Math.max(naturalW, naturalH));
  const w = Math.max(10, naturalW * k), h = Math.max(10, naturalH * k);
  return { id: newId("image"), type: "image", src, x: (doc.width - w) / 2, y: (doc.height - h) / 2, w, h, rotation: 0, opacity: 1, fit: "contain", radius: 0 };
}

/** Default variant per chart kind. */
export const VARIANTS: Partial<Record<ChartKind, string[]>> = {
  progress: ["bars", "rings"],
  kpi: ["cards", "plain"],
  timeline: ["horizontal", "vertical"],
  infographic: ["list", "grid"],
};

/** Sample data that suits each chart kind. */
export function sampleData(kind: ChartKind, locale: string): Pick<ChartEl, "series" | "rows" | "variant" | "colorByRow" | "format" | "max"> {
  const s = samplesFor(locale);
  const base = { variant: VARIANTS[kind]?.[0] ?? "", colorByRow: false, format: { ...DEFAULT_FORMAT }, max: 100 };
  switch (kind) {
    case "bar":
    case "line":
    case "area":
      return { ...base, series: [s.series.thisYear, s.series.lastYear], rows: months(locale, 6).map((label, i) => ({ label, values: [[32, 41, 38, 52, 58, 66][i]!, [28, 30, 35, 37, 44, 49][i]!] })) };
    case "hbar":
      return { ...base, series: [s.series.revenue], rows: s.categories.map((label, i) => ({ label, values: [[420, 360, 290, 210, 140][i]!] })) };
    case "pie":
    case "doughnut":
      return { ...base, colorByRow: true, format: { ...DEFAULT_FORMAT, style: "percent" }, series: [s.series.share], rows: s.channels.map((label, i) => ({ label, values: [[38, 27, 16, 12, 7][i]!] })) };
    case "radar":
      return { ...base, series: [s.series.thisYear, s.series.lastYear], rows: s.skills.map((label, i) => ({ label, values: [[8.6, 7.4, 9.1, 6.8, 8.9, 7.9][i]!, [7.1, 6.9, 7.8, 6.5, 8.1, 6.2][i]!] })) };
    case "scatter":
      return { ...base, series: [s.series.reach, s.series.engagement], rows: s.categories.map((label, i) => ({ label, values: [[12, 25, 38, 52, 70][i]!, [3.1, 4.2, 3.8, 5.6, 6.4][i]!] })) };
    case "comparison":
      return { ...base, series: [s.series.thisYear, s.series.lastYear], rows: s.regions.map((label, i) => ({ label, values: [[84, 66, 72, 51][i]!, [70, 61, 58, 49][i]!] })) };
    case "progress":
      return { ...base, colorByRow: true, format: { ...DEFAULT_FORMAT, style: "percent" }, series: [s.series.score], rows: s.kpi.map((k, i) => ({ label: k.label, values: [[92, 78, 64, 85][i]!] })) };
    case "kpi":
      return { ...base, format: { ...DEFAULT_FORMAT, compact: true }, series: [s.series.revenue], rows: s.kpi.slice(0, 3).map((k, i) => ({ label: k.label, note: k.note, values: [[128000, 1240, 87][i]!] })) };
    case "timeline":
      return { ...base, series: [""], rows: s.steps.slice(0, 4).map((st) => ({ label: st.label, note: st.note, values: [0] })) };
    case "infographic":
      return { ...base, format: { ...DEFAULT_FORMAT, compact: true }, series: [s.series.reach], rows: s.facts.slice(0, 3).map((f, i) => ({ label: f.label, note: f.note, icon: ["users", "smile", "globe"][i], values: [[2400000, 96, 38][i]!] })) };
  }
}

export function createChart(doc: Doc, kind: ChartKind, colors: string[]): ChartEl {
  const u = unit(doc);
  const w = doc.width * 0.8, h = Math.min(doc.height * 0.5, w * 0.75);
  const textEl = doc.elements.find((e): e is TextEl => e.type === "text" && e.role !== "title");
  const existing = doc.elements.find((e): e is ChartEl => e.type === "chart");
  return {
    id: newId("chart"),
    type: "chart",
    kind,
    ...sampleData(kind, doc.locale),
    x: (doc.width - w) / 2,
    y: (doc.height - h) / 2,
    w,
    h,
    rotation: 0,
    opacity: 1,
    colors: existing?.colors ?? colors,
    font: existing?.font ?? textEl?.font ?? (doc.locale === "ar" ? "cairo" : "inter"),
    textColor: existing?.textColor ?? textEl?.color ?? "#1A1423",
    mutedColor: existing?.mutedColor ?? "#5D4A69",
    gridColor: existing?.gridColor ?? "#E6DDBD",
    surfaceColor: existing?.surfaceColor ?? "#F4EED3",
    labelSize: 22 * u,
    valueSize: 24 * u,
    showLegend: true,
    showValues: true,
    showGrid: true,
    showAxis: true,
    smooth: true,
    radius: 8 * u,
    lineWidth: 4 * u,
    thickness: 38,
    dir: rtl(doc) ? "rtl" : "auto",
  };
}

/** Switches a chart to another kind, keeping its data when it fits. */
export function changeKind(el: ChartEl, kind: ChartKind, locale: string): ChartEl {
  const needsNotes = kind === "timeline" || kind === "kpi" || kind === "infographic";
  const hadNotes = el.rows.some((r) => r.note);
  const keepData = el.rows.length > 0 && (!needsNotes || hadNotes) && !(el.kind === "timeline" && kind !== "timeline");
  const sample = sampleData(kind, locale);
  return {
    ...el,
    kind,
    variant: VARIANTS[kind]?.[0] ?? "",
    ...(keepData ? {} : { series: sample.series, rows: sample.rows, format: sample.format }),
    colorByRow: kind === "pie" || kind === "doughnut" || kind === "progress" ? true : keepData ? el.colorByRow : sample.colorByRow,
  };
}
