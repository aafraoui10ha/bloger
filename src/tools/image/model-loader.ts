// Hybrid, integrity-checked loader for the background-removal model files.
//
// For each file listed in the trusted manifest:
//   1. Use the copy in the versioned Cache API store, after re-checking its SHA-256.
//   2. Otherwise download it from this website (/models/background-removal/<version>/).
//   3. If that fails, download it from the pinned external URL (Hugging Face / jsDelivr).
// Transient failures are retried at most twice per source. Only complete files whose
// SHA-256 matches the manifest are returned or cached. Nothing here ever sends user
// data: requests are plain GETs for public model files, without cookies.
//
// Dependencies are injected so the logic can be unit-tested outside a browser.

export type ManifestPart = { size: number; sha256: string };
export type ManifestFile = {
  path: string;
  size: number;
  sha256: string;
  contentType: string;
  external: string;
  parts?: ManifestPart[];
  verifiedBy?: string;
};
export type Manifest = { version: string; ortVersion: string; models: { id: string; revision: string }[]; files: ManifestFile[] };

export type Source = "local" | "external";
export type Origin = "cache" | Source;
export type LoaderEvent =
  | { type: "cache-hit"; path: string; size: number }
  | { type: "download"; path: string; source: Source; loaded: number; total: number }
  | { type: "verifying"; path: string }
  | { type: "fallback"; path: string; reason: string }
  | { type: "cache-skipped"; path: string; reason: string };

export type FailureKind = "network" | "http" | "integrity" | "invalid";

/** One failed attempt to get a file from one source. */
export class ModelFileError extends Error {
  constructor(
    message: string,
    readonly kind: FailureKind,
    readonly transient: boolean,
  ) {
    super(message);
    this.name = "ModelFileError";
  }
}

/** Every source failed for a file; keeps the reason from each source. */
export class ModelLoadError extends Error {
  constructor(
    readonly path: string,
    readonly failures: { source: Source; kind: FailureKind; message: string }[],
  ) {
    super(`${path}: ${failures.map((f) => `${f.source}: ${f.message}`).join("; ")}`);
    this.name = "ModelLoadError";
  }
  /** "integrity" when a source served wrong bytes and none served good ones. */
  get kind(): "network" | "integrity" {
    return this.failures.some((f) => f.kind === "integrity") ? "integrity" : "network";
  }
}

export const CACHE_PREFIX = "bg-models-";
export const cacheNameFor = (m: Manifest) => CACHE_PREFIX + m.version;
export const localBaseFor = (m: Manifest) => `/models/background-removal/${m.version}/`;
export const partName = (path: string, i: number) => `${path}.part${String(i).padStart(3, "0")}`;
/** Caches written by earlier versions of the tool (Transformers.js's own cache) hold unverified copies. */
const LEGACY_CACHES = ["transformers-cache"];

type Bytes = Uint8Array<ArrayBuffer>;

export type LoaderOptions = {
  manifest: Manifest;
  /** Absolute origin of this website, e.g. https://example.com. */
  origin: string;
  fetch?: typeof fetch;
  /** null when the Cache API is unavailable (some private modes, old browsers). */
  caches?: CacheStorage | null;
  storage?: Pick<StorageManager, "estimate"> | null;
  onEvent?: (e: LoaderEvent) => void;
  /** Extra attempts per source after a transient failure (default 2). */
  retries?: number;
  /** Abort a download when no bytes arrive for this long (default 30 s). */
  stallMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  let hex = "";
  for (const b of digest) hex += b.toString(16).padStart(2, "0");
  return hex;
}

const isTransientStatus = (s: number) => s === 408 || s === 425 || s === 429 || s >= 500;

