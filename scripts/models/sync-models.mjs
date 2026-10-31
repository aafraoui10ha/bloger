// Puts the exact model files listed in the manifest into
// public/models/background-removal/<version>/ so the site serves them itself.
// Runs automatically before `npm run build` (locally and on Vercel).
//
// Files already present with the right SHA-256 are kept. Missing or wrong files
// are taken from the installed npm package (ONNX Runtime) or downloaded from the
// pinned upstream URL, and are written only after their SHA-256 matches the
// manifest. Any mismatch stops the build: an unverified model is never deployed.
// Set SKIP_MODEL_SYNC=1 to skip; the tool then uses the external sources only.
import fs from "node:fs";
import path from "node:path";
import { download, PUBLIC_MODELS, readManifest, ROOT, servedIsValid, sha256, writeServed } from "./lib.mjs";

if (process.env.SKIP_MODEL_SYNC === "1") {
  console.warn("[models] SKIP_MODEL_SYNC=1: not self-hosting model files; the tool will download them from Hugging Face and jsDelivr.");
  process.exit(0);
}

const manifest = readManifest();
const dir = path.join(PUBLIC_MODELS, manifest.version);

// Drop directories of older manifest versions so stale files are never deployed.
if (fs.existsSync(PUBLIC_MODELS)) {
  for (const entry of fs.readdirSync(PUBLIC_MODELS)) {
    if (entry !== manifest.version) fs.rmSync(path.join(PUBLIC_MODELS, entry), { recursive: true, force: true });
  }
}

let fetched = 0;
for (const file of manifest.files) {
  if (servedIsValid(dir, file)) continue;
  let buf = null;
  if (file.path.startsWith("ort/")) {
    const local = path.join(ROOT, "node_modules/onnxruntime-web/dist", path.basename(file.path));
    if (fs.existsSync(local)) {
      const candidate = fs.readFileSync(local);
      if (sha256(candidate) === file.sha256) buf = candidate;
    }
  }
  if (!buf) {
    console.log(`[models] downloading ${file.path}`);
    buf = await download(file.external);
  }
  if (buf.length !== file.size || sha256(buf) !== file.sha256) {
    console.error(`[models] ${file.path}: size or SHA-256 does not match the manifest. Refusing to deploy it.`);
    process.exit(1);
  }
  writeServed(dir, file, buf);
  fetched++;
}

const total = manifest.files.reduce((n, f) => n + f.size, 0);
console.log(`[models] ${manifest.version}: ${manifest.files.length} files verified (${(total / 1048576).toFixed(1)} MB), ${fetched} written`);
