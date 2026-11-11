// Design templates. Each one is a function of the canvas size and language, so the
// layout adapts to every preset (square, portrait, story, landscape, A4).
import { estimateMeasure, wrapText } from "./format";
import { fontStack } from "./fonts";
import {
  DEFAULT_FORMAT, newId, type ChartEl, type ChartKind, type ChartRow, type Doc, type El, type IconEl, type NumberFormat, type ShapeEl, type TextEl, type TextRole,
} from "./model";
import type { PatternConfig } from "./patterns";
import { months, samplesFor, type Samples } from "./samples";

export const TEMPLATE_IDS = ["editorial", "corporate", "tech", "finance", "marketing", "social", "premium", "colorful", "swiss", "magazine", "timeline", "dashboard"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

type Theme = {
  bg: string;
  text: string;
  muted: string;
  grid: string;
  surface: string;
  colors: string[];
  heading: string;
  body: string;
  arHeading: string;
  arBody: string;
  pattern?: PatternConfig;
};

type B = { W: number; H: number; locale: string; rtl: boolean; s: Samples; u: number; m: number; wide: boolean; theme: Theme };

const roleWeight: Record<TextRole, number> = { title: 800, subtitle: 400, body: 400, caption: 400 };

function font(b: B, role: TextRole) {
  const heading = role === "title";
  return b.locale === "ar" ? (heading ? b.theme.arHeading : b.theme.arBody) : heading ? b.theme.heading : b.theme.body;
}

function text(b: B, o: { text: string; role: TextRole; x: number; y: number; w: number; size: number } & Partial<TextEl>): TextEl {
  const el: TextEl = {
    id: newId("text"),
    type: "text",
    h: 0,
    rotation: 0,
    opacity: 1,
    font: font(b, o.role),
    weight: roleWeight[o.role],
    color: o.role === "title" || o.role === "body" ? b.theme.text : b.theme.muted,
    align: b.rtl ? "right" : "left",
    lineHeight: o.role === "title" ? 1.12 : 1.3,
    letterSpacing: 0,
    dir: "auto",
    ...o,
  };
  const lines = wrapText(el.text, el.w, estimateMeasure, `${el.weight} ${el.size}px ${fontStack(el.font)}`);
  el.h = Math.max(el.size, lines.length * el.size * el.lineHeight);
  return el;
}

function chart(b: B, kind: ChartKind, box: { x: number; y: number; w: number; h: number }, data: { series: string[]; rows: ChartRow[] }, o: Partial<ChartEl> = {}): ChartEl {
  return {
    id: newId("chart"),
    type: "chart",
    kind,
    variant: "",
    ...box,
    rotation: 0,
    opacity: 1,
    series: data.series,
    rows: data.rows,
    colors: b.theme.colors,
    colorByRow: false,
    font: font(b, "body"),
    textColor: b.theme.text,
    mutedColor: b.theme.muted,
    gridColor: b.theme.grid,
    surfaceColor: b.theme.surface,
    labelSize: 22 * b.u,
    valueSize: 24 * b.u,
    showLegend: data.series.length > 1,
    showValues: true,
    showGrid: true,
    showAxis: true,
    smooth: true,
    radius: 8 * b.u,
    lineWidth: 4 * b.u,
    thickness: 38,
    max: 100,
    format: { ...DEFAULT_FORMAT },
    dir: "auto",
    ...o,
  };
}

function shape(b: B, shapeKind: ShapeEl["shape"], box: { x: number; y: number; w: number; h: number }, fill: string, o: Partial<ShapeEl> = {}): ShapeEl {
  return { id: newId("shape"), type: "shape", shape: shapeKind, ...box, rotation: 0, opacity: 1, fill, stroke: "#000000", strokeWidth: 0, radius: 0, ...o };
}

function icon(name: string, box: { x: number; y: number; w: number; h: number }, color: string): IconEl {
  return { id: newId("icon"), type: "icon", icon: name, ...box, rotation: 0, opacity: 1, color, strokeWidth: 2 };
}

/** Title + subtitle block; returns the elements and the y below them. */
function header(b: B, key: keyof Samples["t"] | string, o: { align?: TextEl["align"]; titleSize?: number; top?: number; x?: number; w?: number } = {}) {
  const t = b.s.t[key]!;
  const x = o.x ?? b.m, w = o.w ?? b.W - 2 * b.m;
  const title = text(b, { text: t.title, role: "title", x, y: o.top ?? b.m, w, size: (o.titleSize ?? 62) * b.u, align: o.align ?? (b.rtl ? "right" : "left") });
  const sub = text(b, { text: t.subtitle, role: "subtitle", x, y: title.y + title.h + 18 * b.u, w, size: 28 * b.u, align: title.align });
  return { els: [title, sub] as El[], bottom: sub.y + sub.h };
}

function footer(b: B, o: { color?: string; align?: TextEl["align"] } = {}) {
  const size = 18 * b.u;
  const y = b.H - b.m - size * 1.3;
  return { els: [text(b, { text: b.s.source, role: "caption", x: b.m, y, w: b.W - 2 * b.m, size, color: o.color ?? b.theme.muted, align: o.align ?? (b.rtl ? "right" : "left") })] as El[], top: y };
}

const rows = (labels: string[], ...cols: number[][]): ChartRow[] => labels.map((label, i) => ({ label, values: cols.map((c) => c[i] ?? 0) }));
const money = (currency: string): NumberFormat => ({ ...DEFAULT_FORMAT, style: "currency", currency, compact: false });
const pct: NumberFormat = { ...DEFAULT_FORMAT, style: "percent" };

const THEMES: Record<TemplateId, Theme> = {
  editorial: { bg: "#F7F3EA", text: "#1F1B16", muted: "#6B645A", grid: "#E2DACB", surface: "#EDE6D6", colors: ["#1F1B16", "#B5543C", "#8C857B", "#D9B88F"], heading: "playfair-display", body: "lora", arHeading: "amiri", arBody: "cairo" },
  corporate: { bg: "#FFFFFF", text: "#0A2342", muted: "#5B6B82", grid: "#E3E8EF", surface: "#F1F5F9", colors: ["#0A4D8C", "#2CA58D", "#F2A541", "#84BCDA", "#E15554"], heading: "ibm-plex-sans", body: "ibm-plex-sans", arHeading: "ibm-plex-sans-arabic", arBody: "ibm-plex-sans-arabic" },
  tech: { bg: "#0B1021", text: "#F1F5FF", muted: "#9AA6C7", grid: "#1E2747", surface: "#151C38", colors: ["#5EEAD4", "#818CF8", "#F472B6", "#FBBF24"], heading: "space-grotesk", body: "dm-sans", arHeading: "cairo", arBody: "tajawal", pattern: { type: "grid", background: "#0B1021", transparent: true, primary: "#1A2342", secondary: "#2A3560", size: 54, scale: 40, stroke: 1, rotation: 0, opacity: 1, seed: 3 } },
  finance: { bg: "#FFFFFF", text: "#13293D", muted: "#5F6F7F", grid: "#E6EBF0", surface: "#F3F6F9", colors: ["#13293D", "#1B998B", "#E9C46A", "#E76F51"], heading: "merriweather", body: "inter", arHeading: "amiri", arBody: "ibm-plex-sans-arabic" },
  marketing: { bg: "#FFF8F0", text: "#2B193D", muted: "#6D5A7B", grid: "#F1E4D8", surface: "#F6E9DD", colors: ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC"], heading: "poppins", body: "poppins", arHeading: "cairo", arBody: "cairo" },
  social: { bg: "#FDF1F4", text: "#3B1F2B", muted: "#7A5C68", grid: "#F2D9E1", surface: "#FFFFFF", colors: ["#E2557A", "#7C6FD6", "#2BB3A3", "#F2A541"], heading: "montserrat", body: "montserrat", arHeading: "tajawal", arBody: "tajawal" },
  premium: { bg: "#0D0D0D", text: "#F5EFE0", muted: "#A89F8C", grid: "#2A2722", surface: "#1E1C19", colors: ["#C9A227", "#E8D9A8", "#8C7A55", "#F5EFE0"], heading: "dm-serif-display", body: "dm-sans", arHeading: "amiri", arBody: "tajawal" },
  colorful: { bg: "#FFFFFF", text: "#1D1A2F", muted: "#5E5A75", grid: "#ECEAF4", surface: "#F4F2FA", colors: ["#7209B7", "#F72585", "#4CC9F0", "#FFBE0B"], heading: "archivo-black", body: "dm-sans", arHeading: "cairo", arBody: "tajawal", pattern: { type: "dots", background: "#FFFFFF", transparent: true, primary: "#F1EEFA", secondary: "#FCE4F0", size: 36, scale: 22, stroke: 2, rotation: 0, opacity: 1, seed: 1 } },
  swiss: { bg: "#FFFFFF", text: "#111111", muted: "#555555", grid: "#E5E5E5", surface: "#F2F2F2", colors: ["#E30613", "#111111", "#9E9E9E", "#D4D4D4"], heading: "inter", body: "inter", arHeading: "ibm-plex-sans-arabic", arBody: "ibm-plex-sans-arabic" },
  magazine: { bg: "#F2EEE6", text: "#1A1423", muted: "#62586B", grid: "#DCD4C6", surface: "#E8E1D4", colors: ["#B75D69", "#372549", "#C9A227", "#4F7C77"], heading: "dm-serif-display", body: "dm-sans", arHeading: "amiri", arBody: "cairo" },
  timeline: { bg: "#290044", text: "#EEE3B0", muted: "#CDBCD5", grid: "#5A2A7A", surface: "#290044", colors: ["#EEE3B0", "#E8A6C9", "#C9A227", "#8AD1C2", "#F2A541"], heading: "poppins", body: "inter", arHeading: "cairo", arBody: "tajawal" },
  dashboard: { bg: "#FAF7EA", text: "#290044", muted: "#5D4A69", grid: "#E6DDBD", surface: "#FFFFFF", colors: ["#500071", "#8A2A78", "#C9A227", "#2A9D8F"], heading: "poppins", body: "inter", arHeading: "cairo", arBody: "tajawal" },
};

type Builder = (b: B) => El[];

const BUILDERS: Record<TemplateId, Builder> = {
  editorial: (b) => {
    const rule = shape(b, "rect", { x: b.m, y: b.m, w: 90 * b.u, h: 8 * b.u }, b.theme.colors[1]!);
    const h = header(b, "editorial", { top: b.m + 40 * b.u, x: b.rtl ? b.m : b.m });
    if (b.rtl) rule.x = b.W - b.m - rule.w;
    const f = footer(b);
    const top = h.bottom + 50 * b.u;
    const c = chart(b, "bar", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 30 * b.u }, { series: [b.s.series.revenue], rows: rows(months(b.locale, 6), [42, 48, 51, 58, 63, 71]) }, { colorByRow: false, radius: 2 * b.u, showLegend: false, colors: ["#1F1B16"] });
    return [rule, ...h.els, c, ...f.els];
  },
  corporate: (b) => {
    const band = shape(b, "rect", { x: 0, y: 0, w: b.W, h: 14 * b.u }, b.theme.colors[0]!);
    const h = header(b, "corporate", { top: b.m + 10 * b.u });
    const f = footer(b);
    const top = h.bottom + 44 * b.u;
    const kpiH = Math.min(220 * b.u, (f.top - top) * 0.32);
    const kpi = chart(b, "kpi", { x: b.m, y: top, w: b.W - 2 * b.m, h: kpiH }, { series: [b.s.series.revenue], rows: b.s.kpi.slice(0, b.wide ? 4 : 2).map((k, i) => ({ label: k.label, note: k.note, values: [[4.2, 1240, 87, 64][i]!] })) }, { variant: "cards", radius: 14 * b.u, valueSize: 26 * b.u, format: { ...DEFAULT_FORMAT, compact: true, decimals: 1 } });
    const cTop = top + kpiH + 40 * b.u;
    const c = chart(b, "hbar", { x: b.m, y: cTop, w: b.W - 2 * b.m, h: f.top - cTop - 24 * b.u }, { series: [b.s.series.revenue], rows: rows(b.s.categories.slice(0, 5), [320, 270, 210, 160, 90]) }, { colorByRow: false, radius: 6 * b.u, showGrid: false, showAxis: false, format: money(b.locale === "en" ? "USD" : b.locale === "fr" ? "EUR" : "MAD") });
    return [band, ...h.els, kpi, c, ...f.els];
  },
  tech: (b) => {
    const h = header(b, "tech");
    const f = footer(b);
    const top = h.bottom + 50 * b.u;
    const c = chart(b, "area", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 30 * b.u }, { series: [b.s.series.thisYear, b.s.series.lastYear], rows: rows(months(b.locale, 8), [12, 18, 26, 31, 39, 47, 58, 66], [8, 11, 14, 19, 22, 27, 30, 35]) }, { showValues: false, lineWidth: 5 * b.u });
    const glow = shape(b, "ellipse", { x: b.rtl ? -120 * b.u : b.W - 260 * b.u, y: -120 * b.u, w: 380 * b.u, h: 380 * b.u }, "#818CF8", { opacity: 0.18 });
    return [glow, ...h.els, c, ...f.els];
  },
  finance: (b) => {
    const h = header(b, "finance");
    const f = footer(b);
    const top = h.bottom + 44 * b.u;
    const avail = f.top - top - 24 * b.u;
    const kpiH = avail * (b.wide ? 0.42 : 0.38);
    const cur = b.locale === "en" ? "USD" : b.locale === "fr" ? "EUR" : "MAD";
    const kpi = chart(b, "kpi", { x: b.m, y: top, w: b.W - 2 * b.m, h: kpiH }, { series: [b.s.series.revenue], rows: b.s.kpi.slice(0, b.wide ? 3 : 2).map((k, i) => ({ label: k.label, note: k.note, values: [[4_200_000, 1240, 87][i]!] })) }, { variant: "cards", radius: 10 * b.u, format: { ...money(cur), compact: true, decimals: 1 } });
    const cTop = top + kpiH + 36 * b.u;
    const c = chart(b, "line", { x: b.m, y: cTop, w: b.W - 2 * b.m, h: f.top - cTop - 24 * b.u }, { series: [b.s.series.revenue, b.s.series.costs], rows: rows(["Q1", "Q2", "Q3", "Q4"], [0.9, 1.0, 1.1, 1.2], [0.7, 0.72, 0.75, 0.78]) }, { format: { ...money(cur), compact: true, decimals: 1 }, smooth: false });
    return [...h.els, kpi, c, ...f.els];
  },
  marketing: (b) => {
    const h = header(b, "marketing", { align: "center" });
    const f = footer(b, { align: "center" });
    const top = h.bottom + 40 * b.u;
    const data = { series: [b.s.series.share], rows: rows(b.s.channels, [38, 27, 16, 12, 7]) };
    if (b.wide) {
      const cw = (b.W - 2 * b.m - 60 * b.u) / 2;
      const d = chart(b, "doughnut", { x: b.rtl ? b.m + cw + 60 * b.u : b.m, y: top, w: cw, h: f.top - top - 20 * b.u }, data, { colorByRow: true, showLegend: false, format: pct, thickness: 36 });
      const p = chart(b, "progress", { x: b.rtl ? b.m : b.m + cw + 60 * b.u, y: top, w: cw, h: f.top - top - 20 * b.u }, data, { variant: "bars", colorByRow: true, format: pct, max: 100 });
      return [...h.els, d, p, ...f.els];
    }
    const d = chart(b, "doughnut", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 20 * b.u }, data, { colorByRow: true, showLegend: true, format: pct, thickness: 36 });
    return [...h.els, d, ...f.els];
  },
  social: (b) => {
    const h = header(b, "social", { align: "center", titleSize: 66 });
    const f = footer(b, { align: "center" });
    const top = h.bottom + 50 * b.u;
    const c = chart(b, "infographic", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 30 * b.u }, { series: [b.s.series.reach], rows: b.s.facts.map((fa, i) => ({ label: fa.label, note: fa.note, icon: ["users", "smile", "globe", "timer"][i], values: [[2_400_000, 96, 38, 1200][i]!] })) }, { variant: b.wide ? "grid" : "list", format: { ...DEFAULT_FORMAT, compact: true, decimals: 0 } });
    const blobA = shape(b, "blob", { x: -140 * b.u, y: b.H - 260 * b.u, w: 380 * b.u, h: 340 * b.u }, "#F7C9D6", { opacity: 0.7 });
    return [blobA, ...h.els, c, ...f.els];
  },
  premium: (b) => {
    const frame = shape(b, "rect", { x: b.m / 2, y: b.m / 2, w: b.W - b.m, h: b.H - b.m }, "none", { stroke: "#C9A227", strokeWidth: 2 * b.u });
    const h = header(b, "premium", { align: "center", titleSize: 70, top: b.m * 1.3 });
    const f = footer(b, { align: "center" });
    const top = h.bottom + 60 * b.u;
    const c = chart(b, "progress", { x: b.m * 1.2, y: top, w: b.W - 2.4 * b.m, h: f.top - top - 40 * b.u }, { series: [b.s.series.score], rows: rows(b.s.kpi.map((k) => k.label).slice(0, b.wide ? 4 : 4), [92, 78, 64, 85]) }, { variant: "rings", format: pct, thickness: 14, max: 100, radius: 1 });
    return [frame, ...h.els, c, ...f.els];
  },
  colorful: (b) => {
    const h = header(b, "colorful", { titleSize: 60 });
    const f = footer(b);
    const top = h.bottom + 50 * b.u;
    const c = chart(b, "comparison", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 30 * b.u }, { series: [b.s.series.thisYear, b.s.series.lastYear], rows: rows(b.s.regions, [84, 66, 72, 51], [70, 61, 58, 49]) }, { radius: 12 * b.u, colors: ["#7209B7", "#F72585"] });
    const dots = shape(b, "dots", { x: b.rtl ? b.m : b.W - b.m - 180 * b.u, y: b.m, w: 180 * b.u, h: 120 * b.u }, "#4CC9F0", { radius: 30 * b.u });
    return [dots, ...h.els, c, ...f.els];
  },
  swiss: (b) => {
    const t = b.s.t.swiss!;
    const big = text(b, { text: t.title, role: "title", x: b.m, y: b.m, w: b.W - 2 * b.m, size: 200 * b.u, color: b.theme.colors[0], weight: 800, lineHeight: 1 });
    const sub = text(b, { text: t.subtitle, role: "subtitle", x: b.m, y: big.y + big.h + 10 * b.u, w: (b.W - 2 * b.m) * 0.8, size: 38 * b.u, color: b.theme.text, weight: 700 });
    if (b.rtl) sub.x = b.W - b.m - sub.w;
    const rule = shape(b, "rect", { x: b.m, y: sub.y + sub.h + 36 * b.u, w: b.W - 2 * b.m, h: 3 * b.u }, b.theme.text);
    const note = text(b, { text: t.note ?? "", role: "caption", x: b.m, y: rule.y + 24 * b.u, w: b.W - 2 * b.m, size: 22 * b.u });
    const f = footer(b);
    const top = note.y + note.h + 30 * b.u;
    const c = chart(b, "bar", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 24 * b.u }, { series: ["%"], rows: rows(["Q1", "Q2", "Q3", "Q4"], [52, 57, 61, 64]) }, { colorByRow: true, colors: ["#D4D4D4", "#D4D4D4", "#D4D4D4", "#E30613"], radius: 0, showGrid: false, showAxis: false, format: pct, showLegend: false });
    return [big, sub, rule, note, c, ...f.els];
  },
  magazine: (b) => {
    const sideW = b.wide ? (b.W - 2 * b.m) * 0.38 : b.W - 2 * b.m;
    const h = header(b, "magazine", { titleSize: b.wide ? 72 : 76, w: sideW, x: b.rtl && b.wide ? b.W - b.m - sideW : b.m });
    const f = footer(b);
    const box = b.wide
      ? { x: b.rtl ? b.m : b.m + sideW + 40 * b.u, y: b.m, w: b.W - 2 * b.m - sideW - 40 * b.u, h: f.top - b.m - 20 * b.u }
      : { x: b.m, y: h.bottom + 40 * b.u, w: b.W - 2 * b.m, h: f.top - h.bottom - 60 * b.u };
    const c = chart(b, "radar", box, { series: [b.s.series.thisYear, b.s.series.lastYear], rows: rows(b.s.skills, [8.6, 7.4, 9.1, 6.8, 8.9, 7.9], [7.1, 6.9, 7.8, 6.5, 8.1, 6.2]) }, { format: { ...DEFAULT_FORMAT, decimals: 0 }, smooth: false });
    const mark = shape(b, "arc", { x: b.rtl ? b.W - b.m - 120 * b.u : b.m, y: b.H - b.m - 60 * b.u - 30 * b.u, w: 120 * b.u, h: 60 * b.u }, b.theme.colors[0]!, { opacity: 0.9 });
    return [...h.els, c, mark, ...f.els];
  },
  timeline: (b) => {
    const h = header(b, "timeline", { align: "center" });
    const f = footer(b, { align: "center" });
    const top = h.bottom + 50 * b.u;
    const c = chart(b, "timeline", { x: b.m, y: top, w: b.W - 2 * b.m, h: f.top - top - 30 * b.u }, { series: [""], rows: b.s.steps.map((st) => ({ label: st.label, note: st.note, values: [0] })) }, { variant: b.W / b.H >= 1 ? "horizontal" : "vertical", valueSize: 30 * b.u, labelSize: 22 * b.u });
    const wave = shape(b, "wave", { x: b.m, y: b.H - b.m / 2 - 20 * b.u, w: b.W - 2 * b.m, h: 24 * b.u }, "#8A2A78", { strokeWidth: 4 * b.u });
    return [...h.els, c, wave, ...f.els];
  },
  dashboard: (b) => {
    const h = header(b, "dashboard");
    const f = footer(b);
    const logo = icon("sparkles", { x: b.rtl ? b.m : b.W - b.m - 56 * b.u, y: b.m, w: 56 * b.u, h: 56 * b.u }, b.theme.colors[1]!);
    const top = h.bottom + 40 * b.u;
    const avail = f.top - top - 20 * b.u;
    const kpiH = avail * 0.36;
    const kpi = chart(b, "kpi", { x: b.m, y: top, w: b.W - 2 * b.m, h: kpiH }, { series: [""], rows: b.s.kpi.map((k, i) => ({ label: k.label, note: k.note, values: [[128_000, 1240, 87, 64][i]!] })) }, { variant: "cards", radius: 16 * b.u, format: { ...DEFAULT_FORMAT, compact: true, decimals: 0 } });
    const cTop = top + kpiH + 30 * b.u;
    const ch = f.top - cTop - 20 * b.u;
    const half = (b.W - 2 * b.m - 30 * b.u) / 2;
    const bar = chart(b, "bar", { x: b.rtl ? b.m + half + 30 * b.u : b.m, y: cTop, w: half, h: ch }, { series: [b.s.series.revenue], rows: rows(months(b.locale, 5, 4), [21, 25, 24, 29, 33]) }, { showLegend: false, showAxis: false, radius: 8 * b.u, labelSize: 18 * b.u, valueSize: 18 * b.u });
    const pie = chart(b, "pie", { x: b.rtl ? b.m : b.m + half + 30 * b.u, y: cTop, w: half, h: ch }, { series: [b.s.series.share], rows: rows(b.s.channels.slice(0, 4), [45, 25, 18, 12]) }, { colorByRow: true, format: pct, labelSize: 18 * b.u, valueSize: 18 * b.u, showLegend: true, radius: 0 });
    return [...h.els, logo, kpi, bar, pie, ...f.els];
  },
};

/** Builds a new document from a template at the given size and language. */
export function buildTemplate(id: TemplateId, width: number, height: number, locale: string, name: string): Doc {
  const theme = THEMES[id];
  const u = Math.min(width, height) / 1080;
  const b: B = { W: width, H: height, locale, rtl: locale === "ar", s: samplesFor(locale), u, m: Math.round(Math.min(width, height) * 0.07), wide: width / height > 1.25, theme };
  return {
    id: newId("doc"),
    name,
    width,
    height,
    background: { color: theme.bg, transparent: false, pattern: theme.pattern ? { ...theme.pattern } : null },
    elements: BUILDERS[id](b),
    locale,
    updatedAt: Date.now(),
  };
}

/** Theme colours of a template, shown as a palette preview in the template list. */
export function templateColors(id: TemplateId): string[] {
  const t = THEMES[id];
  return [t.bg, ...t.colors.slice(0, 3)];
}

export function blankDoc(width: number, height: number, locale: string, name: string): Doc {
  return { id: newId("doc"), name, width, height, background: { color: "#FFFFFF", transparent: false, pattern: null }, elements: [], locale, updatedAt: Date.now() };
}
