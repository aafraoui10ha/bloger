import { runImageJob, type ImageJob, type ImageJobResult } from "./protocol";

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, (r: ImageJobResult) => void>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<ImageJobResult>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      workerBroken = true;
      worker?.terminate();
      worker = null;
      for (const [id, resolve] of pending) resolve({ id, ok: false, error: "generic" });
      pending.clear();
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function mainThread(job: ImageJob): Promise<ImageJobResult> {
  return runImageJob(job, (w, h) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return {
      ctx: canvas.getContext("2d"),
      toBlob: (type, quality) =>
        new Promise((resolve) => {
          canvas.toBlob((b) => {
            resolve(b);
            canvas.width = 0; // release the backing store
            canvas.height = 0;
          }, type, quality);
        }),
    };
  });
}

/**
 * Processes an image entirely in the browser. Uses a Web Worker with
 * OffscreenCanvas so the page stays responsive; falls back to the main thread.
 */
export function processImage(job: Omit<ImageJob, "id">): Promise<ImageJobResult> {
  const id = nextId++;
  const full = { ...job, id };
  const w = getWorker();
  if (!w) return mainThread(full);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage(full);
  });
}
