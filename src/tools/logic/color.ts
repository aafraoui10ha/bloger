export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

export function parseHex(input: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function parseRgb(input: string): Rgb | null {
  const m = /^\s*(?:rgba?\s*\()?\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)?\s*$/i.exec(input);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number) as [number, number, number];
  if ([r, g, b].some((v) => v > 255)) return null;
  return { r, g, b };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** WCAG relative luminance, used to show contrast against white and black. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const lum = ({ r, g, b }: Rgb) => {
    const f = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

const wrapHue = (h: number) => ((h % 360) + 360) % 360;
const hexFromHsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb({ h: wrapHue(h), s: Math.max(0, Math.min(100, s)), l: Math.max(0, Math.min(100, l)) }));

export type Harmony = "complementary" | "analogous" | "triadic" | "splitComplementary" | "monochromatic";
export const HARMONIES: Harmony[] = ["complementary", "analogous", "triadic", "splitComplementary", "monochromatic"];

/** Colour-wheel combinations for a base colour (base colour first). */
export function harmony(baseHex: string, kind: Harmony): string[] {
  const rgb = parseHex(baseHex);
  if (!rgb) return [];
  const { h, s, l } = rgbToHsl(rgb);
  const base = rgbToHex(rgb);
  switch (kind) {
    case "complementary":
      return [base, hexFromHsl(h + 180, s, l), hexFromHsl(h, s, l > 50 ? l - 25 : l + 25), hexFromHsl(h + 180, s, l > 50 ? l - 25 : l + 25)];
    case "analogous":
      return [hexFromHsl(h - 30, s, l), base, hexFromHsl(h + 30, s, l), hexFromHsl(h + 60, s, l)];
    case "triadic":
      return [base, hexFromHsl(h + 120, s, l), hexFromHsl(h + 240, s, l)];
    case "splitComplementary":
      return [base, hexFromHsl(h + 150, s, l), hexFromHsl(h + 210, s, l)];
    case "monochromatic":
      return [-30, -15, 0, 15, 30].map((d) => (d === 0 ? base : hexFromHsl(h, s, l + d)));
  }
}

export type WcagLevel = "AAA" | "AA" | "AA-large" | "fail";
/** WCAG 2.x rating for normal text (AA-large: only for text ≥ 24px or bold ≥ 18.7px). */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/** Black or white, whichever is more readable on the given background. */
export function readableOn(hex: string): "#000000" | "#FFFFFF" {
  const rgb = parseHex(hex);
  if (!rgb) return "#000000";
  return contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >= contrastRatio(rgb, { r: 255, g: 255, b: 255 }) ? "#000000" : "#FFFFFF";
}

/** A pleasant random palette: one random hue, spread with harmony and lightness steps. */
export function randomPalette(random: () => number = Math.random): string[] {
  const h = Math.floor(random() * 360);
  const s = 45 + Math.floor(random() * 40);
  const scheme = Math.floor(random() * 3);
  const offsets = scheme === 0 ? [0, 30, 60, 180, 210] : scheme === 1 ? [0, 120, 240, 20, 140] : [0, 0, 0, 180, 180];
  const lights = scheme === 2 ? [20, 40, 65, 45, 85] : [30, 50, 65, 45, 85];
  return offsets.map((o, i) => hexFromHsl(h + o, i === 4 ? s / 3 : s, lights[i]!));
}
