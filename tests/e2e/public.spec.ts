import { expect, test } from "@playwright/test";
import { makePng } from "./fixtures";

test.describe("anonymous visitor", () => {
  test("uses the image compressor and downloads a correctly named result (journeys 1–2)", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") requests.push(r.url());
    });
    await page.goto("/en/tools/image-compressor");
    await expect(page.getByRole("heading", { level: 1, name: "Image Compressor" })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: "gradient.png", mimeType: "image/png", buffer: makePng(400, 300) });
    await page.getByRole("button", { name: "Compress image" }).click();
    const download = page.getByRole("link", { name: /Download gradient-compressed\.jpg/ });
    await expect(download).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/^(Saved|The result is)/)).toBeVisible();

    const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
    expect(file.suggestedFilename()).toBe("gradient-compressed.jpg");
    // Processing is local: no file upload request was made.
    expect(requests).toEqual([]);
  });

  test("rejects a file whose content does not match an accepted image type", async ({ page }) => {
    await page.goto("/en/tools/png-to-jpg");
    await page.locator('input[type="file"]').setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image at all") });
    await expect(page.getByRole("alert").filter({ hasText: "isn’t supported" })).toBeVisible();
  });

  test("text and calculator tools work", async ({ page }) => {
    await page.goto("/en/tools/word-counter");
    await page.getByLabel("Input").fill("Hello world. Bonjour le monde !");
    await expect(page.locator("dt", { hasText: /^Words$/ }).locator("+ dd")).toHaveText("5");
    await page.goto("/en/tools/discount-calculator");
    await page.getByLabel("Original price").fill("200");
    await page.getByLabel("Discount (%)").fill("25");
    await page.getByLabel("Tax / VAT (%)").fill("20");
    await page.getByRole("button", { name: "Calculate" }).click();
    await expect(page.locator("dt", { hasText: "Final price" }).locator("+ dd")).toHaveText("180");
  });

  test("switches language to the matching localized page with correct dir (journey 3)", async ({ page }) => {
    await page.goto("/en/tools/image-compressor");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/tools\/compresseur-image$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.getByRole("link", { name: "العربية" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ضغط الصور");
  });

  test("never loads ad or analytics code while unauthorized (journey 11)", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (/googlesyndication|doubleclick|googletagmanager|google-analytics/.test(r.url())) external.push(r.url());
    });
    for (const path of ["/ar", "/fr/tools", "/en/tools/image-resizer", "/en"]) await page.goto(path);
    await page.getByRole("button", { name: "Accept all" }).click();
    await page.goto("/en/tools/word-counter");
    expect(external).toEqual([]);
    expect(await page.locator("ins.adsbygoogle").count()).toBe(0);
  });

  test("cookie preferences persist and can be changed (journey 12)", async ({ page }) => {
    await page.goto("/en");
    const banner = page.getByRole("region", { name: "Your privacy choices" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Reject optional" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", { name: "Your privacy choices" })).toBeHidden();
    const cookie = (await page.context().cookies()).find((c) => c.name === "ta_consent");
    expect(cookie?.value).toMatch(/^v\d+\.a0\.d0\.t\d+$/);

    await page.goto("/en/cookie-settings");
    const panel = page.locator("section", { has: page.getByRole("heading", { name: "Manage your preferences" }) }).last();
    await panel.getByRole("switch", { name: "Analytics" }).check();
    await panel.getByRole("button", { name: "Save choices" }).click();
    await expect(page.getByText("Your preferences were saved.")).toBeVisible();
    const updated = (await page.context().cookies()).find((c) => c.name === "ta_consent");
    expect(updated?.value).toMatch(/\.a1\.d0\./);
  });

  test("sitemap lists eligible public URLs only (journey 13)", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/en/tools/image-compressor");
    expect(xml).toContain("/fr/tools/compresseur-image");
    expect(xml).toContain('hreflang="ar"');
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/search");
    expect(xml).not.toContain("how-to-compress-images-for-websites"); // seeded demo draft
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  test("unknown pages return a 404 with helpful links", async ({ page }) => {
    const res = await page.goto("/en/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  });
});

// Submits only invalid input: a valid submission would send real email.
test("contact form validates input without sending", async ({ page }) => {
  await page.goto("/en/contact");
  await page.getByLabel("Your email").fill("not-an-email");
  await page.getByLabel("Message").fill("short");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please check the highlighted fields." })).toBeVisible();
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Message")).toHaveValue("short");
  await page.goto("/ar/اتصل-بنا");
  await expect(page.getByRole("button", { name: "إرسال الرسالة" })).toBeVisible();
});

test("services page lists agency services and links to nexoraat.com; about links too", async ({ page }) => {
  await page.goto("/en/services");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Services");
  await expect(page.getByRole("heading", { name: "Web development" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Visit nexoraat\.com/ })).toHaveAttribute("href", "https://nexoraat.com/en/services");
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
  await page.goto("/fr/a-propos");
  await expect(page.getByRole("link", { name: /Visiter nexoraat\.com/ })).toHaveAttribute("href", "https://nexoraat.com/fr/about");
  await page.goto("/ar/خدماتنا");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("new tools work: loan calculator and password generator", async ({ page }) => {
  await page.goto("/en/tools/loan-calculator");
  await page.getByLabel("Loan amount").fill("200000");
  await page.getByLabel("Annual interest rate (%)").fill("5");
  await page.getByLabel("Term (years)").fill("30");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.getByText("1,073.64", { exact: true })).toBeVisible();
  await page.goto("/en/tools/password-generator");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(/^.{16}$/);
});

test("background remover page renders and rejects non-image files", async ({ page }) => {
  await page.goto("/en/tools/remove-background");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Background Remover");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });
  await expect(page.locator(".alert-error")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove background" })).toHaveCount(0);
});

// Runs the real model from this website's own copy (needs `npm run build`, which syncs the files).
test("background remover runs from self-hosted model files and never uploads the image", async ({ page }) => {
  test.setTimeout(240_000);
  const png = makePng(320, 240);
  const requests: { url: string; method: string; body: Buffer | null }[] = [];
  page.context().on("request", (r) => requests.push({ url: r.url(), method: r.method(), body: r.postDataBuffer() }));
  await page.goto("/en/tools/remove-background");
  await page.locator('input[type="file"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Remove background" }).click();
  await expect(page.getByRole("progressbar", { name: "AI model download" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Image with the background removed" })).toBeVisible({ timeout: 200_000 });
  await expect(page.getByRole("status")).toContainText("Background removed");

  const modelRequests = requests.filter((r) => r.url.includes("/models/background-removal/"));
  expect(modelRequests.length).toBeGreaterThan(0);
  expect(modelRequests.every((r) => r.method === "GET")).toBe(true);
  expect(requests.filter((r) => /huggingface.co|hf.co|jsdelivr/.test(r.url))).toEqual([]);
  // No request carries the image: no bodies containing PNG data and nothing larger than a small event payload.
  const signature = png.subarray(0, 8);
  for (const r of requests) {
    if (!r.body) continue;
    expect(r.body.includes(signature), r.url).toBe(false);
    expect(r.body.length, r.url).toBeLessThan(4096);
  }
});
