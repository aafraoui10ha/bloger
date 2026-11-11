import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cacheNameFor, createModelLoader, localBaseFor, ModelLoadError, partName, sha256Hex, type LoaderEvent, type Manifest, type ManifestFile } from "@/tools/image/model-loader";
import realManifest from "@/tools/image/bg-models.manifest.json";

const ORIGIN = "https://site.test";

// ---- Test doubles -----------------------------------------------------------

class FakeCache {
  entries = new Map<string, Response>();
  failPut: Error | null = null;
  async match(key: string) {
    return this.entries.get(key)?.clone();
  }
  async put(key: string, res: Response) {
    if (this.failPut) throw this.failPut;
    this.entries.set(key, res);
  }
  async delete(key: string) {
    return this.entries.delete(key);
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>();
  failOpen = false;
  async open(name: string) {
    if (this.failOpen) throw new DOMException("blocked", "SecurityError");
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name)!;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
}

type Handler = (attempt: number) => Response | Promise<Response>;
function fakeFetch(routes: Record<string, Handler>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const counts = new Map<string, number>();
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const n = (counts.get(url) ?? 0) + 1;
    counts.set(url, n);
    const h = routes[url];
    if (!h) throw new TypeError("Failed to fetch");
    return h(n);
  };
  return { fn: fn as typeof fetch, calls, count: (url: string) => counts.get(url) ?? 0 };
}

const ok = (bytes: Uint8Array, type = "application/octet-stream") => new Response(bytes.slice(), { headers: { "content-type": type } });
const networkError = () => {
  throw new TypeError("Failed to fetch");
};
/** A body that sends the first chunk and then breaks, like a dropped connection. */
const brokenBody = (bytes: Uint8Array) =>
  new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, 3));
        c.error(new TypeError("network error"));
      },
    }),
  );

async function makeFile(name: string, bytes: Uint8Array<ArrayBuffer>, partSize?: number): Promise<ManifestFile> {
  const file: ManifestFile = {
    path: `hf/org/model/${name}`,
    size: bytes.length,
    sha256: await sha256Hex(bytes),
    contentType: "application/octet-stream",
    external: `https://huggingface.co/org/model/resolve/abc123/${name}`,
  };
  if (partSize) {
    file.parts = [];
    for (let o = 0; o < bytes.length; o += partSize) {
      const part = bytes.slice(o, o + partSize);
      file.parts.push({ size: part.length, sha256: await sha256Hex(part) });
    }
  }
  return file;
}

const DATA = new TextEncoder().encode("model-weights-0123456789");

async function setup(opts: { parts?: number; caches?: FakeCacheStorage | null; retries?: number } = {}) {
  const file = await makeFile("onnx/model.onnx", DATA, opts.parts);
  const manifest: Manifest = { version: "vtest", ortVersion: "1", models: [], files: [file] };
  const local = ORIGIN + localBaseFor(manifest) + file.path;
  const caches = opts.caches === undefined ? new FakeCacheStorage() : opts.caches;
  return { file, manifest, local, external: file.external, caches };
}

function loaderFor(s: Awaited<ReturnType<typeof setup>>, fetch: typeof globalThis.fetch, extra: Partial<Parameters<typeof createModelLoader>[0]> = {}) {
  const events: LoaderEvent[] = [];
  const loader = createModelLoader({
    manifest: s.manifest,
    origin: ORIGIN,
    fetch,
    caches: s.caches as unknown as CacheStorage | null,
    sleep: async () => {},
    onEvent: (e) => events.push(e),
    ...extra,
  });
  return { loader, events };
}

// ---- Tests ------------------------------------------------------------------

