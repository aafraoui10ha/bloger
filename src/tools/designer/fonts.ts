// Self-hosted font library for the Chart Designer (all SIL Open Font License).
// Files live in /fonts/designer/ (copied by scripts/fonts/sync-fonts.mjs).
import catalog from "./fonts.json";

export type FontCategory = "sans" | "business" | "serif" | "display" | "arabic";
export type FontDef = { id: string; family: string; category: FontCategory; weights: number[]; subsets: ("latin" | "arabic")[] };

export const FONTS = catalog as FontDef[];
export const FONT_CATEGORIES: FontCategory[] = ["sans", "business", "serif", "display", "arabic"];
const BY_ID = new Map(FONTS.map((f) => [f.id, f]));
export const getFont = (id: string): FontDef => BY_ID.get(id) ?? FONTS[0]!;

/** Arabic glyphs fall back to this font when a Latin-only font is selected. */
export const ARABIC_FALLBACK = "cairo";

/** Heading/body combinations offered in the Text panel. */
export const FONT_PAIRINGS: { id: string; heading: string; body: string }[] = [
  { id: "modern", heading: "poppins", body: "inter" },
  { id: "editorial", heading: "playfair-display", body: "lora" },
  { id: "swiss", heading: "inter", body: "inter" },
  { id: "tech", heading: "space-grotesk", body: "dm-sans" },
  { id: "corporate", heading: "ibm-plex-sans", body: "ibm-plex-sans" },
  { id: "magazine", heading: "dm-serif-display", body: "dm-sans" },
  { id: "bold", heading: "bebas-neue", body: "montserrat" },
  { id: "classic", heading: "merriweather", body: "inter" },
  { id: "arabicModern", heading: "cairo", body: "tajawal" },
  { id: "arabicCorporate", heading: "ibm-plex-sans-arabic", body: "ibm-plex-sans-arabic" },
  { id: "arabicClassic", heading: "amiri", body: "cairo" },
];

/** Closest available weight for a font (falls back to the nearest one). */
export function nearestWeight(font: FontDef, weight: number): number {
  return font.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), font.weights[0]!);
}

/** CSS font-family value, with the Arabic fallback after Latin-only fonts. */
export function fontStack(id: string): string {
  const f = getFont(id);
  const fallback = f.subsets.includes("arabic") ? "" : `, '${getFont(ARABIC_FALLBACK).family}'`;
  return `'${f.family}'${fallback}, sans-serif`;
}

export const fontUrl = (id: string, subset: string, weight: number) => `/fonts/designer/${id}-${subset}-${weight}.woff2`;
// Same ranges as the @fontsource subsets.
const RANGES = {
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  arabic: "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC4, U+10EFC-10EFF, U+1EE00-1EEFF",
};

function faceRule(f: FontDef, subset: "latin" | "arabic", weight: number, src: string): string {
  return `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${weight};font-display:block;src:url(${src}) format('woff2');unicode-range:${RANGES[subset]};}`;
}

/** @font-face rules for every font in the library (used by the editor page). */
export function libraryFontCss(): string {
  return FONTS.flatMap((f) => f.subsets.flatMap((s) => f.weights.map((w) => faceRule(f, s, w, fontUrl(f.id, s, w))))).join("\n");
}

export type FontUse = { id: string; weight: number };
export const hasArabic = (s: string) => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);

/** Makes sure the browser has the given fonts ready before text is measured or exported. */
export async function loadFonts(uses: FontUse[], arabic: boolean): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const list = [...uses, ...(arabic ? uses.map((u) => ({ id: ARABIC_FALLBACK, weight: u.weight })) : [])];
  await Promise.all(
    list.map(({ id, weight }) => {
      const f = getFont(id);
      const w = nearestWeight(f, weight);
      return document.fonts.load(`${w} 16px '${f.family}'`, arabic ? "Aaال" : "Aa").catch(() => []);
    }),
  );
}

const embedded = new Map<string, Promise<string>>();
async function dataUrl(url: string): Promise<string> {
  let p = embedded.get(url);
  if (!p) {
    p = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Font ${url}: HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `data:font/woff2;base64,${btoa(bin)}`;
    })();
    p.catch(() => embedded.delete(url));
    embedded.set(url, p);
  }
  return p;
}

/**
 * @font-face rules with the font files inlined, for exported SVG files and for
 * rasterising (an SVG drawn as an image cannot load external fonts).
 */
export async function embeddedFontCss(uses: FontUse[], arabic: boolean): Promise<string> {
  const wanted = new Map<string, { f: FontDef; subset: "latin" | "arabic"; weight: number }>();
  const add = (id: string, weight: number) => {
    const f = getFont(id);
    const w = nearestWeight(f, weight);
    for (const s of f.subsets) {
      if (s === "arabic" && !arabic) continue;
      wanted.set(`${f.id}-${s}-${w}`, { f, subset: s, weight: w });
    }
  };
  for (const u of uses) {
    add(u.id, u.weight);
    if (arabic && !getFont(u.id).subsets.includes("arabic")) add(ARABIC_FALLBACK, u.weight);
  }
  const rules = await Promise.all([...wanted.values()].map(async ({ f, subset, weight }) => faceRule(f, subset, weight, await dataUrl(fontUrl(f.id, subset, weight)))));
  return rules.join("\n");
}
