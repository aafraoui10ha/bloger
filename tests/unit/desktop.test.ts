import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { TOOL_MODULES } from "@/tools/registry";
import { CATEGORIES, getTool, searchTools, toolsIn, TOOLS } from "@desktop/catalog";
import { systemLocale } from "@desktop/shell/store";

describe("desktop tool catalog", () => {
  it("lists every registered tool with titles in all three languages", () => {
    expect(TOOLS.map((t) => t.key).sort()).toEqual(Object.keys(TOOL_MODULES).sort());
    for (const t of TOOLS) for (const l of ["en", "fr", "ar"] as const) expect(t.title[l] && t.short[l], `${t.key}.${l}`).toBeTruthy();
    expect(getTool("chart-designer")?.wide).toBe(true);
  });
  it("only offers categories that contain working tools", () => {
    for (const c of CATEGORIES) expect(toolsIn(c).length, c).toBeGreaterThan(0);
    expect(toolsIn("colors").map((t) => t.key)).toContain("color-palettes");
    expect(TOOLS.some((t) => /pdf/i.test(t.key))).toBe(false);
  });
  it("searches titles and descriptions, ignoring accents", () => {
    expect(searchTools("compresseur", "fr").map((t) => t.key)).toContain("image-compressor");
    expect(searchTools("ELIMINER", "en")).toEqual([]);
    expect(searchTools("خلفية", "ar").map((t) => t.key)).toContain("background-remover");
    expect(searchTools("  ", "en")).toHaveLength(TOOLS.length);
  });
});

describe("desktop settings", () => {
  it("uses the system language on first launch when supported", () => {
    expect(systemLocale(["fr-FR", "en-US"])).toBe("fr");
    expect(systemLocale(["ar-MA"])).toBe("ar");
    expect(systemLocale(["de-DE", "en-GB"])).toBe("en");
    expect(systemLocale(["es-ES"])).toBe("en");
    expect(systemLocale([])).toBe("en");
  });
});

describe("desktop packaging config", () => {
  const conf = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const caps = JSON.parse(fs.readFileSync("src-tauri/capabilities/default.json", "utf8"));
  it("identifies the app and reads its version from package.json", () => {
    expect(conf.identifier).toBe("com.toolbox.desktop");
    expect(conf.productName).toBe("Toolbox");
    expect(conf.version).toBe("../package.json");
    expect(JSON.parse(fs.readFileSync("package.json", "utf8")).version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(fs.readFileSync("src-tauri/Cargo.toml", "utf8")).toMatch(new RegExp(`^version = "${JSON.parse(fs.readFileSync("package.json", "utf8")).version}"`, "m"));
  });
  it("builds MSI and NSIS installers for Windows", () => {
    expect(conf.bundle.targets).toEqual(["nsis", "msi"]);
    expect(conf.bundle.windows.nsis.languages).toEqual(["English", "French", "Arabic"]);
  });
  it("keeps the webview locked down", () => {
    const csp = conf.app.security.csp;
    expect(csp["default-src"]).toBe("'self'");
    const scriptSrc = csp["script-src"].split(/\s+/);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp["object-src"]).toBe("'none'");
    expect(conf.app.windows[0].useHttpsScheme).toBe(true);
    expect(caps.windows).toEqual(["main"]);
    expect(caps.remote).toBeUndefined();
    expect(caps.permissions).toEqual(["core:default", "opener:default", "allow-save-file", "allow-app-info"]);
    expect(caps.permissions.some((p: string) => /^(fs|shell|http):/.test(p))).toBe(false);
  });
});
