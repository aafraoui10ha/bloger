"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ToolModuleKey } from "./registry";

function Loading() {
  return <div className="h-64 animate-pulse rounded-lg bg-surface-2" aria-hidden="true" />;
}


/** Each tool's code is loaded only on its own page. */
const COMPONENTS: Record<ToolModuleKey, ComponentType> = {
  "image-compressor": dynamic(() => import("./modules/image-tools").then((m) => m.ImageCompressor), { loading: Loading, ssr: false }),
  "image-resizer": dynamic(() => import("./modules/image-tools").then((m) => m.ImageResizer), { loading: Loading, ssr: false }),
  "png-to-jpg": dynamic(() => import("./modules/image-tools").then((m) => m.PngToJpg), { loading: Loading, ssr: false }),
  "jpg-to-png": dynamic(() => import("./modules/image-tools").then((m) => m.JpgToPng), { loading: Loading, ssr: false }),
  "image-to-webp": dynamic(() => import("./modules/image-tools").then((m) => m.ImageToWebp), { loading: Loading, ssr: false }),
  "image-inspector": dynamic(() => import("./modules/ImageInspector").then((m) => m.ImageInspector), { loading: Loading, ssr: false }),
  "background-remover": dynamic(() => import("./modules/BackgroundRemover").then((m) => m.BackgroundRemover), { loading: Loading, ssr: false }),
  "word-counter": dynamic(() => import("./modules/text-tools").then((m) => m.WordCounter), { loading: Loading, ssr: false }),
  "text-cleaner": dynamic(() => import("./modules/text-tools").then((m) => m.TextCleaner), { loading: Loading, ssr: false }),
  "case-converter": dynamic(() => import("./modules/text-tools").then((m) => m.CaseConverter), { loading: Loading, ssr: false }),
  "percentage-calculator": dynamic(() => import("./modules/calculator-tools").then((m) => m.PercentageCalculator), { loading: Loading, ssr: false }),
  "discount-calculator": dynamic(() => import("./modules/calculator-tools").then((m) => m.DiscountCalculator), { loading: Loading, ssr: false }),
  "average-calculator": dynamic(() => import("./modules/calculator-tools").then((m) => m.AverageCalculator), { loading: Loading, ssr: false }),
  "qr-code-generator": dynamic(() => import("./modules/developer-tools").then((m) => m.QrCodeGenerator), { loading: Loading, ssr: false }),
  "json-formatter": dynamic(() => import("./modules/developer-tools").then((m) => m.JsonFormatter), { loading: Loading, ssr: false }),
  "color-converter": dynamic(() => import("./modules/developer-tools").then((m) => m.ColorConverter), { loading: Loading, ssr: false }),
  "unit-converter": dynamic(() => import("./modules/developer-tools").then((m) => m.UnitConverter), { loading: Loading, ssr: false }),
  "base64-converter": dynamic(() => import("./modules/developer-tools").then((m) => m.Base64Converter), { loading: Loading, ssr: false }),
  "url-encoder": dynamic(() => import("./modules/developer-tools").then((m) => m.UrlEncoder), { loading: Loading, ssr: false }),
  "password-generator": dynamic(() => import("./modules/extra-tools").then((m) => m.PasswordGenerator), { loading: Loading, ssr: false }),
  "uuid-generator": dynamic(() => import("./modules/extra-tools").then((m) => m.UuidGenerator), { loading: Loading, ssr: false }),
  "hash-generator": dynamic(() => import("./modules/extra-tools").then((m) => m.HashGenerator), { loading: Loading, ssr: false }),
  "timestamp-converter": dynamic(() => import("./modules/extra-tools").then((m) => m.TimestampConverter), { loading: Loading, ssr: false }),
  "bmi-calculator": dynamic(() => import("./modules/extra-tools").then((m) => m.BmiCalculator), { loading: Loading, ssr: false }),
  "age-calculator": dynamic(() => import("./modules/extra-tools").then((m) => m.AgeCalculator), { loading: Loading, ssr: false }),
  "loan-calculator": dynamic(() => import("./modules/extra-tools").then((m) => m.LoanCalculator), { loading: Loading, ssr: false }),
  "lorem-ipsum-generator": dynamic(() => import("./modules/extra-tools").then((m) => m.LoremIpsumGenerator), { loading: Loading, ssr: false }),
  "chart-designer": dynamic(() => import("./designer/ui/ChartDesigner").then((m) => m.ChartDesigner), { loading: Loading, ssr: false }),
  "color-palettes": dynamic(() => import("./modules/color-design-tools").then((m) => m.ColorPaletteLibrary), { loading: Loading, ssr: false }),
  "pattern-generator": dynamic(() => import("./modules/color-design-tools").then((m) => m.PatternGenerator), { loading: Loading, ssr: false }),
};

export function ToolRenderer({ moduleKey }: { moduleKey: ToolModuleKey; toolKey: string }) {
  const Component = COMPONENTS[moduleKey];
  return <Component />;
}
