"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eraser } from "lucide-react";
import { detectFormat, formatBytes, MAX_IMAGE_BYTES, outputFilename, validateImageInput, type DetectedFormat } from "@/tools/logic/image";
import { applyMask, BG_MODEL_MB, type BgMode, type BgRequest, type BgResponse, type BgStage } from "@/tools/image/bg-protocol";
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
  const [phase, setPhase] = useState<"idle" | "loading" | "processing" | "done">("idle");
  // Model loading: current stage, download source and byte progress (total null = unknown).
  const [stage, setStage] = useState<BgStage | "download">("checking");
  const [progress, setProgress] = useState<{ source: "local" | "external"; loaded: number; total: number | null } | null>(null);
  const [notices, setNotices] = useState<{ fallback: boolean; cacheSkipped: boolean }>({ fallback: false, cacheSkipped: false });
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ reload: boolean; kind: "network" | "integrity" | "other"; detail: string } | null>(null);
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
    setNotices({ fallback: false, cacheSkipped: false });
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
      // Start the worker now (nothing is sent to it yet) so its script is loaded
      // while the user is still online and the run can use cached model files.
      getWorker();
    } catch {
      setError(ti("errors.decodeFailed"));
    }
  }

  function run() {
    if (!source) return;
    setError(null);
    setFailure(null);
    setProgress(null);
    setNotices({ fallback: false, cacheSkipped: false });
    setStage("checking");
    setPhase("loading");
    const w = getWorker();
    w.onmessage = (e: MessageEvent<BgResponse>) => {
      const msg = e.data;
      if (msg.type === "stage") setStage(msg.stage);
      else if (msg.type === "progress") {
        setStage("download");
        setProgress({ source: msg.source, loaded: msg.loaded, total: msg.total });
      } else if (msg.type === "fallback") setNotices((n) => ({ ...n, fallback: true }));
      else if (msg.type === "cacheSkipped") setNotices((n) => ({ ...n, cacheSkipped: true }));
      else if (msg.type === "ready") {
        setMode(msg.mode);
        setPhase("processing");
      }
      else if (msg.type === "error") {
        setPhase("idle");
        setFailure({ reload: false, kind: msg.kind, detail: msg.message });
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
      setFailure({ reload: true, kind: "other", detail: ev.message || "Worker failed to start" });
      discardWorker();
    };
    w.postMessage({ blob: source.file, width: source.width, height: source.height } satisfies BgRequest);
  }

  const busy = phase === "loading" || phase === "processing";
  const pct = progress && progress.total ? Math.min(100, Math.floor((progress.loaded / progress.total) * 100)) : null;
  const downloading = phase === "loading" && stage === "download" && progress;

  function statusText(): string {
    if (phase === "processing") return t("processing");
    if (phase === "done") return t("done");
    if (phase !== "loading") return t("waiting");
    if (stage === "checking") return t("checking");
    if (stage === "verifying") return t("verifying");
    if (stage === "loading") return t("loadingModel");
    if (!progress) return t("checking");
    const key = progress.source === "local" ? "downloadLocal" : "downloadExternal";
    return pct === null ? t(`${key}Unknown`) : t(key, { percent: pct });
  }

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
                <div className="p-6 text-center text-sm text-ink/70">
                  <p aria-live="polite">{statusText()}</p>
                  {downloading && progress.total !== null && (
                    <p className="mt-1 text-xs tabular-nums">{t("bytes", { loaded: formatBytes(progress.loaded, locale), total: formatBytes(progress.total, locale) })}</p>
                  )}
                </div>
              )}
            </div>
          </figure>
        </div>
      )}

      {/* Model download: determinate when the size is known, otherwise indeterminate. */}
      {phase === "loading" && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t("progressLabel")} aria-valuemin={0} aria-valuemax={100} {...(downloading && pct !== null ? { "aria-valuenow": pct, "aria-valuetext": statusText() } : { "aria-valuetext": statusText() })}>
          <div className={`h-full rounded-full bg-accent-2 transition-[width] duration-300 ${downloading && pct !== null ? "" : "animate-pulse"}`} style={{ width: `${downloading && pct !== null ? Math.max(pct, 2) : 100}%` }} />
        </div>
      )}
      {/* Image processing has no measurable progress: always indeterminate. */}
      {phase === "processing" && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t("processingLabel")} aria-valuetext={t("processing")}>
          <div className="h-full w-full animate-pulse rounded-full bg-accent" />
        </div>
      )}
      {notices.fallback && busy && <p className="alert-info">{t("fallbackNotice")}</p>}
      {notices.cacheSkipped && phase === "done" && <p className="hint">{t("cacheSkipped")}</p>}
      {phase === "done" && <p className="sr-only" role="status">{t("done")}</p>}

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
          <p>{t(failure.reload ? "errorReload" : failure.kind === "integrity" ? "errorIntegrity" : failure.kind === "network" || /fetch|network|load failed/i.test(failure.detail) ? "errorNetwork" : "error")}</p>
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
