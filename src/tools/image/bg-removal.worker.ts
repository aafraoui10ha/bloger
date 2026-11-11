/// <reference lib="webworker" />
// Background removal via Transformers.js (in-browser). The image never leaves the browser;
// only public model files are downloaded, through the integrity-checked loader in
// model-loader.ts: from this website first, then from Hugging Face / jsDelivr.
//
// - With WebGPU: BiRefNet-lite (MIT), any subject, 1024×1024 input.
// - Without WebGPU (or if the GPU fails): MODNet (Apache-2.0), a small portrait
//   matting model that runs on the CPU. BiRefNet's fixed 1024×1024 input needs
//   more memory than WebAssembly can address, so it cannot run on the CPU path.
import { AutoModel, AutoProcessor, RawImage, env, type PreTrainedModel, type Processor, type Tensor } from "@huggingface/transformers";
import type { BgMode, BgRequest, BgResponse } from "./bg-protocol";
import manifestJson from "./bg-models.manifest.json";
import { createModelLoader, ModelLoadError, type Manifest } from "./model-loader";

const post = (msg: BgResponse, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);
const manifest = manifestJson as Manifest;

env.allowLocalModels = false;
// The loader keeps its own verified cache; Transformers.js's cache would store unverified copies.
env.useBrowserCache = false;
// Import the ONNX runtime from a URL instead of a blob: URL, which the CSP blocks.
env.useWasmCache = false;

// ---- Progress across the files of the model being loaded -------------------
const loaded = new Map<string, number>();
let total: number | null = null;
let fallbackShown = false;
let cacheSkippedShown = false;

function track(paths: string[]) {
  loaded.clear();
  for (const p of paths) loaded.set(p, 0);
  total = paths.reduce((n, p) => n + (loader.file(p)?.size ?? 0), 0) || null;
}

const loader = createModelLoader({
  manifest,
  // The website serves models from its own origin. The desktop app has no server of
  // its own, so its build points this at the official website (NEXT_PUBLIC_MODEL_ORIGIN).
  origin: process.env.NEXT_PUBLIC_MODEL_ORIGIN || self.location.origin,
  caches: "caches" in self ? self.caches : null,
  storage: navigator.storage ?? null,
  onEvent(e) {
    if (e.type === "download") {
      loaded.set(e.path, e.loaded);
      let sum = 0;
      for (const n of loaded.values()) sum += n;
      post({ type: "progress", source: e.source, loaded: sum, total });
    } else if (e.type === "cache-hit") loaded.set(e.path, e.size);
    else if (e.type === "verifying") post({ type: "stage", stage: "verifying" });
    else if (e.type === "fallback" && !fallbackShown) {
      fallbackShown = true;
      post({ type: "fallback" });
    } else if (e.type === "cache-skipped" && !cacheSkippedShown) {
      cacheSkippedShown = true;
      post({ type: "cacheSkipped" });
    }
  },
});
void loader.cleanup();

// Model files requested by Transformers.js go through the loader. Range probes
// for a manifest file are answered from the manifest, without a download.
env.fetch = async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  const path = loader.resolve(url);
  if (!path) return fetchWithRetry(url, init);
  const file = loader.file(path)!;
  if (new Headers(init?.headers).has("range")) {
    return new Response(new Uint8Array(0), { status: 206, headers: { "content-range": `bytes 0-0/${file.size}`, "content-type": file.contentType } });
  }
  const { bytes } = await loader.fetchFile(path);
  if (path.endsWith(".onnx")) post({ type: "stage", stage: "loading" });
  return new Response(bytes, { headers: { "content-type": file.contentType, "content-length": String(bytes.length) } });
};

/** Anything outside the manifest: retried, and the failing file is named in the error. */
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt < 3 && !init?.signal?.aborted) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      const u = new URL(url, self.location.href);
      throw new Error(`${err instanceof Error ? err.message : String(err)}: ${u.origin}${u.pathname}`);
    }
  }
}

// ---- ONNX Runtime: verified WASM binary, glue script from the same source ----
type WasmEnv = { wasmPaths?: string | { mjs?: string | URL; wasm?: string | URL }; wasmBinary?: ArrayBuffer };
const ortWasm = (env.backends.onnx as { wasm?: WasmEnv }).wasm;
const runtimeFiles = (() => {
  const paths = ortWasm?.wasmPaths;
  if (!paths || typeof paths !== "object" || !paths.mjs || !paths.wasm) return null;
  const name = (u: string | URL) => String(u).slice(String(u).lastIndexOf("/") + 1);
  const files = { mjs: `ort/${name(paths.mjs)}`, wasm: `ort/${name(paths.wasm)}` };
  return loader.file(files.mjs) && loader.file(files.wasm) ? files : null;
})();