export function createModelLoader(opts: LoaderOptions) {
  const { manifest, origin } = opts;
  const doFetch = opts.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const retries = opts.retries ?? 2;
  const stallMs = opts.stallMs ?? 30_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const emit = (e: LoaderEvent) => opts.onEvent?.(e);
  const files = new Map(manifest.files.map((f) => [f.path, f]));
  const cacheName = cacheNameFor(manifest);
  const localBase = origin + localBaseFor(manifest);
  const inflight = new Map<string, Promise<{ bytes: Bytes; origin: Origin }>>();

  let cachePromise: Promise<Cache | null> | null = null;
  function openCache(): Promise<Cache | null> {
    cachePromise ??= (async () => {
      try {
        return opts.caches ? await opts.caches.open(cacheName) : null;
      } catch {
        return null; // e.g. SecurityError in private browsing
      }
    })();
    return cachePromise;
  }
  const cacheKey = (file: ManifestFile) => localBase + file.path;

  async function readCached(file: ManifestFile): Promise<Bytes | null> {
    const cache = await openCache();
    if (!cache) return null;
    let res: Response | undefined;
    try {
      res = await cache.match(cacheKey(file));
    } catch {
      return null;
    }
    if (!res) return null;
    try {
      if (res.headers.get("x-model-sha256") !== file.sha256) throw new Error("outdated");
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length !== file.size || (await sha256Hex(bytes)) !== file.sha256) throw new Error("corrupt");
      return bytes;
    } catch {
      await cache.delete(cacheKey(file)).catch(() => false); // evict and download again
      return null;
    }
  }

  async function store(file: ManifestFile, bytes: Bytes) {
    const cache = await openCache();
    if (!cache) {
      emit({ type: "cache-skipped", path: file.path, reason: "Cache API unavailable" });
      return;
    }
    try {
      const est = await opts.storage?.estimate?.().catch(() => undefined);
      if (est?.quota != null && est.usage != null && est.quota - est.usage < bytes.length * 1.1) {
        throw new DOMException("Not enough storage quota", "QuotaExceededError");
      }
      await cache.put(
        cacheKey(file),
        new Response(bytes, { headers: { "content-type": file.contentType, "content-length": String(bytes.length), "x-model-sha256": file.sha256 } }),
      );
    } catch (err) {
      emit({ type: "cache-skipped", path: file.path, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  /** Downloads one URL completely and checks size and SHA-256. Throws ModelFileError. */
  async function fetchVerified(url: string, expected: ManifestPart, onBytes: (n: number) => void, onVerify: () => void): Promise<Bytes> {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ctrl.abort(new ModelFileError(`no data for ${stallMs / 1000} s`, "network", true)), stallMs);
    };
    const asNetworkError = (err: unknown) => {
      const reason: unknown = ctrl.signal.aborted ? ctrl.signal.reason : err;
      if (reason instanceof ModelFileError) return reason;
      return new ModelFileError(reason instanceof Error ? reason.message : String(reason), "network", true);
    };
    // Rejects on abort even if a fetch implementation ignores the signal.
    const aborted = new Promise<never>((_, reject) => ctrl.signal.addEventListener("abort", () => reject(ctrl.signal.reason), { once: true }));
    aborted.catch(() => {});
    arm();
    try {
      let res: Response;
      try {
        res = await Promise.race([doFetch(url, { method: "GET", credentials: "omit", signal: ctrl.signal }), aborted]);
      } catch (err) {
        throw asNetworkError(err);
      }
      if (!res.ok) throw new ModelFileError(`HTTP ${res.status}`, "http", isTransientStatus(res.status));
      const type = res.headers.get("content-type") ?? "";
      if (/text\/html/i.test(type)) {
        await res.body?.cancel().catch(() => {});
        throw new ModelFileError(`unexpected content type ${type}`, "invalid", false);
      }
      const out = new Uint8Array(expected.size);
      let offset = 0;
      if (!res.body) throw new ModelFileError("empty response", "invalid", false);
      const reader = res.body.getReader();
      for (;;) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await Promise.race([reader.read(), aborted]);
        } catch (err) {
          reader.cancel().catch(() => {});
          throw asNetworkError(err);
        }
        if (chunk.done) break;
        arm();
        if (offset + chunk.value.length > out.length) {
          await reader.cancel().catch(() => {});
          throw new ModelFileError(`response is larger than the expected ${expected.size} bytes`, "invalid", false);
        }
        out.set(chunk.value, offset);
        offset += chunk.value.length;
        onBytes(offset);
      }
      if (offset !== expected.size) throw new ModelFileError(`incomplete download: ${offset} of ${expected.size} bytes`, "network", true);
      clearTimeout(timer);
      onVerify();
      if ((await sha256Hex(out)) !== expected.sha256) throw new ModelFileError("SHA-256 does not match the manifest", "integrity", false);
      return out;
    } finally {
      clearTimeout(timer);
    }
  }

  async function withRetries<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await task();
      } catch (err) {
        const transient = err instanceof ModelFileError ? err.transient : true;
        if (!transient || attempt >= retries) throw err;
        await sleep(500 * 2 ** attempt);
      }
    }
  }

  async function fromSource(file: ManifestFile, source: Source): Promise<Bytes> {
    let lastEmit = 0;
    const report = (loaded: number) => {
      const t = now();
      if (loaded === file.size || t - lastEmit >= 100) {
        lastEmit = t;
        emit({ type: "download", path: file.path, source, loaded, total: file.size });
      }
    };
    const verify = () => emit({ type: "verifying", path: file.path });
    report(0);
    if (source === "external") return withRetries(() => fetchVerified(file.external, file, report, verify));
    if (!file.parts) return withRetries(() => fetchVerified(localBase + file.path, file, report, verify));

    // Large files are served as numbered parts; each part is verified, then the whole file.
    const out = new Uint8Array(file.size);
    let done = 0;
    for (const [i, part] of file.parts.entries()) {
      const bytes = await withRetries(() => fetchVerified(localBase + partName(file.path, i), part, (n) => report(done + n), () => {}));
      out.set(bytes, done);
      done += bytes.length;
    }
    verify();
    if (done !== file.size || (await sha256Hex(out)) !== file.sha256) throw new ModelFileError("SHA-256 does not match the manifest", "integrity", false);
    return out;
  }

  async function load(file: ManifestFile): Promise<{ bytes: Bytes; origin: Origin }> {
    const cached = await readCached(file);
    if (cached) {
      emit({ type: "cache-hit", path: file.path, size: file.size });
      return { bytes: cached, origin: "cache" };
    }
    const failures: ModelLoadError["failures"] = [];
    for (const source of ["local", "external"] as const) {
      if (source === "external") emit({ type: "fallback", path: file.path, reason: failures[0]?.message ?? "" });
      try {
        const bytes = await fromSource(file, source);
        await store(file, bytes);
        return { bytes, origin: source };
      } catch (err) {
        const e = err instanceof ModelFileError ? err : new ModelFileError(String(err), "network", true);
        failures.push({ source, kind: e.kind, message: e.message });
      }
    }
    throw new ModelLoadError(file.path, failures);
  }

  /** Verified bytes of a manifest file and where they came from. Concurrent calls share one download. */
  function fetchFile(path: string): Promise<{ bytes: Bytes; origin: Origin }> {
    const file = files.get(path);
    if (!file) return Promise.reject(new Error(`${path} is not in the model manifest`));
    let p = inflight.get(path);
    if (!p) {
      p = load(file).finally(() => inflight.delete(path));
      inflight.set(path, p);
    }
    return p;
  }

  return {
    manifest,
    fetchFile,
    localUrl: (path: string) => localBase + path,
    file: (path: string) => files.get(path),
    /** Maps a Hugging Face model URL requested by Transformers.js to a manifest path. */
    resolve(url: string): string | null {
      const m = /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\/[^/]+\/([^?#]+)/.exec(url);
      const path = m ? `hf/${m[1]}/${decodeURIComponent(m[2]!)}` : null;
      return path && files.has(path) ? path : null;
    },
    get: async (path: string): Promise<Bytes> => (await fetchFile(path)).bytes,
    /** Deletes caches of other manifest versions and legacy unverified caches. */
    async cleanup(): Promise<void> {
      if (!opts.caches) return;
      try {
        for (const name of await opts.caches.keys()) {
          if ((name.startsWith(CACHE_PREFIX) && name !== cacheName) || LEGACY_CACHES.includes(name)) await opts.caches.delete(name);
        }
      } catch {
        // Storage may be blocked; nothing to clean.
      }
    },
  };
}

export type ModelLoader = ReturnType<typeof createModelLoader>;
