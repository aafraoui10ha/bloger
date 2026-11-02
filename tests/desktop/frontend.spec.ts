import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("desktop/src/generated/catalog.json", "utf8")) as { tools: { key: string; title: { en: string } }[] };

/** Fails the test on uncaught errors and Content-Security-Policy violations. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** A stand-in for the Tauri bridge (window.__TAURI_INTERNALS__) that records native calls. */
async function mockTauri(page: Page) {
  await page.addInitScript(() => {
    const calls: { cmd: string; bytes: number | null; headers: Record<string, string> | null; args: unknown }[] = [];
    (window as unknown as { __calls: typeof calls }).__calls = calls;
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
      transformCallback: () => 1,
      invoke: async (cmd: string, args: unknown, options?: { headers?: Record<string, string> }) => {
        calls.push({ cmd, bytes: args instanceof Uint8Array ? args.byteLength : null, headers: options?.headers ?? null, args: args instanceof Uint8Array ? null : args });
        if (cmd === "save_file") return "C:\\Users\\test\\Documents\\saved-file";
        if (cmd === "app_info") return { name: "Toolbox", version: "1.0.0", buildId: "ci-123", channel: "stable", releaseDate: "2026-11-01", profile: "production", platform: "windows", arch: "x86_64", tauriVersion: "2.9.0" };
        return null;
      },
    };
  });
}

test("home, sidebar navigation, categories and search", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Toolbox" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Categories" });
  await nav.getByRole("link", { name: "Design tools" }).click();
  await expect(page).toHaveURL(/\/tools\/design\/$/);
  await expect(page.getByRole("heading", { name: "Design tools" })).toBeVisible();
  await expect(page.locator("[data-tool]")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search tools" }).fill("palette");
  await expect(page).toHaveURL(/\/tools\/\?q=palette$/);
  await expect(page.locator('[data-tool="color-palettes"]')).toBeVisible();
  await page.keyboard.press("Control+,");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("every tool opens offline from the static export without errors", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const external: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("http://localhost:3020") && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u);
  });
  for (const tool of catalog.tools) {
    await page.goto(`/tool/${tool.key}/`);
    await expect(page.getByRole("heading", { level: 1, name: tool.title.en })).toBeVisible();
    const section = page.getByRole("region", { name: tool.title.en });
    await expect(section).toBeVisible();
    await expect(section.locator(".animate-pulse.h-64")).toHaveCount(0, { timeout: 20_000 });
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("switches between English, French and Arabic, with right-to-left layout", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/settings/");
  await page.getByLabel("Language").selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("link", { name: "الرئيسية" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goto("/tool/chart-designer/");
  await expect(page.getByRole("heading", { level: 1, name: "مصمم الرسوم البيانية والإنفوجرافيك" })).toBeVisible();
  await page.goto("/settings/");
  await page.getByLabel("اللغة").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: "Accueil" })).toBeVisible();
  await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
});

test("follows the system language on first launch", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "fr-FR", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3020/");
  await expect(page.getByRole("heading", { name: "Bienvenue dans Toolbox" })).toBeVisible();
  await ctx.close();
});

test("keeps favourites, recent tools and designer projects locally", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/tool/word-counter/");
  await page.getByRole("button", { name: "Add to favourites" }).click();
  await page.goto("/tool/chart-designer/");
  await expect(page.getByTestId("chart-designer")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Design name").fill("Desktop test design");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByLabel("Design name")).toHaveValue("Desktop test design", { timeout: 30_000 });

  await page.goto("/favorites/");
  await expect(page.locator('[data-tool="word-counter"]')).toBeVisible();
  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recently used" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Recently used" }) }));
  await expect(recent.locator('[data-tool="chart-designer"]')).toBeVisible();
  await page.goto("/projects/");
  await expect(page.getByText("Desktop test design")).toBeVisible();
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(page).toHaveURL(/\/tool\/chart-designer\/$/);
  await expect(page.getByLabel("Design name")).toHaveValue("Desktop test design", { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("sends tool downloads to the native save dialog and shows app info", async ({ page }) => {
  await mockTauri(page);
  const errors = watchErrors(page);
  await page.goto("/tool/pattern-generator/");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to C:\\Users\\test\\Documents\\saved-file" })).toBeVisible();
  const calls = await page.evaluate(() => (window as unknown as { __calls: { cmd: string; bytes: number | null; headers: Record<string, string> | null }[] }).__calls);
  const save = calls.find((c) => c.cmd === "save_file")!;
  expect(save.bytes).toBeGreaterThan(500);
  expect(decodeURIComponent(save.headers!["x-file-name"]!)).toBe("pattern-dots-1200x800.svg");

  await page.goto("/about/");
  await expect(page.getByTestId("app-version")).toHaveText("Version 1.0.0");
  await expect(page.getByText("ci-123")).toBeVisible();
  await expect(page.getByText("Windows x64")).toBeVisible();

  // Agency section: links open in the default browser through the opener plugin.
  await expect(page.getByTestId("agency-card")).toContainText("Have a project in mind?");
  await page.getByRole("button", { name: "Contact us on WhatsApp" }).click();
  await page.getByTestId("agency-link").click();
  await expect
    .poll(async () => (await page.evaluate(() => (window as unknown as { __calls: { cmd: string; args: unknown }[] }).__calls)).filter((c) => c.cmd === "plugin:opener|open_url").map((c) => (c.args as { url: string }).url))
    .toEqual(["https://wa.me/212619043143", "https://nexoraat.com/en"]);
  expect(page.url()).toContain("/about/");

  // Home page call to action: the website's "Built by Nexoraat" block.
  await page.goto("/");
  const cta = page.getByTestId("agency-cta");
  await expect(cta).toContainText("Built by Nexoraat");
  await cta.getByRole("button", { name: "Visit nexoraat.com" }).click();
  await cta.getByRole("button", { name: "See our services" }).click();
  await expect
    .poll(async () => (await page.evaluate(() => (window as unknown as { __calls: { cmd: string; args: unknown }[] }).__calls)).filter((c) => c.cmd === "plugin:opener|open_url").map((c) => (c.args as { url: string }).url))
    .toEqual(["https://nexoraat.com/en", "https://nexoraat.com/en/services"]);
  expect(errors).toEqual([]);
});
