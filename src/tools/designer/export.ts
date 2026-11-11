// Export pipeline: SVG (fonts embedded) → PNG / JPG (rasterised in the browser)
// → PDF (pdf-lib, loaded on demand). Everything runs locally; nothing is uploaded.
import { embeddedFontCss, hasArabic } from "./fonts";
import { allText, fontsUsed, type Doc } from "./model";

export type ExportFormat = "png" | "jpg" | "svg" | "pdf";
export type PdfPage = "design" | "a4" | "letter" | "custom";
export type PdfOptions = { page: PdfPage; orientation: "auto" | "portrait" | "landscape"; marginMm: number; widthMm: number; heightMm: number; dpi: number };
export type ExportOptions = { format: ExportFormat; scale: number; quality: number; transparent: boolean; pdf: PdfOptions };

export const DEFAULT_EXPORT: ExportOptions = {
  format: "png",
  scale: 2,
  quality: 0.92,
  transparent: false,
  pdf: { page: "a4", orientation: "auto", marginMm: 10, widthMm: 210, heightMm: 297, dpi: 300 },
};

/** Browsers refuse canvases above these limits. */
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_AREA = 100_000_000;

export function clampScale(width: number, height: number, scale: number): number {
  const bySide = MAX_CANVAS_SIDE / Math.max(width, height);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  return Math.max(0.1, Math.min(scale, bySide, byArea));
}

export function supportsTransparency(format: ExportFormat) {
  return format !== "jpg";
}

export function fileName(name: string, ext: string): string {
  // Drop Latin accents (é → e) but keep other combining marks such as the Arabic hamza.
  const base = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60);
  return `${base || "design"}.${ext}`;
}

/** Standalone SVG text for a rendered design: real size, fonts embedded, optional transparency. */
export async function serializeSvg(svg: SVGSVGElement, doc: Doc, transparent: boolean): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(doc.width));
  clone.setAttribute("height", String(doc.height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  if (transparent) clone.querySelector('[data-bg="1"]')?.remove();
  clone.querySelectorAll("[data-el]").forEach((n) => n.removeAttribute("data-el"));
  clone.querySelectorAll("[data-bg]").forEach((n) => n.removeAttribute("data-bg"));
  const css = await embeddedFontCss(fontsUsed(doc), hasArabic(allText(doc)));
  let defs = clone.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    clone.insertBefore(defs, clone.firstChild);
  }
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = css;
  defs.insertBefore(style, defs.firstChild);
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = doc.name;
  clone.insertBefore(title, clone.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "sync";
  img.src = url;
  await img.decode();
  return img;
}

/** Rasterises SVG text to PNG or JPEG. `background` fills transparent areas (needed for JPEG). */
export async function rasterize(svgText: string, width: number, height: number, scale: number, type: "image/png" | "image/jpeg", quality: number, background: string | null): Promise<{ blob: Blob; width: number; height: number }> {
  const s = clampScale(width, height, scale);
  const cw = Math.max(1, Math.round(width * s)), ch = Math.max(1, Math.round(height * s));
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cw, ch);
    };
    draw();
    // Some engines finish applying embedded fonts a moment after decode: draw again.
    await new Promise((r) => setTimeout(r, 60));
    draw();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) throw new Error("The image is too large for this browser. Choose a smaller scale.");
    return { blob, width: cw, height: ch };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const MM_TO_PT = 72 / 25.4;

/** Page size, image box (in points) and the raster scale needed for the chosen DPI. */
export function pdfLayout(docW: number, docH: number, o: PdfOptions) {
  let [pw, ph] =
    o.page === "design" ? [docW * 0.75, docH * 0.75] : o.page === "a4" ? [595.28, 841.89] : o.page === "letter" ? [612, 792] : [Math.max(20, o.widthMm) * MM_TO_PT, Math.max(20, o.heightMm) * MM_TO_PT];
  if (o.page !== "design") {
    const landscape = o.orientation === "landscape" || (o.orientation === "auto" && docW > docH);
    if (landscape !== pw > ph) [pw, ph] = [ph, pw];
  }
  const margin = o.page === "design" ? 0 : Math.max(0, Math.min(o.marginMm * MM_TO_PT, Math.min(pw, ph) / 3));
  const k = Math.min((pw - 2 * margin) / docW, (ph - 2 * margin) / docH);
  const drawW = docW * k, drawH = docH * k;
  const scale = ((drawW / 72) * Math.max(72, o.dpi)) / docW;
  return { pageW: pw, pageH: ph, x: (pw - drawW) / 2, y: (ph - drawH) / 2, drawW, drawH, scale };
}

/** One-page PDF with the design as a high-resolution image (fonts and Arabic shaping exactly as rendered). */
export async function buildPdf(image: Blob, kind: "png" | "jpg", doc: Doc, o: PdfOptions): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.name);
  pdf.setCreator("Chart Designer");
  pdf.setProducer("Chart Designer (pdf-lib)");
  pdf.setLanguage(doc.locale);
  const bytes = new Uint8Array(await image.arrayBuffer());
  const embedded = kind === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const l = pdfLayout(doc.width, doc.height, o);
  const page = pdf.addPage([l.pageW, l.pageH]);
  page.drawImage(embedded, { x: l.x, y: l.y, width: l.drawW, height: l.drawH });
  const out = await pdf.save();
  return new Blob([out as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
