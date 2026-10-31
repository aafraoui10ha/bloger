export type ToolContent = {
  slug: string;
  title: string;
  short: string;
  about: string;
  steps: string[];
  examples: string[];
  faq: { q: string; a: string }[];
  seoTitle: string;
  seoDescription: string;
};

export type ToolKey =
  | "image-compressor" | "image-resizer" | "png-to-jpg" | "jpg-to-png" | "image-to-webp" | "image-inspector"
  | "word-counter" | "text-cleaner" | "case-converter"
  | "percentage-calculator" | "discount-calculator" | "average-calculator"
  | "qr-code-generator" | "json-formatter" | "color-converter" | "unit-converter" | "base64-converter" | "url-encoder";

export type ExtraToolKey =
  | "password-generator" | "uuid-generator" | "hash-generator" | "timestamp-converter"
  | "bmi-calculator" | "age-calculator" | "loan-calculator" | "lorem-ipsum-generator" | "background-remover";

export type DesignToolKey = "color-palettes" | "pattern-generator" | "chart-designer";

export type AnyToolKey = ToolKey | ExtraToolKey | DesignToolKey;

export type PageContent = { slug: string; title: string; html: string; seoDescription: string };
export type PageKey = "about" | "services" | "contact" | "privacy" | "terms" | "cookies" | "editorial-policy" | "corrections";
