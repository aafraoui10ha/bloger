import { describe, expect, it } from "vitest";
import { contrastRatio, harmony, HARMONIES, hslToRgb, parseHex, randomPalette, readableOn, rgbToHsl, wcagLevel } from "@/tools/logic/color";
import { colorFamily, PALETTE_CATEGORIES, PALETTES, paletteMatches } from "@/tools/designer/palettes";
import { DEFAULT_PATTERN, PATTERN_GROUPS, PATTERN_TYPES, patternCss, patternSvg, patternTile, seeded } from "@/tools/designer/patterns";

describe("palette library", () => {
  it("has ten valid five-colour palettes in each of the eleven categories", () => {
    expect(PALETTE_CATEGORIES).toHaveLength(11);
    expect(PALETTES).toHaveLength(110);
    for (const c of PALETTE_CATEGORIES) expect(PALETTES.filter((p) => p.category === c)).toHaveLength(10);
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(110);
    for (const p of PALETTES) {
      expect(p.colors).toHaveLength(5);
      for (const c of p.colors) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
  it("classifies colours into families and filters palettes", () => {
    expect(colorFamily("#E63946")).toBe("red");
    expect(colorFamily("#2A9D8F")).toBe("teal");
    expect(colorFamily("#457B9D")).toBe("blue");
    expect(colorFamily("#808080")).toBe("neutral");
    expect(colorFamily("#FFBE0B")).toBe("yellow");
    const p = PALETTES.find((x) => x.id === "luxury-1")!;
    expect(paletteMatches(p, { category: "luxury" })).toBe(true);
    expect(paletteMatches(p, { category: "pastel" })).toBe(false);
    expect(paletteMatches(p, { query: "#8a2a" })).toBe(true);
    expect(paletteMatches(p, { family: "purple" })).toBe(true);
  });
});

describe("colour harmonies and contrast", () => {
  it("converts HSL to RGB and back", () => {
    for (const hex of ["#290044", "#500071", "#8A2A78", "#EEE3B0", "#2A9D8F"]) {
      const rgb = parseHex(hex)!;
      const back = hslToRgb(rgbToHsl(rgb));
      expect(Math.abs(back.r - rgb.r) + Math.abs(back.g - rgb.g) + Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(6);
    }
  });
  it("builds the five harmony types from a base colour", () => {
    for (const h of HARMONIES) {
      const cols = harmony("#3366CC", h);
      expect(cols.length).toBeGreaterThanOrEqual(3);
      for (const c of cols) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
    const comp = harmony("#FF0000", "complementary");
    expect(rgbToHsl(parseHex(comp[1]!)!).h).toBe(180);
    const tri = harmony("#FF0000", "triadic").map((c) => rgbToHsl(parseHex(c)!).h);
    expect(tri).toEqual([0, 120, 240]);
    expect(harmony("not a colour", "analogous")).toEqual([]);
  });
  it("rates contrast with the WCAG thresholds", () => {
    expect(wcagLevel(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }))).toBe("AAA");
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(3.2)).toBe("AA-large");
    expect(wcagLevel(2.9)).toBe("fail");
    expect(readableOn("#290044")).toBe("#FFFFFF");
    expect(readableOn("#EEE3B0")).toBe("#000000");
  });
  it("generates reproducible random palettes", () => {
    const a = randomPalette(seeded(42)), b = randomPalette(seeded(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBeGreaterThan(2);
  });
});

describe("pattern generator", () => {
  it("draws every pattern type with valid geometry", () => {
    expect(Object.values(PATTERN_GROUPS).flat().sort()).toEqual([...PATTERN_TYPES].sort());
    for (const type of PATTERN_TYPES) {
      for (const scale of [5, 40, 100]) {
        const tile = patternTile({ ...DEFAULT_PATTERN, type, scale });
        expect(tile.w, type).toBeGreaterThan(0);
        expect(tile.body, type).not.toMatch(/NaN|Infinity|undefined/);
        expect(tile.body.length, type).toBeGreaterThan(20);
      }
    }
  });
  it("exports SVG with a unique, safe pattern id and the chosen size", () => {
    const svg = patternSvg({ ...DEFAULT_PATTERN, rotation: 30 }, 1200, 800, "thumb-dots");
    expect(svg).toContain('width="1200" height="800"');
    expect(svg).toContain('<pattern id="thumb-dots"');
    expect(svg).toContain('fill="url(#thumb-dots)"');
    expect(svg).toContain("rotate(30)");
    expect(patternSvg(DEFAULT_PATTERN, 10, 10, "a\"><script>")).not.toContain("<script>");
    expect(patternSvg({ ...DEFAULT_PATTERN, transparent: true }, 10, 10)).not.toContain(DEFAULT_PATTERN.background);
  });
  it("exports CSS backgrounds, noting when a rotation cannot tile perfectly", () => {
    const css = patternCss(DEFAULT_PATTERN);
    expect(css).toContain(`background-color: ${DEFAULT_PATTERN.background};`);
    expect(css).toContain('background-image: url("data:image/svg+xml,');
    expect(css).toContain("background-size: 40px 40px;");
    expect(patternCss({ ...DEFAULT_PATTERN, rotation: 45 })).toContain("/*");
    expect(patternCss({ ...DEFAULT_PATTERN, rotation: 90 })).not.toContain("/*");
    expect(patternCss({ ...DEFAULT_PATTERN, transparent: true })).not.toContain("background-color");
  });
  it("keeps abstract patterns reproducible from their seed", () => {
    const a = patternTile({ ...DEFAULT_PATTERN, type: "confetti", seed: 9 });
    const b = patternTile({ ...DEFAULT_PATTERN, type: "confetti", seed: 9 });
    const c = patternTile({ ...DEFAULT_PATTERN, type: "confetti", seed: 10 });
    expect(a.body).toBe(b.body);
    expect(a.body).not.toBe(c.body);
  });
});
