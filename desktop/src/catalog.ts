import catalog from "./generated/catalog.json";
import type { ToolModuleKey } from "@/tools/registry";
import type { Locale } from "./shell/store";

export type DesktopTool = {
  key: ToolModuleKey;
  category: string;
  icon: string;
  wide: boolean;
  title: Record<Locale, string>;
  short: Record<Locale, string>;
};

export const TOOLS = catalog.tools as DesktopTool[];
const BY_KEY = new Map(TOOLS.map((t) => [t.key, t]));
export const getTool = (key: string) => BY_KEY.get(key as ToolModuleKey);

/** Real categories, plus "colors", a cross-category view of the colour tools. */
export const CATEGORIES = ["image", "design", "colors", "text", "calculators", "developer"] as const;
export type CategoryId = (typeof CATEGORIES)[number];
const COLOR_TOOLS = new Set<string>(["color-palettes", "pattern-generator", "color-converter", "chart-designer"]);

export function toolsIn(category: CategoryId): DesktopTool[] {
  return category === "colors" ? TOOLS.filter((t) => COLOR_TOOLS.has(t.key)) : TOOLS.filter((t) => t.category === category);
}

/** Accent-insensitive search over the localised title and description. */
export function searchTools(query: string, locale: Locale): DesktopTool[] {
  const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = norm(query.trim());
  if (!q) return TOOLS;
  return TOOLS.filter((t) => norm(`${t.title[locale]} ${t.short[locale]} ${t.title.en}`).includes(q));
}

export const FEATURED: ToolModuleKey[] = ["chart-designer", "background-remover", "color-palettes", "image-compressor", "pattern-generator", "image-resizer"];
