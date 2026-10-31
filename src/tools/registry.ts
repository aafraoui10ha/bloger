/**
 * Version-controlled registry of tool modules. A dashboard Tool record must
 * reference one of these keys; administrators configure metadata and content,
 * but can never supply executable code.
 */
export const TOOL_MODULES = {
  "image-compressor": { category: "image", icon: "image-down", processing: "local" },
  "image-resizer": { category: "image", icon: "scaling", processing: "local" },
  "png-to-jpg": { category: "image", icon: "file-image", processing: "local" },
  "jpg-to-png": { category: "image", icon: "file-image", processing: "local" },
  "image-to-webp": { category: "image", icon: "file-type", processing: "local" },
  "image-inspector": { category: "image", icon: "file-search", processing: "local" },
  "background-remover": { category: "image", icon: "scissors", processing: "local" },
  "word-counter": { category: "text", icon: "type", processing: "local" },
  "text-cleaner": { category: "text", icon: "eraser", processing: "local" },
  "case-converter": { category: "text", icon: "case-sensitive", processing: "local" },
  "percentage-calculator": { category: "calculators", icon: "percent", processing: "local" },
  "discount-calculator": { category: "calculators", icon: "tag", processing: "local" },
  "average-calculator": { category: "calculators", icon: "sigma", processing: "local" },
  "qr-code-generator": { category: "developer", icon: "qr-code", processing: "local" },
  "json-formatter": { category: "developer", icon: "braces", processing: "local" },
  "color-converter": { category: "developer", icon: "palette", processing: "local" },
  "unit-converter": { category: "calculators", icon: "ruler", processing: "local" },
  "base64-converter": { category: "developer", icon: "binary", processing: "local" },
  "url-encoder": { category: "developer", icon: "link", processing: "local" },
  "password-generator": { category: "developer", icon: "key-round", processing: "local" },
  "uuid-generator": { category: "developer", icon: "dices", processing: "local" },
  "hash-generator": { category: "developer", icon: "hash", processing: "local" },
  "timestamp-converter": { category: "developer", icon: "clock", processing: "local" },
  "bmi-calculator": { category: "calculators", icon: "heart-pulse", processing: "local" },
  "age-calculator": { category: "calculators", icon: "cake", processing: "local" },
  "loan-calculator": { category: "calculators", icon: "landmark", processing: "local" },
  "lorem-ipsum-generator": { category: "text", icon: "pilcrow", processing: "local" },
  "chart-designer": { category: "design", icon: "chart-pie", processing: "local", wide: true },
  "color-palettes": { category: "design", icon: "swatch-book", processing: "local" },
  "pattern-generator": { category: "design", icon: "layout-grid", processing: "local" },
} as const satisfies Record<string, { category: string; icon: string; processing: "local" | "server"; wide?: boolean }>;

/** Tools that need the full page width (editors). */
export function isWideTool(key: ToolModuleKey): boolean {
  return "wide" in TOOL_MODULES[key] && TOOL_MODULES[key].wide === true;
}

export type ToolModuleKey = keyof typeof TOOL_MODULES;

export function isToolModuleKey(key: string): key is ToolModuleKey {
  return Object.prototype.hasOwnProperty.call(TOOL_MODULES, key);
}

/** Icon names administrators may choose from (rendered from an allow-listed icon map). */
export const TOOL_ICONS = [
  "image-down", "scaling", "file-image", "file-type", "file-search", "type", "eraser", "case-sensitive",
  "percent", "tag", "sigma", "qr-code", "braces", "palette", "ruler", "binary", "link", "wrench", "image",
  "calculator", "code", "text", "key-round", "dices", "hash", "clock", "heart-pulse", "cake", "landmark", "pilcrow", "scissors", "chart-pie", "swatch-book", "layout-grid",
] as const;
export type ToolIcon = (typeof TOOL_ICONS)[number];
