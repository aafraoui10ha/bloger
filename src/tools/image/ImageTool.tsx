"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import {
  compressionStats,
  detectFormat,
  formatBytes,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  outputFilename,
  readDimensions,
  validateImageInput,
  type DetectedFormat,
} from "@/tools/logic/image";
import { processImage } from "./process";
import { ImageDropzone } from "./ImageDropzone";
import { ErrorMessage, ResetButton, useToolEvents } from "@/tools/ui";

type OutMime = "image/jpeg" | "image/png" | "image/webp";

export type ImageToolVariant = {
  toolKey: string;
  accepted: DetectedFormat[];
  /** Fixed output, or a list the user can choose from. "same" keeps the input format when encodable. */
  output: OutMime | OutMime[] | "same";
  quality: boolean;
  resize: boolean;
  background: boolean;
  action: "compress" | "resize" | "convert";
};

const ACCEPT_ATTR: Record<string, string> = {
  png: "image/png,.png",
  jpeg: "image/jpeg,.jpg,.jpeg",
  webp: "image/webp,.webp",
  gif: "image/gif,.gif",
  bmp: "image/bmp,.bmp",
  avif: "image/avif,.avif",
};
const LABEL: Record<string, string> = { png: "PNG", jpeg: "JPG", webp: "WebP", gif: "GIF", bmp: "BMP", avif: "AVIF" };
const MIME_LABEL: Record<OutMime, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };

type Source = { file: File; url: string; format: DetectedFormat; width: number | null; height: number | null };
type Output = { blob: Blob; url: string; width: number; height: number; name: string; mime: OutMime };

