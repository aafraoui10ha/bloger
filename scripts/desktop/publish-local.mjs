// Makes a downloaded desktop build installable from the website (/desktop) on this
// server: verifies each installer against SHA256SUMS.txt, copies it to
// public/downloads/desktop/windows/x64/ (gitignored, never committed) and writes the
// matching DESKTOP_* settings to .env.local (gitignored; .env is not touched).
//
//   node scripts/desktop/publish-local.mjs <folder with the installers and SHA256SUMS.txt>
//
// For production on Vercel, upload the installers to object storage (Cloudflare R2)
// instead and set the same DESKTOP_* variables in the Vercel project.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DEST = path.join(ROOT, "public/downloads/desktop/windows/x64");
const ENV_LOCAL = path.join(ROOT, ".env.local");

const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, "SHA256SUMS.txt"))) {
  console.error("Usage: node scripts/desktop/publish-local.mjs <folder containing the installers and SHA256SUMS.txt>");
  process.exit(1);
}

const sums = new Map(
  fs
    .readFileSync(path.join(src, "SHA256SUMS.txt"), "utf8")
    .split(/\r?\n/)
    .map((l) => /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(l.trim()))
    .filter(Boolean)
    .map((m) => [m[2].trim(), m[1].toLowerCase()]),
);

const found = {};
for (const [name, expected] of sums) {
  const m = /^Toolbox_(\d+\.\d+\.\d+)_x64(?:-setup\.exe|_[a-z]{2}-[A-Z]{2}\.msi)$/.exec(name);
  if (!m) continue;
  const file = path.join(src, name);
  const bytes = fs.readFileSync(file);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) {
    console.error(`✗ ${name}: SHA-256 does not match SHA256SUMS.txt — not published`);
    process.exit(1);
  }
  const format = name.endsWith(".exe") ? "exe" : "msi";
  if (found.version && found.version !== m[1]) throw new Error("The folder mixes installers of different versions");
  found.version = m[1];
  found[format] = { name, sha256: actual, size: bytes.length };
}
if (!found.version) {
  console.error("No Toolbox installers listed in SHA256SUMS.txt");
  process.exit(1);
}

// Replace previously published installers so only the current release is offered.
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
const settings = { DESKTOP_RELEASE_VERSION: found.version, DESKTOP_RELEASE_DATE: new Date().toISOString().slice(0, 10), DESKTOP_RELEASE_CHANNEL: "stable" };
for (const format of ["exe", "msi"]) {
  const key = format === "exe" ? "DESKTOP_EXE" : "DESKTOP_MSI";
  const f = found[format];
  if (!f) {
    Object.assign(settings, { [`${key}_URL`]: "", [`${key}_SHA256`]: "", [`${key}_SIZE`]: "" });
    continue;
  }
  fs.copyFileSync(path.join(src, f.name), path.join(DEST, f.name));
  Object.assign(settings, { [`${key}_URL`]: `/downloads/desktop/windows/x64/${f.name}`, [`${key}_SHA256`]: f.sha256, [`${key}_SIZE`]: String(f.size) });
  console.log(`✓ ${f.name} (${(f.size / 1048576).toFixed(1)} MB) verified and published`);
}

const existing = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/).filter((l) => !/^DESKTOP_[A-Z0-9_]+=/.test(l)) : [];
while (existing.length && existing[existing.length - 1] === "") existing.pop();
const block = Object.entries(settings).map(([k, v]) => `${k}="${v}"`);
fs.writeFileSync(ENV_LOCAL, [...existing, ...(existing.length ? [""] : []), "# Toolbox Desktop release shown on /desktop (written by publish-local.mjs)", ...block, ""].join("\n"));
console.log(`✓ .env.local updated for version ${found.version}. Restart the Next.js server (or rebuild) to show it on /desktop.`);
