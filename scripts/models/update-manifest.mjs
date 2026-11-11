// Regenerates src/tools/image/bg-models.manifest.json from pinned upstream files.
//
//   node scripts/models/update-manifest.mjs
//
// Every SHA-256 in the manifest is calculated here from the exact bytes that are
// deployed, and each file is cross-checked against an independent upstream record
// before it is accepted:
//   - Hugging Face LFS files: the repository's LFS object id (the SHA-256 of the file).
//   - Hugging Face plain files: the repository's git blob id (SHA-1 of "blob <size>\0" + bytes).
//   - ONNX Runtime files: the npm package installed from package-lock.json (integrity-checked
//     by npm) must be byte-identical to the same version on jsDelivr.
// Run it only when changing a model or upgrading @huggingface/transformers.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { download, MANIFEST_PATH, PUBLIC_MODELS, ROOT, sha256, splitParts, writeServed } from "./lib.mjs";

const MODELS = [
  { id: "onnx-community/BiRefNet_lite-ONNX", revision: "de15b22ba131738a16dff04aab8bdf8dc32e3ac1", files: ["config.json", "preprocessor_config.json", "onnx/model_fp16.onnx"] },
  { id: "Xenova/modnet", revision: "fa2fa546052fba4c08921230a26cc69a333fca12", files: ["config.json", "preprocessor_config.json", "onnx/model.onnx"] },
];
// The runtime variants Transformers.js selects: asyncify (default) and plain (Safari < 26 without WebGPU).
const ORT_FILES = ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

const CONTENT_TYPES = { ".json": "application/json", ".onnx": "application/octet-stream", ".wasm": "application/wasm", ".mjs": "text/javascript" };
const contentType = (p) => CONTENT_TYPES[path.extname(p)] ?? "application/octet-stream";
const gitBlobSha1 = (buf) => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

async function hfTree(id, revision, dir) {
  const res = await fetch(`https://huggingface.co/api/models/${id}/tree/${revision}${dir ? `/${dir}` : ""}`);
  if (!res.ok) throw new Error(`Hugging Face API ${res.status} for ${id}`);
  return res.json();
}

const files = [];
const blobs = new Map();

for (const model of MODELS) {
  const tree = [...(await hfTree(model.id, model.revision, "")), ...(await hfTree(model.id, model.revision, "onnx"))];
  for (const name of model.files) {
    const entry = tree.find((e) => e.type === "file" && e.path === name);
    if (!entry) throw new Error(`${model.id}@${model.revision} has no ${name}`);
    const external = `https://huggingface.co/${model.id}/resolve/${model.revision}/${name}`;
    const buf = await download(external);
    if (buf.length !== entry.size) throw new Error(`${name}: size ${buf.length} != upstream ${entry.size}`);
    const digest = sha256(buf);
    let verifiedBy;
    if (entry.lfs) {
      if (digest !== entry.lfs.oid) throw new Error(`${model.id}/${name}: SHA-256 does not match the LFS object id`);
      verifiedBy = `Hugging Face LFS SHA-256 at revision ${model.revision}`;
    } else {
      if (gitBlobSha1(buf) !== entry.oid) throw new Error(`${model.id}/${name}: bytes do not match the git blob id`);
      verifiedBy = `Hugging Face git blob SHA-1 at revision ${model.revision}`;
    }
    const p = `hf/${model.id}/${name}`;
    files.push({ path: p, size: buf.length, sha256: digest, contentType: contentType(name), external, verifiedBy });
    blobs.set(p, buf);
    console.log(`verified ${p} (${buf.length} bytes)`);
  }
}

const ortVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/onnxruntime-web/package.json"), "utf8")).version;
for (const name of ORT_FILES) {
  const local = fs.readFileSync(path.join(ROOT, "node_modules/onnxruntime-web/dist", name));
  const external = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/${name}`;
  const remote = await download(external);
  if (!local.equals(remote)) throw new Error(`${name}: npm package and jsDelivr copies differ`);
  const p = `ort/${name}`;
  files.push({ path: p, size: local.length, sha256: sha256(local), contentType: contentType(name), external, verifiedBy: `onnxruntime-web@${ortVersion}: npm package identical to jsDelivr` });
  blobs.set(p, local);
  console.log(`verified ${p} (${local.length} bytes)`);
}

for (const f of files) {
  const parts = splitParts(blobs.get(f.path));
  if (parts) f.parts = parts.map((b) => ({ size: b.length, sha256: sha256(b) }));
}

const version = "v" + sha256(files.map((f) => `${f.path}:${f.sha256}`).join("\n")).slice(0, 12);
const manifest = { version, ortVersion, models: MODELS.map(({ id, revision }) => ({ id, revision })), files };
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

const dir = path.join(PUBLIC_MODELS, version);
for (const f of files) writeServed(dir, f, blobs.get(f.path));
console.log(`manifest ${version} written; files in public/models/background-removal/${version}`);
