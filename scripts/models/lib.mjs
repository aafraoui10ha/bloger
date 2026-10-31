// Shared helpers for the background-removal model scripts. Plain Node (no
// TypeScript) so they run during `npm run build` on Vercel without extra tools.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const MANIFEST_PATH = path.join(ROOT, "src/tools/image/bg-models.manifest.json");
export const PUBLIC_MODELS = path.join(ROOT, "public/models/background-removal");
/** Files above this size are served as numbered parts (keeps every static file small for the CDN). */
export const PART_SIZE = 16 * 1024 * 1024;

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Same-origin file names for a manifest entry: one file, or its numbered parts. */
export function servedNames(file) {
  if (!file.parts) return [file.path];
  return file.parts.map((_, i) => `${file.path}.part${String(i).padStart(3, "0")}`);
}

export function splitParts(buf) {
  if (buf.length <= PART_SIZE) return null;
  const parts = [];
  for (let off = 0; off < buf.length; off += PART_SIZE) parts.push(buf.subarray(off, Math.min(off + PART_SIZE, buf.length)));
  return parts;
}

export async function download(url, { attempts = 3 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { permanent: res.status < 500 && res.status !== 429 });
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (err.permanent || i === attempts) break;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

export function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

/** Writes a verified file (whole or split) under the version directory. */
export function writeServed(dir, file, buf) {
  const names = servedNames(file);
  const chunks = file.parts ? splitParts(buf) : [buf];
  names.forEach((name, i) => {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, chunks[i]);
  });
}

/** True when every served piece of `file` already exists with the right hash. */
export function servedIsValid(dir, file) {
  const names = servedNames(file);
  const expected = file.parts ?? [{ size: file.size, sha256: file.sha256 }];
  return names.every((name, i) => {
    const p = path.join(dir, name);
    if (!fs.existsSync(p) || fs.statSync(p).size !== expected[i].size) return false;
    return sha256(fs.readFileSync(p)) === expected[i].sha256;
  });
}
