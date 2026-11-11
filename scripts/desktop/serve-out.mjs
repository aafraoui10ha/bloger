// Serves desktop/out the way the Tauri asset protocol does, for browser tests of the
// desktop frontend: folder URLs resolve to index.html, and every HTML response carries
// the app's Content-Security-Policy with the inline-script hashes Tauri would add.
//
//   node scripts/desktop/serve-out.mjs [port]
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "desktop/out");
const port = Number(process.argv[2] ?? 3020);
const generated = path.join(ROOT, "src-tauri/tauri.generated.conf.json");
const base = JSON.parse(fs.readFileSync(path.join(ROOT, "src-tauri/tauri.conf.json"), "utf8"));
const csp = fs.existsSync(generated) ? JSON.parse(fs.readFileSync(generated, "utf8")).app.security.csp : base.app.security.csp;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain" };

function cspFor(html) {
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);
  const directives = { ...csp, "script-src": `${csp["script-src"]} ${[...new Set(hashes)].join(" ")}` };
  return Object.entries(directives).map(([k, v]) => `${k} ${v}`).join("; ");
}

const server = http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let file = path.normalize(path.join(OUT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(OUT)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    let status = 200;
    if (!fs.existsSync(file)) {
      status = 404;
      file = path.join(OUT, "404.html");
    }
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    const body = fs.readFileSync(file);
    const headers = { "Content-Type": type, "Cache-Control": "no-store" };
    if (type.startsWith("text/html")) headers["Content-Security-Policy"] = cspFor(body.toString("utf8"));
    res.writeHead(status, headers).end(body);
  })
  .listen(port, () => console.log(`desktop/out on http://localhost:${port}`));
// Exit promptly when the test runner stops the server (idle keep-alive sockets would otherwise keep it alive).
server.keepAliveTimeout = 1000;
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => process.exit(0));