/**
 * URL to import the runtime's small glue script from (it is imported by URL, not from
 * the verified bytes). The desktop app ships its own copy, checked against the manifest
 * at build time, so it also works offline. On the website, after a cache hit, the site's
 * copy is used only if it is actually served (it may be missing when models are not
 * self-hosted); otherwise the pinned external URL.
 */
async function runtimeScriptUrl(path: string, origin: "cache" | "local" | "external"): Promise<string> {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (process.env.NEXT_PUBLIC_DESKTOP === "1") return `${self.location.origin}/ort/${name}`;
  const external = loader.file(path)!.external;
  if (origin === "external") return external;
  const local = loader.localUrl(path);
  if (origin === "local") return local;
  try {
    const res = await fetch(local, { method: "HEAD", cache: "no-store", credentials: "omit" });
    return res.ok && /javascript/i.test(res.headers.get("content-type") ?? "") ? local : external;
  } catch {
    return external;
  }
}

let runtimeReady: Promise<void> | null = null;
function prepareRuntime(): Promise<void> {
  runtimeReady ??= (async () => {
    if (!runtimeFiles || !ortWasm) return; // unknown runtime variant: keep the library defaults
    const [wasm, mjs] = await Promise.all([loader.fetchFile(runtimeFiles.wasm), loader.fetchFile(runtimeFiles.mjs)]);
    ortWasm.wasmBinary = wasm.bytes.buffer;
    ortWasm.wasmPaths = { mjs: await runtimeScriptUrl(runtimeFiles.mjs, mjs.origin), wasm: loader.localUrl(runtimeFiles.wasm) };
  })();
  runtimeReady.catch(() => {
    runtimeReady = null;
  });
  return runtimeReady;
}

// ---- Models -----------------------------------------------------------------
type Loaded = { mode: BgMode; model: PreTrainedModel; processor: Processor };
const MODELS = {
  full: { id: "onnx-community/BiRefNet_lite-ONNX", weights: "onnx/model_fp16.onnx" },
  portrait: { id: "Xenova/modnet", weights: "onnx/model.onnx" },
} as const;

async function loadModel(mode: BgMode): Promise<Loaded> {
  const { id, weights } = MODELS[mode];
  track([...["config.json", "preprocessor_config.json", weights].map((f) => `hf/${id}/${f}`), ...(runtimeFiles ? [runtimeFiles.wasm, runtimeFiles.mjs] : [])]);
  post({ type: "stage", stage: "checking" });
  await prepareRuntime();
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(id),
    mode === "full" ? AutoModel.from_pretrained(id, { dtype: "fp16", device: "webgpu" }) : AutoModel.from_pretrained(id, { dtype: "fp32", device: "wasm" }),
  ]);
  return { mode, model, processor };
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
        return await loadModel("full");
      } catch (err) {
        if (err instanceof ModelLoadError) throw err; // a download problem, not a GPU limitation
        fellBack = true; // GPU lacks a required feature (e.g. fp16): use the CPU model
      }
    }
    return loadModel("portrait");
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
  fallbackShown = false;
  try {
    const image = await RawImage.fromBlob(blob);
    let model = await load();
    post({ type: "ready", mode: model.mode });
    let alpha: Tensor;
    try {
      alpha = await infer(model, image);
    } catch (err) {
      if (model.mode !== "full") throw err;
      // The GPU ran out of memory or failed: switch to the CPU model for good.
      fellBack = true;
      current = null;
      model = await load();
      post({ type: "ready", mode: model.mode });
      alpha = await infer(model, image);
    }
    const mask = await RawImage.fromTensor(alpha).resize(width, height);
    const data = new Uint8Array(mask.data);
    post({ type: "done", mask: data, width: mask.width, height: mask.height, mode: model.mode }, [data.buffer]);
  } catch (err) {
    const kind = err instanceof ModelLoadError ? err.kind : "other";
    post({ type: "error", kind, message: err instanceof Error ? err.message : String(err) });
  }
};
