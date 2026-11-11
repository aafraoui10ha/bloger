"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, X } from "lucide-react";
import { formatBytes } from "@/tools/logic/image";
import type { Measure } from "../format";
import type { Doc } from "../model";
import { DocSvg } from "../render";
import { buildPdf, clampScale, DEFAULT_EXPORT, downloadBlob, fileName, pdfLayout, rasterize, serializeSvg, supportsTransparency, type ExportFormat, type ExportOptions } from "../export";
import { NumberField, Segmented, SelectField, SliderField, Toggle } from "./controls";

type Result = { blob: Blob; url: string; previewUrl: string; width: number; height: number; page?: { w: number; h: number; x: number; y: number; dw: number; dh: number } };

export function ExportDialog({ doc, measure, onClose, onDownloaded }: { doc: Doc; measure: Measure; onClose: () => void; onDownloaded: (format: ExportFormat) => void }) {
  const t = useTranslations("designer.export");
  const locale = useLocale();
  const [opts, setOpts] = useState<ExportOptions>(() => ({ ...DEFAULT_EXPORT, transparent: doc.background.transparent, pdf: { ...DEFAULT_EXPORT.pdf } }));
  // Each generated file is tagged with the settings it was made from; the status follows from that.
  const [result, setResult] = useState<(Result & { key: string }) | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const transparent = opts.transparent && supportsTransparency(opts.format);
  const key = JSON.stringify([opts, transparent, doc.updatedAt, doc.id]);
  const status: "working" | "ready" | "error" = failure?.key === key ? "error" : result?.key === key ? "ready" : "working";
  const error = failure?.message ?? "";

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        if (!svgRef.current) throw new Error("Renderer not ready");
        const svgText = await serializeSvg(svgRef.current, doc, transparent);
        let r: Result;
        if (opts.format === "svg") {
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          r = { blob, url, previewUrl: url, width: doc.width, height: doc.height };
        } else if (opts.format === "png" || opts.format === "jpg") {
          const type = opts.format === "png" ? "image/png" : "image/jpeg";
          const img = await rasterize(svgText, doc.width, doc.height, opts.scale, type, opts.quality, opts.format === "jpg" ? "#FFFFFF" : null);
          const url = URL.createObjectURL(img.blob);
          r = { blob: img.blob, url, previewUrl: url, width: img.width, height: img.height };
        } else {
          const l = pdfLayout(doc.width, doc.height, opts.pdf);
          const kind = transparent ? "png" : "jpg";
          const img = await rasterize(svgText, doc.width, doc.height, l.scale, kind === "png" ? "image/png" : "image/jpeg", 0.95, kind === "jpg" ? "#FFFFFF" : null);
          const pdf = await buildPdf(img.blob, kind, doc, opts.pdf);
          r = { blob: pdf, url: URL.createObjectURL(pdf), previewUrl: URL.createObjectURL(img.blob), width: img.width, height: img.height, page: { w: l.pageW, h: l.pageH, x: l.x, y: l.y, dw: l.drawW, dh: l.drawH } };
        }
        if (cancelled) {
          URL.revokeObjectURL(r.url);
          URL.revokeObjectURL(r.previewUrl);
          return;
        }
        setResult((old) => {
          if (old) {
            URL.revokeObjectURL(old.url);
            if (old.previewUrl !== old.url) URL.revokeObjectURL(old.previewUrl);
          }
          return { ...r, key };
        });
      } catch (err) {
        if (cancelled) return;
        setFailure({ key, message: err instanceof Error ? err.message : String(err) });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [opts, doc, transparent, key]);

  useEffect(
    () => () => {
      setResult((old) => {
        if (old) {
          URL.revokeObjectURL(old.url);
          if (old.previewUrl !== old.url) URL.revokeObjectURL(old.previewUrl);
        }
        return null;
      });
    },
    [],
  );

  const set = (patch: Partial<ExportOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const setPdf = (patch: Partial<ExportOptions["pdf"]>) => setOpts((o) => ({ ...o, pdf: { ...o.pdf, ...patch } }));
  const effScale = clampScale(doc.width, doc.height, opts.scale);
  const ext = opts.format;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-2 sm:p-6" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="export-title" className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl outline-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="export-title" className="text-lg font-bold">
            {t("title")}
          </h2>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label={t("close")}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 overflow-auto md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4 border-b border-border p-4 md:border-e md:border-b-0">
            <Segmented label={t("format")} value={opts.format} onChange={(v) => set({ format: v })} options={(["png", "jpg", "svg", "pdf"] as const).map((f) => ({ value: f, label: f.toUpperCase() }))} />
            {(opts.format === "png" || opts.format === "jpg") && (
              <>
                <Segmented label={t("scale")} value={String(opts.scale)} onChange={(v) => set({ scale: Number(v) })} options={["1", "2", "3", "4"].map((s) => ({ value: s, label: `${s}×` }))} />
                <p className="text-xs text-muted">{t("resolution", { width: Math.round(doc.width * effScale), height: Math.round(doc.height * effScale) })}</p>
                {effScale < opts.scale && <p className="text-xs text-warning">{t("scaleLimited")}</p>}
              </>
            )}
            {opts.format === "jpg" && <SliderField label={t("quality")} value={opts.quality} min={0.5} max={1} step={0.01} onChange={(v) => set({ quality: v })} format={(v) => `${Math.round(v * 100)}%`} />}
            {supportsTransparency(opts.format) ? <Toggle label={t("transparent")} checked={opts.transparent} onChange={(v) => set({ transparent: v })} /> : <p className="text-xs text-muted">{t("noTransparency")}</p>}
            {opts.format === "pdf" && (
              <>
                <SelectField
                  label={t("pageSize")}
                  value={opts.pdf.page}
                  onChange={(v) => setPdf({ page: v })}
                  options={[
                    { value: "a4", label: "A4 (210 × 297 mm)" },
                    { value: "letter", label: "US Letter (8.5 × 11 in)" },
                    { value: "design", label: t("pageDesign") },
                    { value: "custom", label: t("pageCustom") },
                  ]}
                />
                {opts.pdf.page === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label={t("widthMm")} value={opts.pdf.widthMm} min={20} max={2000} onChange={(v) => setPdf({ widthMm: v })} suffix="mm" />
                    <NumberField label={t("heightMm")} value={opts.pdf.heightMm} min={20} max={2000} onChange={(v) => setPdf({ heightMm: v })} suffix="mm" />
                  </div>
                )}
                {opts.pdf.page !== "design" && (
                  <>
                    <Segmented
                      label={t("orientation")}
                      value={opts.pdf.orientation}
                      onChange={(v) => setPdf({ orientation: v })}
                      options={[
                        { value: "auto", label: t("orientationAuto") },
                        { value: "portrait", label: t("portrait") },
                        { value: "landscape", label: t("landscape") },
                      ]}
                    />
                    <NumberField label={t("margin")} value={opts.pdf.marginMm} min={0} max={60} onChange={(v) => setPdf({ marginMm: v })} suffix="mm" />
                  </>
                )}
                <Segmented label={t("dpi")} value={String(opts.pdf.dpi)} onChange={(v) => setPdf({ dpi: Number(v) })} options={["150", "300"].map((d) => ({ value: d, label: `${d} DPI` }))} />
                <p className="text-xs text-muted">{t("pdfNote", { dpi: opts.pdf.dpi })}</p>
              </>
            )}
            {opts.format === "svg" && <p className="text-xs text-muted">{t("svgNote")}</p>}
          </div>
          <div className="flex min-h-72 flex-col gap-3 p-4">
            <div className="grid min-h-60 flex-1 place-items-center overflow-auto rounded-xl bg-surface-2 p-3" aria-live="polite">
              {status === "working" && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("generating")}
                </p>
              )}
              {status === "error" && (
                <p role="alert" className="alert-error">
                  {t("error")} <span className="block text-xs">{error}</span>
                </p>
              )}
              {status === "ready" && result && (result.page ? <PdfPreview r={result} alt={t("previewAlt")} /> : <ImagePreview src={result.previewUrl} alt={t("previewAlt")} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted" data-testid="export-info">
                {status === "ready" && result ? (
                  <>
                    {result.page ? t("pageInfo", { width: Math.round((result.page.w / 72) * 25.4), height: Math.round((result.page.h / 72) * 25.4) }) : t("pixels", { width: result.width, height: result.height })} · {formatBytes(result.blob.size, locale)}
                  </>
                ) : (
                  " "
                )}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={status !== "ready" || !result}
                onClick={() => {
                  if (!result) return;
                  downloadBlob(result.blob, fileName(doc.name, ext));
                  onDownloaded(opts.format);
                }}
              >
                <Download className="size-4" aria-hidden="true" />
                {t("download", { format: opts.format.toUpperCase() })}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Full-size render used to build the files (not visible). */}
      <div aria-hidden="true" style={{ position: "fixed", left: -100000, top: 0, width: 1, height: 1, overflow: "hidden" }}>
        <DocSvg doc={doc} measure={measure} transparent={transparent} svgRef={svgRef} />
      </div>
    </div>
  );
}

/** The exported image over a checkerboard, so transparency is visible. */
function ImagePreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="inline-block" style={{ backgroundColor: "#fff", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e8e8e8'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e8e8e8'/%3E%3C/svg%3E\")" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
      <img src={src} alt={alt} className="max-h-[52vh] max-w-full object-contain" data-testid="export-preview" />
    </div>
  );
}

function PdfPreview({ r, alt }: { r: Result; alt: string }) {
  const p = r.page!;
  const k = Math.min(420 / p.h, 520 / p.w);
  return (
    <div className="relative bg-white shadow-md" style={{ width: p.w * k, height: p.h * k }} data-testid="export-preview">
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
      <img src={r.previewUrl} alt={alt} className="absolute" style={{ left: p.x * k, top: (p.h - p.y - p.dh) * k, width: p.dw * k, height: p.dh * k }} />
    </div>
  );
}
