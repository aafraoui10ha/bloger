// Desktop version management. package.json "version" is the single source of truth;
// tauri.conf.json reads it directly ("version": "../package.json") and this script keeps
// src-tauri/Cargo.toml (and Cargo.lock, when present) in step.
//
//   node scripts/desktop/version.mjs check              exit 1 if anything disagrees
//   node scripts/desktop/version.mjs set 1.2.3
//   node scripts/desktop/version.mjs bump patch|minor|major
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PKG = path.join(ROOT, "package.json");
const CARGO = path.join(ROOT, "src-tauri/Cargo.toml");
const LOCK = path.join(ROOT, "src-tauri/Cargo.lock");
const TAURI = path.join(ROOT, "src-tauri/tauri.conf.json");
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;

const readPkg = () => JSON.parse(fs.readFileSync(PKG, "utf8"));
const cargoVersion = (toml) => /^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m.exec(toml)?.[1];

export function bump(version, part) {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`Not a semantic version: ${version}`);
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (part === "major") [major, minor, patch] = [major + 1, 0, 0];
  else if (part === "minor") [minor, patch] = [minor + 1, 0];
  else if (part === "patch") patch += 1;
  else throw new Error(`Unknown part "${part}" (use major, minor or patch)`);
  return `${major}.${minor}.${patch}`;
}

function check() {
  const problems = [];
  const v = readPkg().version;
  if (!SEMVER.test(v)) problems.push(`package.json version "${v}" is not MAJOR.MINOR.PATCH`);
  const cargo = cargoVersion(fs.readFileSync(CARGO, "utf8"));
  if (cargo !== v) problems.push(`src-tauri/Cargo.toml has ${cargo}, package.json has ${v}`);
  const tauri = JSON.parse(fs.readFileSync(TAURI, "utf8")).version;
  if (tauri !== "../package.json" && tauri !== v) problems.push(`tauri.conf.json version is ${tauri}`);
  if (fs.existsSync(LOCK)) {
    const lock = /name = "toolbox-desktop"\r?\nversion = "([^"]+)"/.exec(fs.readFileSync(LOCK, "utf8"))?.[1];
    if (lock && lock !== v) problems.push(`src-tauri/Cargo.lock has ${lock}`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`✓ desktop version ${v} is consistent`);
}

function set(v) {
  if (!SEMVER.test(v)) throw new Error(`Not a semantic version: ${v}`);
  const pkg = readPkg();
  pkg.version = v;
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + "\n");
  const toml = fs.readFileSync(CARGO, "utf8").replace(/^(\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m, `$1${v}$2`);
  fs.writeFileSync(CARGO, toml);
  if (fs.existsSync(LOCK)) {
    fs.writeFileSync(LOCK, fs.readFileSync(LOCK, "utf8").replace(/(name = "toolbox-desktop"\r?\nversion = ")[^"]+(")/, `$1${v}$2`));
  }
  console.log(`desktop version set to ${v}`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/desktop/version.mjs")) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "check" || !cmd) check();
    else if (cmd === "set") set(arg);
    else if (cmd === "bump") set(bump(readPkg().version, arg));
    else throw new Error(`Unknown command "${cmd}"`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
