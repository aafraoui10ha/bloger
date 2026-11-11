// Writes src-tauri/tauri.generated.conf.json from the central desktop environment
// variables, so no domain is hard-coded. It is merged over tauri.conf.json with
// `tauri build --config src-tauri/tauri.generated.conf.json`.
//
//   TOOLBOX_SITE_URL           official website (models are downloaded from here), e.g. https://example.com
//   TOOLBOX_DOWNLOAD_BASE_URL  where installers are served (Phase 4)
//   TOOLBOX_UPDATE_ENDPOINT    Tauri updater endpoint (Phase 5)
//
// All are optional for development builds. Without TOOLBOX_SITE_URL the background
// remover falls back to its verified Hugging Face / jsDelivr sources.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const base = JSON.parse(fs.readFileSync(path.join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));

export function originOf(value, name) {
  if (!value) return "";
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL (got "${value}")`);
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error(`${name} must use https:// (got "${value}")`);
  return url.origin;
}

export function desktopCsp(siteOrigin) {
  const csp = { ...base.app.security.csp };
  if (siteOrigin) {
    csp["script-src"] += ` ${siteOrigin}`;
    csp["connect-src"] += ` ${siteOrigin}`;
  }
  return csp;
}

const site = originOf(process.env.TOOLBOX_SITE_URL ?? "", "TOOLBOX_SITE_URL");
originOf(process.env.TOOLBOX_DOWNLOAD_BASE_URL ?? "", "TOOLBOX_DOWNLOAD_BASE_URL");
originOf(process.env.TOOLBOX_UPDATE_ENDPOINT ?? "", "TOOLBOX_UPDATE_ENDPOINT");

// The Chart Designer's fonts are part of the app (1.3 MB, OFL); the models are not.
fs.rmSync(path.join(ROOT, "desktop/public/fonts"), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public/fonts/designer"), path.join(ROOT, "desktop/public/fonts/designer"), { recursive: true });

// The ONNX Runtime glue scripts (.mjs, ~77 KB) are imported by URL, so the app ships
// them, verified against the model manifest. The large .wasm and model files are not
// bundled: they are downloaded once, SHA-256 checked and cached at runtime.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "src/tools/image/bg-models.manifest.json"), "utf8"));
const ortDir = path.join(ROOT, "desktop/public/ort");
fs.rmSync(ortDir, { recursive: true, force: true });
fs.mkdirSync(ortDir, { recursive: true });
for (const f of manifest.files.filter((x) => x.path.startsWith("ort/") && x.path.endsWith(".mjs"))) {
  const name = path.basename(f.path);
  const bytes = fs.readFileSync(path.join(ROOT, "node_modules/onnxruntime-web/dist", name));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== f.sha256) throw new Error(`${name}: SHA-256 does not match the model manifest`);
  fs.writeFileSync(path.join(ortDir, name), bytes);
}

const generated = { app: { security: { csp: desktopCsp(site) } } };
fs.writeFileSync(path.join(ROOT, "src-tauri/tauri.generated.conf.json"), JSON.stringify(generated, null, 2) + "\n");
console.log(`[desktop] config written (website: ${site || "not set — models use the verified fallback sources"})`);
