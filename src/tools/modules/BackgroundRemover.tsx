"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eraser } from "lucide-react";
import { detectFormat, formatBytes, MAX_IMAGE_BYTES, outputFilename, validateImageInput, type DetectedFormat } from "@/tools/logic/image";
import { applyMask, BG_MODEL_MB, type BgMode, type BgRequest, type BgResponse } from "@/tools/image/bg-protocol";
import { ImageDropzone } from "@/tools/image/ImageDropzone";
import { ErrorMessage, ResetButton, useToolEvents } from "@/tools/ui";

const ACCEPTED: DetectedFormat[] = ["png", "jpeg", "webp"];
/** Longest side used for the cut-out; larger photos are scaled down to keep memory use safe on phones. */
const MAX_SIDE = 4096;
const CHECKER = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e6ddbd'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e6ddbd'/%3E%3C/svg%3E\")";

type Source = { file: File; url: string; bitmap: ImageBitmap; width: number; height: number };
type Background = "transparent" | "white" | "color";

let worker: Worker | null = null;
function getWorker() {
  worker ??= new Worker(new URL("../image/bg-removal.worker.ts", import.meta.url), { type: "module" });
  return worker;
}
/** Drops the worker after a failure so the next attempt starts clean. */
function discardWorker() {
  worker?.terminate();
  worker = null;
}