describe("model loader", () => {
  it("downloads from this website first, verifies and caches the file", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: () => ok(DATA) });
    const { loader, events } = loaderFor(s, f.fn);
    const res = await loader.fetchFile(s.file.path);
    expect(new TextDecoder().decode(res.bytes)).toBe("model-weights-0123456789");
    expect(res.origin).toBe("local");
    expect(f.count(s.external)).toBe(0);
    const cached = await s.caches!.stores.get(cacheNameFor(s.manifest))!.match(s.local);
    expect(cached?.headers.get("x-model-sha256")).toBe(s.file.sha256);
    expect(events.some((e) => e.type === "verifying")).toBe(true);
  });

  it("uses a valid cached copy without any network request, including offline", async () => {
    const s = await setup();
    await loaderFor(s, fakeFetch({ [s.local]: () => ok(DATA) }).fn).loader.get(s.file.path);
    const offline = fakeFetch({}); // every request fails like an offline browser
    const { loader, events } = loaderFor(s, offline.fn);
    const res = await loader.fetchFile(s.file.path);
    expect(res.origin).toBe("cache");
    expect(offline.calls).toHaveLength(0);
    expect(events).toContainEqual({ type: "cache-hit", path: s.file.path, size: DATA.length });
  });

  it("evicts a corrupted or outdated cache entry and downloads again", async () => {
    const s = await setup();
    const store = await s.caches!.open(cacheNameFor(s.manifest));
    await store.put(s.local, new Response(new TextEncoder().encode("model-weights-XXXXXXXXXX"), { headers: { "x-model-sha256": s.file.sha256 } }));
    const f = fakeFetch({ [s.local]: () => ok(DATA) });
    const res = await loaderFor(s, f.fn).loader.fetchFile(s.file.path);
    expect(res.origin).toBe("local");
    expect(f.count(s.local)).toBe(1);
    const fixed = await store.match(s.local);
    expect(new Uint8Array(await fixed!.arrayBuffer())).toEqual(DATA);
  });

  it("falls back to the external source when this website fails, without retrying a 404", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: () => new Response("missing", { status: 404 }), [s.external]: () => ok(DATA) });
    const { loader, events } = loaderFor(s, f.fn);
    const res = await loader.fetchFile(s.file.path);
    expect(res.origin).toBe("external");
    expect(f.count(s.local)).toBe(1);
    expect(events.find((e) => e.type === "fallback")).toMatchObject({ reason: "HTTP 404" });
    expect(events.some((e) => e.type === "download" && e.source === "external")).toBe(true);
  });

  it("reports both sources when everything fails", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: networkError, [s.external]: () => new Response("", { status: 403 }) });
    const err = await loaderFor(s, f.fn).loader.get(s.file.path).catch((e) => e);
    expect(err).toBeInstanceOf(ModelLoadError);
    expect(err.kind).toBe("network");
    expect(err.failures).toEqual([
      { source: "local", kind: "network", message: "Failed to fetch" },
      { source: "external", kind: "http", message: "HTTP 403" },
    ]);
    expect(err.message).toContain("local: Failed to fetch");
    expect(err.message).toContain("external: HTTP 403");
  });

  it("rejects a SHA-256 mismatch, never caches it and does not retry it", async () => {
    const s = await setup();
    const tampered = new TextEncoder().encode("model-weights-EVILEVILEV");
    const f = fakeFetch({ [s.local]: () => ok(tampered), [s.external]: () => ok(DATA) });
    const res = await loaderFor(s, f.fn).loader.fetchFile(s.file.path);
    expect(res.origin).toBe("external");
    expect(f.count(s.local)).toBe(1);
    const store = s.caches!.stores.get(cacheNameFor(s.manifest))!;
    expect(new Uint8Array(await (await store.match(s.local))!.arrayBuffer())).toEqual(DATA);
  });

  it("reports an integrity error when both sources serve wrong bytes, and caches nothing", async () => {
    const s = await setup();
    const tampered = new TextEncoder().encode("model-weights-EVILEVILEV");
    const f = fakeFetch({ [s.local]: () => ok(tampered), [s.external]: () => ok(tampered) });
    const err = await loaderFor(s, f.fn).loader.get(s.file.path).catch((e) => e);
    expect(err.kind).toBe("integrity");
    expect(s.caches!.stores.get(cacheNameFor(s.manifest))!.entries.size).toBe(0);
  });

  it("retries truncated downloads and broken connections, then falls back", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: (n) => (n < 3 ? ok(DATA.slice(0, 10)) : brokenBody(DATA)), [s.external]: () => ok(DATA) });
    const res = await loaderFor(s, f.fn).loader.fetchFile(s.file.path);
    expect(res.origin).toBe("external");
    expect(f.count(s.local)).toBe(3); // first attempt + 2 retries
  });

  it("rejects oversized and HTML responses without retrying", async () => {
    const s = await setup();
    const bigger = new Uint8Array(DATA.length + 5);
    const f = fakeFetch({ [s.local]: () => ok(bigger), [s.external]: () => ok(new TextEncoder().encode("<html>"), "text/html; charset=utf-8") });
    const err = await loaderFor(s, f.fn).loader.get(s.file.path).catch((e) => e);
    expect(err.failures.map((x: { kind: string }) => x.kind)).toEqual(["invalid", "invalid"]);
    expect(f.count(s.local)).toBe(1);
    expect(f.count(s.external)).toBe(1);
  });

  it("limits retries to two extra attempts per source and retries transient HTTP errors", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: networkError, [s.external]: (n) => (n === 1 ? new Response("", { status: 503 }) : ok(DATA)) });
    const sleeps: number[] = [];
    const res = await loaderFor(s, f.fn, { sleep: async (ms) => void sleeps.push(ms) }).loader.fetchFile(s.file.path);
    expect(res.origin).toBe("external");
    expect(f.count(s.local)).toBe(3);
    expect(f.count(s.external)).toBe(2);
    expect(sleeps).toEqual([500, 1000, 500]);
  });

  it("aborts a stalled download and retries it", async () => {
    const s = await setup();
    const stalled = () => new Response(new ReadableStream({ start() {} })); // never sends data
    const f = fakeFetch({ [s.local]: stalled, [s.external]: () => ok(DATA) });
    const res = await loaderFor(s, f.fn, { stallMs: 20 }).loader.fetchFile(s.file.path);
    expect(res.origin).toBe("external");
    expect(f.count(s.local)).toBe(3);
  });

  it("shares one download between concurrent requests for the same file", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: async () => (await new Promise((r) => setTimeout(r, 10)), ok(DATA)) });
    const { loader } = loaderFor(s, f.fn);
    const results = await Promise.all([loader.get(s.file.path), loader.get(s.file.path), loader.get(s.file.path)]);
    expect(f.calls).toHaveLength(1);
    results.forEach((r) => expect(r).toEqual(DATA));
  });

  it("serves large files as verified parts, falling back if a part is bad", async () => {
    const s = await setup({ parts: 10 });
    const base = ORIGIN + localBaseFor(s.manifest);
    const routes: Record<string, Handler> = {};
    s.file.parts!.forEach((_, i) => (routes[base + partName(s.file.path, i)] = () => ok(DATA.slice(i * 10, i * 10 + 10))));
    const good = await loaderFor(s, fakeFetch(routes).fn, { caches: null }).loader.fetchFile(s.file.path);
    expect(good.bytes).toEqual(DATA);
    expect(good.origin).toBe("local");

    routes[base + partName(s.file.path, 1)] = () => ok(new Uint8Array(10));
    routes[s.external] = () => ok(DATA);
    const f = fakeFetch(routes);
    const fallback = await loaderFor(s, f.fn, { caches: null }).loader.fetchFile(s.file.path);
    expect(fallback.origin).toBe("external");
    expect(f.count(base + partName(s.file.path, 2))).toBe(0);
  });

  it("works when the Cache API is unavailable or blocked", async () => {
    for (const caches of [null, Object.assign(new FakeCacheStorage(), { failOpen: true })]) {
      const s = await setup({ caches });
      const { loader, events } = loaderFor(s, fakeFetch({ [s.local]: () => ok(DATA) }).fn);
      expect(await loader.get(s.file.path)).toEqual(DATA);
      expect(events.find((e) => e.type === "cache-skipped")).toMatchObject({ reason: "Cache API unavailable" });
    }
  });

  it("still returns the file when storage quota is exceeded", async () => {
    const s = await setup();
    const store = await s.caches!.open(cacheNameFor(s.manifest));
    store.failPut = new DOMException("Quota exceeded", "QuotaExceededError");
    const { loader, events } = loaderFor(s, fakeFetch({ [s.local]: () => ok(DATA) }).fn);
    expect(await loader.get(s.file.path)).toEqual(DATA);
    expect(events.find((e) => e.type === "cache-skipped")).toMatchObject({ reason: "Quota exceeded" });

    // A low quota estimate skips caching before trying to write.
    store.failPut = null;
    const low = loaderFor(s, fakeFetch({ [s.local]: () => ok(DATA) }).fn, { storage: { estimate: async () => ({ quota: 100, usage: 95 }) } });
    expect(await low.loader.get(s.file.path)).toEqual(DATA);
    expect(store.entries.size).toBe(0);
  });

  it("reports progress from 0 to the full size", async () => {
    const s = await setup();
    const chunked = () =>
      new Response(
        new ReadableStream({
          start(c) {
            for (let o = 0; o < DATA.length; o += 8) c.enqueue(DATA.slice(o, o + 8));
            c.close();
          },
        }),
      );
    let t = 0;
    const { loader, events } = loaderFor(s, fakeFetch({ [s.local]: chunked }).fn, { now: () => (t += 1000) });
    await loader.get(s.file.path);
    const progress = events.filter((e) => e.type === "download").map((e) => (e as { loaded: number }).loaded);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(DATA.length);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });

  it("deletes caches of other model versions and the legacy unverified cache", async () => {
    const s = await setup();
    for (const name of [cacheNameFor(s.manifest), "bg-models-vold", "transformers-cache", "unrelated"]) await s.caches!.open(name);
    await loaderFor(s, fakeFetch({}).fn).loader.cleanup();
    expect(await s.caches!.keys()).toEqual([cacheNameFor(s.manifest), "unrelated"]);
  });

  it("only sends cookie-less GET requests without a body (no image data)", async () => {
    const s = await setup();
    const f = fakeFetch({ [s.local]: () => new Response("", { status: 500 }), [s.external]: () => ok(DATA) });
    await loaderFor(s, f.fn).loader.get(s.file.path);
    expect(f.calls.length).toBeGreaterThan(1);
    for (const c of f.calls) {
      expect(c.init?.method).toBe("GET");
      expect(c.init?.body).toBeUndefined();
      expect(c.init?.credentials).toBe("omit");
      expect(c.url).not.toContain("?");
    }
  });

  it("maps Transformers.js model URLs to manifest paths", async () => {
    const s = await setup();
    const { loader } = loaderFor(s, fakeFetch({}).fn);
    expect(loader.resolve("https://huggingface.co/org/model/resolve/main/onnx/model.onnx")).toBe(s.file.path);
    expect(loader.resolve("https://huggingface.co/org/model/resolve/main/onnx/other.onnx")).toBeNull();
    expect(loader.resolve("https://evil.test/org/model/resolve/main/onnx/model.onnx")).toBeNull();
  });
});