export function ImageTool({ variant }: { variant: ImageToolVariant }) {
  const t = useTranslations("image");
  const tc = useTranslations("common");
  const locale = useLocale();
  const events = useToolEvents(variant.toolKey);
  const [source, setSource] = useState<Source | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const outputChoices = Array.isArray(variant.output) ? variant.output : null;
  const [mime, setMime] = useState<OutMime>(outputChoices ? outputChoices[0]! : variant.output === "same" ? "image/png" : (variant.output as OutMime));
  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepAspect, setKeepAspect] = useState(true);
  const [background, setBackground] = useState("#ffffff");
  const urls = useRef<string[]>([]);
  const statusRef = useRef<HTMLDivElement>(null);

  const acceptedLabel = variant.accepted.map((f) => LABEL[f]).join(", ");
  const maxLabel = formatBytes(MAX_IMAGE_BYTES, locale);

  // Revoke every object URL on unmount to free memory.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function track(url: string) {
    urls.current.push(url);
    return url;
  }
  function release(url?: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current = urls.current.filter((u) => u !== url);
  }

  function reset() {
    release(source?.url);
    release(output?.url);
    setSource(null);
    setOutput(null);
    setError(null);
    setWidth("");
    setHeight("");
    events.reset();
  }

  async function onFile(file: File) {
    reset();
    const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const format = detectFormat(head);
    const err = validateImageInput(file, format, variant.accepted);
    if (err) {
      setError(t(`errors.${err}`, { max: maxLabel, formats: acceptedLabel }));
      return;
    }
    const dims = readDimensions(head, format);
    if (dims && dims.width * dims.height > MAX_IMAGE_PIXELS) {
      setError(t("errors.tooManyPixels"));
      return;
    }
    if (variant.output === "same") setMime(format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png");
    setSource({ file, url: track(URL.createObjectURL(file)), format, width: dims?.width ?? null, height: dims?.height ?? null });
  }

  async function run() {
    if (!source) {
      setError(t("errors.noFile"));
      return;
    }
    const w = width ? Number(width) : null;
    const h = height ? Number(height) : null;
    if (variant.resize) {
      const bad = (v: number | null) => v !== null && (!Number.isInteger(v) || v < 1 || v > 10000);
      if ((!w && !h) || bad(w) || bad(h)) {
        setError(t("errors.dimensions"));
        return;
      }
    }
    setBusy(true);
    setError(null);
    release(output?.url);
    setOutput(null);
    const result = await processImage({
      file: source.file,
      mime,
      quality: variant.quality ? quality / 100 : 0.92,
      fit: variant.resize ? { width: w, height: h, keepAspect } : { keepAspect: true },
      background: mime === "image/jpeg" ? background : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    setSource((s) => (s ? { ...s, width: result.srcWidth, height: result.srcHeight } : s));
    setOutput({
      blob: result.blob,
      url: track(URL.createObjectURL(result.blob)),
      width: result.width,
      height: result.height,
      mime,
      name: outputFilename(source.file.name, mime, variant.action === "resize" ? `-${result.width}x${result.height}` : variant.action === "compress" ? "-compressed" : ""),
    });
    events.complete({ format: MIME_LABEL[mime] });
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  const stats = source && output ? compressionStats(source.file.size, output.blob.size) : null;
  const actionLabel = variant.action === "compress" ? t("compress") : variant.action === "resize" ? t("resize") : `${t("convert")} → ${MIME_LABEL[mime]}`;

  return (
    <div className="space-y-6">
      {!source ? (
        <ImageDropzone accept={variant.accepted.map((f) => ACCEPT_ATTR[f]).join(",")} acceptedLabel={t("accepted", { formats: acceptedLabel, max: maxLabel })} onFile={onFile} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <figure className="rounded-lg border border-border bg-surface-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={source.url} alt="" className="mx-auto max-h-48 w-auto object-contain" />
            <figcaption className="mt-2 break-all text-xs text-muted">
              <span className="font-medium text-fg">{t("original")}:</span> {source.file.name}
              <br />
              {formatBytes(source.file.size, locale)} · {LABEL[source.format] ?? source.format}
              {source.width && source.height ? ` · ${source.width}×${source.height}` : ""}
            </figcaption>
          </figure>

          <div className="space-y-4">
            {outputChoices && (
              <fieldset>
                <legend className="label">{t("outputFormat")}</legend>
                <div className="flex flex-wrap gap-2">
                  {outputChoices.map((m) => (
                    <label key={m} className={`btn-secondary btn-sm cursor-pointer ${mime === m ? "border-accent bg-accent-soft" : ""}`}>
                      <input type="radio" name="out-format" value={m} checked={mime === m} onChange={() => setMime(m)} className="sr-only" />
                      {MIME_LABEL[m]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {variant.quality && mime !== "image/png" && (
              <div>
                <label htmlFor="quality" className="label">
                  {t("quality")}: <span className="tabular-nums">{quality}%</span>
                </label>
                <input id="quality" type="range" min={10} max={100} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} aria-describedby="quality-hint" className="w-full accent-[var(--accent)]" />
                <p id="quality-hint" className="hint">
                  {t("qualityHint")}
                </p>
              </div>
            )}
            {variant.resize && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="w" className="label">
                    {t("width")}
                  </label>
                  <input id="w" className="input" inputMode="numeric" type="number" min={1} max={10000} value={width} placeholder={source.width ? String(source.width) : ""}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      if (keepAspect && source.width && source.height && e.target.value) setHeight(String(Math.round((Number(e.target.value) * source.height) / source.width)));
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h" className="label">
                    {t("height")}
                  </label>
                  <input id="h" className="input" inputMode="numeric" type="number" min={1} max={10000} value={height} placeholder={source.height ? String(source.height) : ""}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      if (keepAspect && source.width && source.height && e.target.value) setWidth(String(Math.round((Number(e.target.value) * source.width) / source.height)));
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                  {t("keepAspect")}
                </label>
              </div>
            )}
            {variant.background && mime === "image/jpeg" && (
              <div className="flex items-center gap-3">
                <input id="bg" type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border-strong bg-surface" />
                <label htmlFor="bg" className="text-sm">
                  {t("background")}
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary" onClick={run} disabled={busy}>
                {busy ? tc("processing") : actionLabel}
              </button>
              <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>
                {t("another")}
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted">
          <div role="progressbar" aria-label={t("processing")} className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
          </div>
          {t("processing")}
        </div>
      )}

      <ErrorMessage>{error}</ErrorMessage>

      {output && source && stats && (
        <div ref={statusRef} tabIndex={-1} className="rounded-xl border border-success/30 bg-success-soft/40 p-4 outline-none" aria-live="polite">
          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={output.url} alt={t("preview")} className="mx-auto max-h-48 w-auto rounded border border-border object-contain" />
            <div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">{t("original")}</dt>
                  <dd className="font-semibold tabular-nums">{formatBytes(source.file.size, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("result")}</dt>
                  <dd className="font-semibold tabular-nums">{formatBytes(output.blob.size, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("dimensions")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {output.width}×{output.height}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{t("format")}</dt>
                  <dd className="font-semibold">{MIME_LABEL[output.mime]}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm">
                {stats.percent >= 0 ? (
                  <span className="font-semibold text-success">{t("saved", { percent: stats.percent })}</span>
                ) : (
                  <span className="text-warning">{t("larger", { percent: Math.abs(stats.percent) })}</span>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={output.url} download={output.name} className="btn-primary" onClick={() => events.downloaded(MIME_LABEL[output.mime])}>
                  <Download className="size-4" aria-hidden="true" />
                  {t("download", { name: output.name })}
                </a>
                <ResetButton onClick={reset} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