export function BackgroundRemover() {
  const t = useTranslations("bgremove");
  const ti = useTranslations("image");
  const locale = useLocale();
  const events = useToolEvents("background-remover");
  const [source, setSource] = useState<Source | null>(null);
  const [phase, setPhase] = useState<"idle" | "downloading" | "processing" | "done">("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ reload: boolean; detail: string } | null>(null);
  const [bg, setBg] = useState<Background>("transparent");
  const [color, setColor] = useState("#eee3b0");
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const [mode, setMode] = useState<BgMode | null>(null);
  const cutout = useRef<HTMLCanvasElement | null>(null);

  // Revoke object URLs when they are replaced.
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  // Re-render the output whenever the background choice changes.
  useEffect(() => {
    if (phase !== "done" || !cutout.current) return;
    const src = cutout.current;
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext("2d")!;
    if (bg !== "transparent") {
      ctx.fillStyle = bg === "white" ? "#ffffff" : color;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(src, 0, 0);
    let cancelled = false;
    out.toBlob((blob) => {
      if (!blob || cancelled) return;
      setResult({ blob, url: URL.createObjectURL(blob) });
    }, "image/png");
    return () => {
      cancelled = true;
    };
  }, [phase, bg, color]);

  function reset() {
    setSource(null);
    setResult(null);
    setPhase("idle");
    setError(null);
    setFailure(null);
    setProgress(null);
    setMode(null);
    cutout.current = null;
    events.reset();
  }

  async function onFile(file: File) {
    reset();
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const err = validateImageInput(file, detectFormat(head), ACCEPTED);
    if (err) {
      setError(ti(`errors.${err}`, { max: formatBytes(MAX_IMAGE_BYTES, locale), formats: "PNG, JPG, WebP" }));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      setSource({ file, url: URL.createObjectURL(file), bitmap, width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
    } catch {
      setError(ti("errors.decodeFailed"));
    }
  }

  function run() {
    if (!source) return;
    setError(null);
    setFailure(null);
    setPhase("downloading");
    const w = getWorker();
    w.onmessage = (e: MessageEvent<BgResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") setProgress({ loaded: msg.loaded, total: msg.total });
      else if (msg.type === "ready") {
        setMode(msg.mode);
        setPhase("processing");
      }
      else if (msg.type === "error") {
        setPhase("idle");
        setFailure({ reload: false, detail: msg.message });
        discardWorker();
        console.error("background removal failed:", msg.message);
      } else if (msg.type === "done") {
        const canvas = document.createElement("canvas");
        canvas.width = msg.width;
        canvas.height = msg.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(source.bitmap, 0, 0, msg.width, msg.height);
        const pixels = ctx.getImageData(0, 0, msg.width, msg.height);
        applyMask(pixels.data, msg.mask);
        ctx.putImageData(pixels, 0, 0);
        cutout.current = canvas;
        setMode(msg.mode);
        setPhase("done");
        events.complete({ background: bg, mode: msg.mode });
      }
    };
    // The worker script itself failed to load or crashed. Usually the page was
    // open during a site update and its worker file no longer exists.
    w.onerror = (ev) => {
      ev.preventDefault();
      setPhase("idle");
      setFailure({ reload: true, detail: ev.message || "Worker failed to start" });
      discardWorker();
    };
    w.postMessage({ blob: source.file, width: source.width, height: source.height } satisfies BgRequest);
  }

  const busy = phase === "downloading" || phase === "processing";
  const pct = progress && progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;

  return (
    <div className="space-y-5">
      {!source ? (
        <ImageDropzone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" acceptedLabel={ti("accepted", { formats: "PNG, JPG, WebP", max: formatBytes(MAX_IMAGE_BYTES, locale) })} onFile={onFile} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <figure>
            <figcaption className="label">{ti("original")}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={source.url} alt="" className="max-h-96 w-full rounded-xl border border-border bg-surface-2 object-contain" />
          </figure>
          <figure>
            <figcaption className="label">{ti("result")}</figcaption>
            <div className="grid min-h-48 place-items-center overflow-hidden rounded-xl border border-border" style={{ backgroundImage: CHECKER, backgroundColor: "#ffffff" }}>
              {result && phase === "done" ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={result.url} alt={t("resultAlt")} className="max-h-96 w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-sm text-ink/70" aria-live="polite">
                  {phase === "downloading" ? (pct !== null ? t("downloading", { percent: pct }) : t("preparing")) : phase === "processing" ? t("processing") : t("waiting")}
                </p>
              )}
            </div>
          </figure>
        </div>
      )}

      {busy && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t("progressLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === "processing" ? 100 : (pct ?? 0)}>
          <div className={`h-full rounded-full bg-accent-2 transition-[width] duration-300 ${phase === "processing" ? "animate-pulse" : ""}`} style={{ width: `${phase === "processing" ? 100 : (pct ?? 5)}%` }} />
        </div>
      )}

      {source && phase !== "done" && (
        <div className="space-y-3">
          <p className="alert-info">{t("firstRunNotice", { size: BG_MODEL_MB })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={run} disabled={busy}>
              <Eraser className="size-4" aria-hidden="true" />
              {busy ? t("working") : t("remove")}
            </button>
            <ResetButton onClick={reset} disabled={busy} />
          </div>
        </div>
      )}

      {mode === "portrait" && (phase === "processing" || phase === "done") && <p className="alert-warning">{t("portraitMode")}</p>}

      {phase === "done" && (
        <div className="space-y-4">
          <fieldset>
            <legend className="label">{t("background")}</legend>
            <div className="flex flex-wrap items-center gap-2">
              {(["transparent", "white", "color"] as const).map((b) => (
                <label key={b} className={`btn-secondary btn-sm cursor-pointer ${bg === b ? "border-accent-2 bg-accent-soft" : ""}`}>
                  <input type="radio" name="bg" className="sr-only" checked={bg === b} onChange={() => setBg(b)} />
                  {t(`bg.${b}`)}
                </label>
              ))}
              {bg === "color" && (
                <input type="color" aria-label={t("pickColor")} value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-border-strong bg-surface" />
              )}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            {result && source && (
              <a href={result.url} download={outputFilename(source.file.name, "image/png", "-no-bg")} className="btn-primary" onClick={() => events.downloaded("png")}>
                <Download className="size-4" aria-hidden="true" />
                {ti("download", { name: "PNG" })}
              </a>
            )}
            <ResetButton onClick={reset} />
          </div>
          {source && (source.width !== source.bitmap.width) && <p className="hint">{t("scaledNote", { width: source.width, height: source.height })}</p>}
        </div>
      )}

      <ErrorMessage>{error}</ErrorMessage>
      {failure && (
        <div role="alert" className="alert-error space-y-2">
          <p>{t(failure.reload ? "errorReload" : /fetch|network|load failed/i.test(failure.detail) ? "errorNetwork" : "error")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary btn-sm" onClick={() => (failure.reload ? window.location.reload() : run())}>
              {t(failure.reload ? "reload" : "retry")}
            </button>
            <details className="text-xs">
              <summary className="cursor-pointer">{t("details")}</summary>
              <code className="mt-1 block break-all whitespace-pre-wrap" dir="ltr">{failure.detail}</code>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
