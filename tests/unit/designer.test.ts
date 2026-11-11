import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { anchorX, estimateMeasure, formatValue, parseNumber, textAnchor, wrapText } from "@/tools/designer/format";
import { createHistory, HISTORY_LIMIT, pushHistory, redo, undo } from "@/tools/designer/history";
import { CANVAS_PRESETS, CHART_KINDS, DEFAULT_FORMAT, fontsUsed, resizeDoc, resolveDir, type ChartEl, type Doc, type TextEl } from "@/tools/designer/model";
import { blankDoc, buildTemplate, TEMPLATE_IDS } from "@/tools/designer/templates";
import { createChart, createText, changeKind, sampleData } from "@/tools/designer/factories";
import { ChartGraphic } from "@/tools/designer/charts";
import { DocSvg, layoutText } from "@/tools/designer/render";
import { clampScale, fileName, MAX_CANVAS_AREA, MAX_CANVAS_SIDE, pdfLayout, supportsTransparency } from "@/tools/designer/export";
import { FONTS, FONT_PAIRINGS, fontStack, getFont, nearestWeight, ARABIC_FALLBACK, hasArabic } from "@/tools/designer/fonts";
import { parsePastedTable, seriesLimits } from "@/tools/designer/ui/DataEditor";

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("number formatting", () => {
  it("formats numbers, percentages, currencies and compact values per locale", () => {
    expect(formatValue(1234.5, { ...DEFAULT_FORMAT, decimals: 1 }, "en")).toBe("1,234.5");
    expect(formatValue(1234.5, { ...DEFAULT_FORMAT, decimals: 1 }, "fr")).toMatch(/^1\s234,5$/u);
    expect(formatValue(45, { ...DEFAULT_FORMAT, style: "percent" }, "en")).toBe("45%");
    expect(formatValue(1500, { ...DEFAULT_FORMAT, style: "currency", currency: "EUR" }, "fr")).toMatch(/1\s500\s€/u);
    expect(formatValue(2_400_000, { ...DEFAULT_FORMAT, compact: true }, "en")).toBe("2.4M");
    expect(formatValue(12, { ...DEFAULT_FORMAT, prefix: "≈", suffix: " kg" }, "en")).toBe("≈12 kg");
    expect(formatValue(Number.NaN, DEFAULT_FORMAT, "en")).toBe("–");
  });
  it("uses Western digits for Arabic designs", () => {
    expect(formatValue(1240, DEFAULT_FORMAT, "ar")).toMatch(/^[0-9,٬]+$/);
  });
  it("parses numbers typed in different conventions", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1 234,5")).toBe(1234.5);
    expect(parseNumber("12%")).toBe(12);
    expect(parseNumber("١٢٣")).toBe(123);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("text layout and direction", () => {
  const font = "400 20px 'Inter'";
  it("wraps words to the width and keeps explicit line breaks", () => {
    const lines = wrapText("one two three four five six", 100, estimateMeasure, font);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(estimateMeasure(l, font)).toBeLessThanOrEqual(100);
    expect(wrapText("a\nb", 500, estimateMeasure, font)).toEqual(["a", "b"]);
  });
  it("breaks words that are longer than the box", () => {
    const lines = wrapText("Supercalifragilisticexpialidocious", 60, estimateMeasure, font);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("Supercalifragilisticexpialidocious");
  });
  it("maps visual alignment to SVG anchors in both directions", () => {
    expect(textAnchor("left", "ltr")).toBe("start");
    expect(textAnchor("right", "ltr")).toBe("end");
    expect(textAnchor("right", "rtl")).toBe("start");
    expect(textAnchor("left", "rtl")).toBe("end");
    expect(textAnchor("center", "rtl")).toBe("middle");
    expect(anchorX("right", 10, 100)).toBe(110);
    expect(anchorX("center", 10, 100)).toBe(60);
  });
  it("detects the direction from the first strong character", () => {
    expect(resolveDir("auto", "مرحبا Hello")).toBe("rtl");
    expect(resolveDir("auto", "2025 Hello مرحبا")).toBe("ltr");
    expect(resolveDir("ltr", "مرحبا")).toBe("ltr");
    expect(hasArabic("Revenue الإيرادات")).toBe(true);
  });
  it("computes text height from the wrapped lines", () => {
    const doc = blankDoc(1080, 1080, "en", "t");
    const el = createText(doc, "body", "word ".repeat(40));
    const { lines, height } = layoutText({ ...el, w: 300 }, estimateMeasure);
    expect(height).toBeCloseTo(lines.length * el.size * el.lineHeight);
  });
});

describe("undo history", () => {
  it("undoes and redoes, merging consecutive changes with the same key", () => {
    let h = createHistory(0);
    h = pushHistory(h, 1, null, 0);
    h = pushHistory(h, 2, "typing", 100);
    h = pushHistory(h, 3, "typing", 200); // merged with the previous step
    expect(h.present).toBe(3);
    h = undo(h);
    expect(h.present).toBe(1);
    h = undo(h);
    expect(h.present).toBe(0);
    h = redo(redo(h));
    expect(h.present).toBe(3);
    expect(undo(createHistory(5)).present).toBe(5);
  });
  it("starts a new step after the merge window and caps the history", () => {
    let h = createHistory(0);
    h = pushHistory(h, 1, "k", 0);
    h = pushHistory(h, 2, "k", 5000);
    expect(undo(h).present).toBe(1);
    let big = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) big = pushHistory(big, i);
    expect(big.past.length).toBe(HISTORY_LIMIT);
  });
});

describe("templates", () => {
  const hasNaN = (s: string) => /NaN|Infinity/.test(s);
  for (const locale of ["en", "fr", "ar"]) {
    it(`builds every template at every canvas size in ${locale} without invalid geometry`, () => {
      for (const id of TEMPLATE_IDS) {
        for (const p of CANVAS_PRESETS) {
          const doc = buildTemplate(id, p.width, p.height, locale, id);
          expect(doc.elements.length).toBeGreaterThan(2);
          for (const el of doc.elements) {
            for (const v of [el.x, el.y, el.w, el.h]) expect(Number.isFinite(v)).toBe(true);
            expect(el.w).toBeGreaterThan(0);
            expect(el.x + el.w).toBeLessThanOrEqual(p.width * 1.25);
          }
          const svg = render(createElement(DocSvg, { doc, measure: estimateMeasure }));
          expect(hasNaN(svg)).toBe(false);
        }
      }
    });
  }
  it("uses Arabic-capable fonts and right alignment in Arabic templates", () => {
    for (const id of TEMPLATE_IDS) {
      const doc = buildTemplate(id, 1080, 1080, "ar", id);
      for (const el of doc.elements.filter((e): e is TextEl => e.type === "text")) {
        expect(getFont(el.font).subsets).toContain("arabic");
        expect(["right", "center"]).toContain(el.align);
      }
      const svg = render(createElement(DocSvg, { doc, measure: estimateMeasure }));
      expect(svg).toContain('direction="rtl"');
    }
  });
  it("scales the layout when the canvas is resized", () => {
    const doc = buildTemplate("corporate", 1080, 1080, "en", "x");
    const big = resizeDoc(doc, 2160, 2160);
    const t0 = doc.elements.find((e): e is TextEl => e.type === "text")!;
    const t1 = big.elements.find((e) => e.id === t0.id) as TextEl;
    expect(t1.x).toBeCloseTo(t0.x * 2);
    expect(t1.size).toBeCloseTo(t0.size * 2);
    expect(resizeDoc(doc, 10, 99999).width).toBe(100);
  });
});

describe("charts", () => {
  const doc: Doc = blankDoc(1080, 1080, "en", "c");
  for (const locale of ["en", "ar"]) {
    it(`renders every chart type with sample data in ${locale}`, () => {
      for (const kind of CHART_KINDS) {
        const el = { ...createChart({ ...doc, locale }, kind, ["#111111", "#222222", "#333333"]), w: 800, h: 500 };
        const svg = render(createElement("svg", null, createElement(ChartGraphic, { el, measure: estimateMeasure, locale })));
        expect(svg, kind).not.toMatch(/NaN|Infinity|undefined/);
        expect(svg.length, kind).toBeGreaterThan(200);
        expect(svg, kind).toContain(el.rows[0]!.label.slice(0, 2));
      }
    });
  }
  it("draws bar heights proportional to the values", () => {
    const el: ChartEl = { ...createChart(doc, "bar", ["#111111"]), w: 600, h: 400, series: ["A"], rows: [{ label: "x", values: [10] }, { label: "y", values: [20] }], showValues: false, showLegend: false, showAxis: false, radius: 0 };
    const svg = render(createElement("svg", null, createElement(ChartGraphic, { el, measure: estimateMeasure, locale: "en" })));
    const heights = [...svg.matchAll(/<path d="M[\d.]+ ([\d.]+)H[\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+V([\d.]+)/g)].map((m) => Number(m[2]) - Number(m[1]));
    expect(heights).toHaveLength(2);
    expect(heights[1]! / heights[0]!).toBeCloseTo(2, 1);
  });
  it("mirrors the category order for right-to-left charts", () => {
    const base: ChartEl = { ...createChart(doc, "bar", ["#111111"]), w: 600, h: 400, series: ["A"], rows: [{ label: "first", values: [5] }, { label: "last", values: [5] }], showLegend: false };
    const xOf = (svg: string, label: string) => Number(new RegExp(`x="([\\d.]+)"[^>]*>${label}<`).exec(svg)?.[1]);
    const ltr = render(createElement("svg", null, createElement(ChartGraphic, { el: { ...base, dir: "ltr" }, measure: estimateMeasure, locale: "en" })));
    const rtl = render(createElement("svg", null, createElement(ChartGraphic, { el: { ...base, dir: "rtl" }, measure: estimateMeasure, locale: "ar" })));
    expect(xOf(ltr, "first")).toBeLessThan(xOf(ltr, "last"));
    expect(xOf(rtl, "first")).toBeGreaterThan(xOf(rtl, "last"));
    expect(rtl).toContain('direction="rtl"');
  });
  it("draws one pie slice per category", () => {
    const el = { ...createChart(doc, "pie", ["#111111", "#222222", "#333333", "#444444", "#555555"]), w: 500, h: 500, showLegend: false, showValues: false };
    const svg = render(createElement("svg", null, createElement(ChartGraphic, { el, measure: estimateMeasure, locale: "en" })));
    expect((svg.match(/<path /g) ?? []).length).toBe(el.rows.length);
  });
  it("keeps compatible data when switching chart types", () => {
    const bar = createChart(doc, "bar", ["#111111"]);
    const line = changeKind({ ...bar, rows: [{ label: "Q1", values: [7, 8] }] }, "line", "en");
    expect(line.rows[0]!.label).toBe("Q1");
    const tl = changeKind(bar, "timeline", "en");
    expect(tl.rows.every((r) => typeof r.note === "string")).toBe(true);
    expect(sampleData("scatter", "fr").series).toHaveLength(2);
    expect(seriesLimits("comparison")).toEqual([2, 2]);
  });
});

describe("spreadsheet paste", () => {
  it("reads tab, semicolon and comma separated tables with or without a header", () => {
    expect(parsePastedTable("Month\tSales\tCosts\nJan\t120\t80\nFeb\t150\t95")).toEqual({ series: ["Sales", "Costs"], rows: [{ label: "Jan", values: [120, 80] }, { label: "Feb", values: [150, 95] }] });
    expect(parsePastedTable("Nord;1 200,5\nSud;900")!.rows).toEqual([{ label: "Nord", values: [1200.5] }, { label: "Sud", values: [900] }]);
    expect(parsePastedTable("الشمال,10\nالجنوب,20")!.rows[1]).toEqual({ label: "الجنوب", values: [20] });
    expect(parsePastedTable("just one column")).toBeNull();
  });
});

describe("export settings", () => {
  it("lays out PDF pages with orientation, margins and the requested DPI", () => {
    const a4 = pdfLayout(1080, 1350, { page: "a4", orientation: "auto", marginMm: 10, widthMm: 0, heightMm: 0, dpi: 300 });
    expect([a4.pageW, a4.pageH]).toEqual([595.28, 841.89]);
    expect(a4.drawW / a4.drawH).toBeCloseTo(1080 / 1350);
    expect(a4.x).toBeGreaterThanOrEqual(28.3);
    expect((1080 * a4.scale) / (a4.drawW / 72)).toBeCloseTo(300);
    const land = pdfLayout(1920, 1080, { page: "a4", orientation: "auto", marginMm: 0, widthMm: 0, heightMm: 0, dpi: 150 });
    expect(land.pageW).toBeGreaterThan(land.pageH);
    const forced = pdfLayout(1920, 1080, { page: "letter", orientation: "portrait", marginMm: 0, widthMm: 0, heightMm: 0, dpi: 150 });
    expect([forced.pageW, forced.pageH]).toEqual([612, 792]);
    const design = pdfLayout(1200, 627, { page: "design", orientation: "auto", marginMm: 20, widthMm: 0, heightMm: 0, dpi: 300 });
    expect([design.pageW, design.pageH, design.x]).toEqual([900, 470.25, 0]);
    const custom = pdfLayout(1000, 1000, { page: "custom", orientation: "portrait", marginMm: 0, widthMm: 100, heightMm: 100, dpi: 300 });
    expect(custom.pageW).toBeCloseTo(283.46, 1);
  });
  it("limits raster size to what browsers support", () => {
    expect(clampScale(1080, 1080, 4)).toBe(4);
    const s = clampScale(5000, 5000, 4);
    expect(5000 * s).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(5000 * s * 5000 * s).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
    expect(supportsTransparency("jpg")).toBe(false);
    expect(supportsTransparency("png")).toBe(true);
  });
  it("builds safe file names in every script", () => {
    expect(fileName("Q3 Report: Sales/Costs", "png")).toBe("q3-report-sales-costs.png");
    expect(fileName("لوحة الأداء", "pdf")).toBe("لوحة-الأداء.pdf");
    expect(fileName("Été 2025", "svg")).toBe("ete-2025.svg");
    expect(fileName("***", "jpg")).toBe("design.jpg");
  });
});

describe("font library", () => {
  it("ships every font file it declares, with its licence", () => {
    const dir = path.join(process.cwd(), "public/fonts/designer");
    for (const f of FONTS) {
      expect(fs.existsSync(path.join(dir, `${f.id}.LICENSE.txt`))).toBe(true);
      for (const s of f.subsets) for (const w of f.weights) expect(fs.existsSync(path.join(dir, `${f.id}-${s}-${w}.woff2`)), `${f.id}-${s}-${w}`).toBe(true);
    }
  });
  it("includes Cairo, Tajawal, IBM Plex Sans Arabic and Amiri, and Arabic fallbacks for Latin fonts", () => {
    for (const id of ["cairo", "tajawal", "ibm-plex-sans-arabic", "amiri"]) expect(getFont(id).subsets).toContain("arabic");
    expect(fontStack("inter")).toContain(getFont(ARABIC_FALLBACK).family);
    expect(fontStack("cairo")).not.toContain("', 'Cairo'");
    expect(nearestWeight(getFont("bebas-neue"), 700)).toBe(400);
    for (const p of FONT_PAIRINGS) expect(FONTS.some((f) => f.id === p.heading) && FONTS.some((f) => f.id === p.body)).toBe(true);
  });
  it("lists the fonts a design uses for embedding", () => {
    const doc = buildTemplate("editorial", 1080, 1080, "en", "x");
    const used = fontsUsed(doc).map((u) => u.id);
    expect(used).toContain("playfair-display");
    expect(used).toContain("lora");
  });
});

describe("designer messages", () => {
  const load = (l: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${l}.json`), "utf8"));
  const flat = (o: Record<string, unknown>, p = ""): [string, string][] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)]]));
  const vars = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();
  const en = Object.fromEntries(["designer", "palettes", "patterns"].flatMap((ns) => flat(load("en")[ns], `${ns}.`)));
  for (const locale of ["fr", "ar"]) {
    it(`has every designer, palette and pattern string in ${locale} with the same placeholders`, () => {
      const m = Object.fromEntries(["designer", "palettes", "patterns"].flatMap((ns) => flat(load(locale)[ns], `${ns}.`)));
      for (const [k, v] of Object.entries(en)) {
        expect(m[k], k).toBeTruthy();
        expect(vars(m[k]!), k).toEqual(vars(v));
      }
    });
  }
});
