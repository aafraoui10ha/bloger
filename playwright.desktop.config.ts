import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the desktop frontend (desktop/out, built with `npm run desktop:frontend`).
 * They run the exported app in Chromium, the engine WebView2 uses on Windows, behind the
 * app's real Content-Security-Policy. The packaged Tauri app itself is tested separately.
 */
export default defineConfig({
  testDir: "tests/desktop",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3020", trace: "retain-on-failure", locale: "en-US", viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: "reduce" } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: "node scripts/desktop/serve-out.mjs 3020", url: "http://localhost:3020/", reuseExistingServer: true, timeout: 30_000, gracefulShutdown: { signal: "SIGTERM", timeout: 2_000 } },
});
