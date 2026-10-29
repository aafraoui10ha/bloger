import { expect, test } from "@playwright/test";
import { login } from "./fixtures";

test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);
const title = `E2E guide ${stamp}`;
const slug = `e2e-guide-${stamp}`;
const body = Array.from({ length: 180 }, (_, i) => `sentence${i}`).join(" ");
let articleUrl = "";

test("unauthorized users cannot reach admin operations (journey 10)", async ({ page, request }) => {
  const res = await request.get("/admin/articles", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/admin/login");

  await login(page, "author");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await page.goto("/admin/ads");
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  // Controls the author may not use are not rendered either.
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Users & roles" })).toHaveCount(0);
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("e2e-admin@localhost.test");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
});

test("administrator logs in and creates a draft article (journeys 4–5)", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/articles/new");
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/admin\/articles\/(?!new$)[a-z0-9]{20,}$/);
  articleUrl = page.url();

  await page.getByLabel("Excerpt").fill("A practical end-to-end test article that explains the full workflow clearly.");
  await page.locator(".tiptap").click();
  await page.keyboard.insertText(body);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
});

test("draft article is not publicly reachable or indexed (journey 9)", async ({ request }) => {
  expect((await request.get(`/en/blog/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
});

test("editor updates the article and an authorized user publishes it (journeys 6–7)", async ({ page }) => {
  await login(page, "editor");
  await page.goto(articleUrl);
  // Publishing is blocked until a translation is marked complete.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Cannot publish yet" })).toBeVisible();

  await page.getByLabel("Excerpt").fill("Updated by the editor: a practical article explaining the complete publishing workflow.");
  await page.getByText("Translation complete (publicly visible)").click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

  await page.goto(`${articleUrl}/revisions`);
  await expect(page.getByRole("cell", { name: "E2E Editor" }).first()).toBeVisible();
});

test("published article appears at its canonical URL with metadata (journey 8)", async ({ page, request }) => {
  const res = await page.goto(`/en/blog/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/en/blog/${slug}$`));
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((s) => s.includes('"BlogPosting"') && s.includes("E2E Admin"))).toBe(true);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`/en/blog/${slug}`);
});

test("cleanup: administrator deletes the test article with a redirect", async ({ page, request }) => {
  await login(page, "admin");
  await page.goto(articleUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByLabel(/Redirect old URLs to/).fill("/en/blog");
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/admin\/articles$/);
  const res = await request.get(`/en/blog/${slug}`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/en/blog");
});

test("every dashboard section renders for an administrator", async ({ page }) => {
  await login(page, "admin");
  const sections = [
    "/admin", "/admin/articles", "/admin/categories", "/admin/categories?kind=TOOL", "/admin/categories/new?kind=TOOL", "/admin/tags",
    "/admin/tools", "/admin/pages", "/admin/media", "/admin/navigation", "/admin/users", "/admin/seo", "/admin/redirects",
    "/admin/ads", "/admin/consent", "/admin/analytics", "/admin/settings", "/admin/audit", "/admin/account",
  ];
  for (const path of sections) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toBeVisible();
    await expect(page.getByText("Something went wrong"), path).toHaveCount(0);
  }
  // Detail pages: first tool and first page.
  await page.goto("/admin/tools");
  await page.locator("main table a").first().click();
  await expect(page.getByRole("tab", { name: /English/ })).toBeVisible();
  await page.goto("/admin/pages");
  await page.locator("main table a").first().click();
  await expect(page.getByRole("tab", { name: "Français" })).toBeVisible();
});

test("AdSense settings reject invalid publisher IDs and never claim approval", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/ads");
  await expect(page.getByText("Live ad code will NOT load.")).toBeVisible();
  await page.getByLabel("Publisher ID").fill("pub-123");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Publisher ID must look like ca-pub-0000000000000000.")).toBeVisible();
});
