import { afterEach, describe, expect, it } from "vitest";
import { checkForUpdate, compareVersions, downloadPage } from "@desktop/shell/updates";
import { GET } from "@/app/api/desktop/releases/latest/route";

const RELEASE_ENV = {
  DESKTOP_RELEASE_VERSION: "1.2.0",
  DESKTOP_RELEASE_DATE: "2026-11-02",
  DESKTOP_EXE_URL: "/downloads/desktop/windows/x64/Toolbox_1.2.0_x64-setup.exe",
  DESKTOP_EXE_SHA256: "c".repeat(64),
  DESKTOP_EXE_SIZE: "9000000",
};
const saved = { ...process.env };
afterEach(() => {
  for (const k of Object.keys(RELEASE_ENV)) delete process.env[k];
  delete process.env.DESKTOP_RELEASE_CHANNEL;
  Object.assign(process.env, saved);
});

describe("version comparison", () => {
  it("orders semantic versions numerically", () => {
    expect(compareVersions("1.0.10", "1.0.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.1", "1.0.1")).toBe(0);
    expect(compareVersions("1.0.0", "1.1.0")).toBeLessThan(0);
  });
});

describe("update check", () => {
  const reply = (status: number, body?: unknown) => (async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as unknown as typeof fetch;
  it("reports a newer version, the current version, or problems", async () => {
    const latest = { version: "1.2.0", channel: "stable", date: "2026-11-02", page: "https://toolbox.example/desktop" };
    expect(await checkForUpdate("1.0.1", "https://toolbox.example", reply(200, latest))).toEqual({ state: "available", current: "1.0.1", latest });
    expect((await checkForUpdate("1.2.0", "https://toolbox.example", reply(200, latest))).state).toBe("current");
    expect((await checkForUpdate("1.0.1", "https://toolbox.example", reply(404))).state).toBe("current");
    expect((await checkForUpdate("1.0.1", "https://toolbox.example", reply(500))).state).toBe("error");
    expect((await checkForUpdate("1.0.1", "https://toolbox.example", reply(200, { version: "<script>" }))).state).toBe("error");
    expect(await checkForUpdate("1.0.1", "")).toEqual({ state: "unconfigured" });
  });
  it("never trusts a non-https download page from the response", async () => {
    const r = await checkForUpdate("1.0.0", "https://toolbox.example", reply(200, { version: "2.0.0", page: "javascript:alert(1)" }));
    expect(r.state === "available" && r.latest.page).toBe("https://toolbox.example/desktop");
  });
  it("links to the download page in the app's language", () => {
    expect(downloadPage({ version: "1", channel: "stable", date: null, page: "https://toolbox.example/desktop" }, "fr")).toBe("https://toolbox.example/fr/desktop");
    expect(downloadPage({ version: "1", channel: "stable", date: null, page: "https://toolbox.example/ar/desktop" }, "en")).toBe("https://toolbox.example/ar/desktop");
  });
});

describe("GET /api/desktop/releases/latest", () => {
  const call = (q = "") => GET(new Request(`https://toolbox.example/api/desktop/releases/latest${q}`));
  it("returns 404 when no release is published", async () => {
    const res = call();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_release" });
  });
  it("returns the published release with absolute URLs and CORS for the app", async () => {
    Object.assign(process.env, RELEASE_ENV);
    const res = call("?platform=windows-x86_64&channel=stable");
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body).toMatchObject({ version: "1.2.0", channel: "stable", page: "https://toolbox.example/desktop" });
    expect(body.installers[0]).toEqual({ format: "exe", url: "https://toolbox.example/downloads/desktop/windows/x64/Toolbox_1.2.0_x64-setup.exe", sha256: "c".repeat(64), size: 9000000 });
  });
  it("keeps beta releases away from stable clients and rejects unknown platforms", async () => {
    Object.assign(process.env, RELEASE_ENV, { DESKTOP_RELEASE_CHANNEL: "beta" });
    expect(call("?channel=stable").status).toBe(404);
    expect(call("?channel=beta").status).toBe(200);
    expect(call("?platform=darwin-aarch64").status).toBe(400);
    expect(call("?channel=nightly").status).toBe(400);
  });
});