describe("deployed model manifest", () => {
  const manifest = realManifest as Manifest;
  it("pins every file with a SHA-256, size and upstream verification", () => {
    expect(manifest.version).toMatch(/^v[0-9a-f]{12}$/);
    for (const f of manifest.files) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.size).toBeGreaterThan(0);
      expect(f.verifiedBy).toBeTruthy();
      expect(f.external).toMatch(/^https:\/\/(huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\/|cdn\.jsdelivr\.net\/npm\/onnxruntime-web@)/);
      if (f.parts) expect(f.parts.reduce((n, p) => n + p.size, 0)).toBe(f.size);
    }
  });
  it("matches the files synced into public/ when they are present", async () => {
    const dir = path.join(process.cwd(), "public", localBaseFor(manifest));
    if (!fs.existsSync(dir)) return; // not synced in this checkout (CI before `npm run build`)
    for (const f of manifest.files.filter((x) => !x.parts && x.size < 1_000_000)) {
      expect(await sha256Hex(fs.readFileSync(path.join(dir, f.path)))).toBe(f.sha256);
    }
  });
});

describe("background remover messages", () => {
  const keys = ["checking", "downloadLocal", "downloadLocalUnknown", "downloadExternal", "downloadExternalUnknown", "bytes", "fallbackNotice", "verifying", "loadingModel", "processing", "done", "progressLabel", "processingLabel", "cacheSkipped", "errorNetwork", "errorIntegrity", "error"];
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const load = (l: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${l}.json`), "utf8")).bgremove as Record<string, string>;
  const en = load("en");
  for (const locale of ["en", "fr", "ar"]) {
    it(`has every loading and error message in ${locale}`, () => {
      const m = load(locale);
      for (const k of keys) {
        expect(m[k], `${locale}.${k}`).toBeTruthy();
        expect(placeholders(m[k]!)).toEqual(placeholders(en[k]!));
      }
    });
  }
});
