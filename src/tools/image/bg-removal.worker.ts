/// <reference lib="webworker" />
// Background removal via Transformers.js (in-browser). The image never leaves the browser;
// only model weights (from huggingface.co, then cached) and the ONNX runtime
// (from jsDelivr) are downloaded.
//
// - With WebGPU: BiRefNet-lite (MIT), any subject, 1024×1024 input.
// - Without WebGPU (or if the GPU fails): MODNet (Apache-2.0), a small portrait
//   matting model that runs on the CPU. BiRefNet's fixed 1024×1024 input needs
//   more memory than WebAssembly can address, so it cannot run on the CPU path.
import { AutoModel, AutoProcessor, RawImage, env, type PreTrainedModel, type Processor, type Tensor } from "@huggingface/transformers";
import type { BgMode, BgRequest, BgResponse } from "./bg-protocol";

env.allowLocalModels = false;
// Import the ONNX runtime straight from jsDelivr (allowed by the CSP) instead of
// re-importing it from a blob: URL, which the CSP deliberately blocks. The
// browser's HTTP cache still keeps the runtime between visits.
env.useWasmCache = false;

// Retry transient network failures, and name the file that could not be
// downloaded so a blocked host (ad blocker, firewall) is easy to identify.
const baseFetch = env.fetch;
env.fetch = async (input, init) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await baseFetch(input, init);
    } catch (err) {
      if (attempt < 3 && !(init?.signal as AbortSignal | undefined)?.aborted) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      const url = new URL(String(input), self.location.href);
      throw new Error(`${err instanceof Error ? err.message : String(err)}: ${url.origin}${url.pathname}`);
    }
  }
};

type Loaded = { mode: BgMode; model: PreTrainedModel; processor: Processor };

const post = (msg: BgResponse, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

// Sum download progress across a model's files so the bar moves smoothly.
function progressReporter() {
  const files = new Map<string, { loaded: number; total: number }>();
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file || !p.total) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let l = 0;
    let t = 0;
    for (const f of files.values()) {
      l += f.loaded;
      t += f.total;
    }
    post({ type: "progress", loaded: l, total: t });
  };
}

async function loadFull(): Promise<Loaded> {
  const id = "onnx-community/BiRefNet_lite-ONNX";
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(id),
    AutoModel.from_pretrained(id, { dtype: "fp16", device: "webgpu", progress_callback: progressReporter() }),
  ]);
  return { mode: "full", model, processor };
}

async function loadPortrait(): Promise<Loaded> {
  const id = "Xenova/modnet";
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(id),
    AutoModel.from_pretrained(id, { dtype: "fp32", device: "wasm", progress_callback: progressReporter() }),
  ]);
  return { mode: "portrait", model, processor };
}

async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  return !!gpu && !!(await gpu.requestAdapter().catch(() => null));
}

let current: Promise<Loaded> | null = null;
let fellBack = false;

function load(): Promise<Loaded> {
  current ??= (async () => {
    if (!fellBack && (await hasWebGpu())) {
      try {
        return await loadFull();
      } catch {
        fellBack = true; // GPU lacks a required feature: use the CPU model
      }
    }
    return loadPortrait();
  })();
  current.catch(() => {
    current = null; // allow a retry after a network error
  });
  return current;
}

async function infer({ mode, model, processor }: Loaded, image: RawImage): Promise<Tensor> {
  const { pixel_values } = await processor(image);
  if (mode === "full") {
    const { output_image } = await model({ input_image: pixel_values });
    return output_image[0].sigmoid().mul(255).to("uint8");
  }
  const { output } = await model({ input: pixel_values });
  return output[0].mul(255).to("uint8");
}

self.onmessage = async (e: MessageEvent<BgRequest>) => {
  const { blob, width, height } = e.data;
  try {
    const image = await RawImage.fromBlob(blob);
    let loaded = await load();
    post({ type: "ready", mode: loaded.mode });
    let alpha: Tensor;
    try {
      alpha = await infer(loaded, image);
    } catch (err) {
      if (loaded.mode !== "full") throw err;
      // The GPU ran out of memory or failed: switch to the CPU model for good.
      fellBack = true;
      current = null;
      loaded = await load();
      post({ type: "ready", mode: loaded.mode });
      alpha = await infer(loaded, image);
    }
    const mask = await RawImage.fromTensor(alpha).resize(width, height);
    const data = new Uint8Array(mask.data);
    post({ type: "done", mask: data, width: mask.width, height: mask.height, mode: loaded.mode }, [data.buffer]);
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
