import fs from "node:fs";
import { inflateSync } from "node:zlib";
import { expect, test, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { makePng } from "./fixtures";

const AR_DESIGNER = `/ar/tools/${encodeURIComponent("مصمم-الرسوم-البيانية")}`;

async function dismissBanner(page: Page) {
  const reject = page.getByRole("button", { name: /Reject optional|Refuser|رفض/ }).first();
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

async function openDesigner(page: Page, path = "/en/tools/chart-designer") {
  await page.goto(path);
  await dismissBanner(page);
  const editor = page.getByTestId("chart-designer");
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("design-canvas").locator("[data-el]").first()).toBeVisible();
  return editor;
}

const canvas = (page: Page) => page.getByTestId("design-canvas");

async function readDownload(download: Download): Promise<Buffer> {
  return fs.readFileSync((await download.path())!);
}

/** Width, height, colour type and the first pixel's bytes of a PNG. */
function pngInfo(buf: Buffer) {
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20), colorType = buf[25]!;
  const idat: Buffer[] = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8);
    if (type === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  // The first pixel of the first row is stored unchanged by every PNG filter.
  const firstPixel = [...raw.subarray(1, 1 + (colorType === 6 ? 4 : 3))];
  return { width, height, colorType, firstPixel };
}

async function exportAs(page: Page, format: "PNG" | "JPG" | "SVG" | "PDF") {
  const dialog = page.getByRole("dialog", { name: /Export your design|Exporter le design|تصدير التصميم/ });
  await dialog.getByRole("radio", { name: format, exact: true }).click();
  await expect(dialog.getByTestId("export-preview")).toBeVisible({ timeout: 60_000 });
  const button = dialog.getByRole("button", { name: new RegExp(format) });
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return download;
}

test.describe("chart designer", () => {
  test("applies a template, edits chart data, switches type, and undoes/redoes", async ({ page }) => {
    await openDesigner(page);
    await page.getByRole("button", { name: "Use the Minimal editorial template" }).click();
    await expect(canvas(page)).toContainText("Sales grew steadily all year");

    await canvas(page).locator('[data-el^="chart-"]').first().click();
    await expect(page.getByLabel("Chart type")).toBeVisible();
    const cell = page.getByLabel("Revenue value for Jan");
    await expect(cell).toHaveValue("42");
    await cell.fill("99");
    await expect(canvas(page)).toContainText("99");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(canvas(page)).not.toContainText("99");
    await expect(canvas(page)).toContainText("42");
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(canvas(page)).toContainText("99");

    await page.getByLabel("Chart type").selectOption("line");
    await expect(canvas(page).locator('[data-el^="chart-"] circle')).toHaveCount(6);
    await page.locator("summary", { hasText: "Number format" }).click();
    await page.getByLabel("Format", { exact: true }).selectOption("currency");
    await expect(canvas(page)).toContainText("$99");
  });

  test("moves elements by dragging and with the keyboard, deletes and restores them", async ({ page }) => {
    await openDesigner(page);
    const title = canvas(page).locator('[data-el^="text-"]').first();
    const before = await title.getAttribute("transform");
    const box = (await title.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("selection")).toBeVisible();
    const moved = await title.getAttribute("transform");
    expect(moved).not.toBe(before);

    await page.keyboard.press("Control+z");
    await expect(title).toHaveAttribute("transform", before!);

    await title.click();
    const x0 = Number(await page.getByLabel("X", { exact: true }).inputValue());
    await page.keyboard.press("ArrowRight");
    await expect(page.getByLabel("X", { exact: true })).toHaveValue(String(Math.round((x0 + 1) * 100) / 100));

    const count = await canvas(page).locator("[data-el]").count();
    await page.keyboard.press("Delete");
    await expect(canvas(page).locator("[data-el]")).toHaveCount(count - 1);
    await page.keyboard.press("Control+z");
    await expect(canvas(page).locator("[data-el]")).toHaveCount(count);
  });

  test("adds charts, shapes, icons and uploaded logos", async ({ page }) => {
    await openDesigner(page);
    const n = await canvas(page).locator("[data-el]").count();
    await page.getByRole("button", { name: "Charts", exact: true }).click();
    await page.getByRole("button", { name: "Radar", exact: true }).click();
    await page.getByRole("button", { name: "Elements", exact: true }).click();
    await page.getByRole("button", { name: "Add Star" }).click();
    await page.getByRole("button", { name: "rocket", exact: true }).click();
    await page.getByRole("button", { name: "Uploads", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: makePng(120, 60) });
    await expect(canvas(page).locator("image")).toHaveCount(1);
    expect(await canvas(page).locator("image").getAttribute("href")).toMatch(/^data:image\/png;base64,/);
    await expect(canvas(page).locator("[data-el]")).toHaveCount(n + 4);
    await expect(page.getByRole("button", { name: "Add logo.png to the design" })).toBeVisible();
  });

  test("lays out Arabic text right to left and applies Arabic fonts", async ({ page }) => {
    await openDesigner(page, AR_DESIGNER);
    await expect(canvas(page)).toContainText("لوحة الأداء");
    await page.getByRole("button", { name: "النص", exact: true }).click();
    await page.getByRole("button", { name: "أضف عنوانًا", exact: true }).click();
    const content = page.getByLabel("محتوى النص");
    await content.fill("الإيرادات السنوية 2025");
    const text = canvas(page).locator("text", { hasText: "الإيرادات السنوية 2025" });
    await expect(text).toHaveAttribute("direction", "rtl");
    await page.locator("#font-select").selectOption("amiri");
    await expect(text).toHaveAttribute("font-family", /Amiri/);
    // Charts in Arabic designs are mirrored.
    await expect(canvas(page).locator('[data-el^="chart-"] text[direction="rtl"]').first()).toBeVisible();
  });

  test("exports PNG, JPG, SVG and PDF with the right content", async ({ page }) => {
    test.setTimeout(180_000);
    await openDesigner(page);
    await page.getByRole("button", { name: "Export" }).first().click();

    const png = pngInfo(await readDownload(await exportAs(page, "PNG")));
    expect([png.width, png.height]).toEqual([2160, 2160]);

    const dialog = page.getByRole("dialog", { name: "Export your design" });
    await dialog.getByRole("switch", { name: "Transparent background" }).check();
    const transparent = pngInfo(await readDownload(await exportAs(page, "PNG")));
    expect(transparent.colorType).toBe(6);
    expect(transparent.firstPixel[3]).toBe(0);

    const jpg = await readDownload(await exportAs(page, "JPG"));
    expect(jpg.subarray(0, 3).toString("hex")).toBe("ffd8ff");

    const svgDownload = await exportAs(page, "SVG");
    expect(svgDownload.suggestedFilename()).toBe("kpi-dashboard.svg");
    const svg = (await readDownload(svgDownload)).toString("utf8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Performance dashboard");
    expect(svg).toMatch(/@font-face\{font-family:'Poppins'/);
    expect(svg).toContain("data:font/woff2;base64,");
    expect(svg).not.toContain("data-el=");

    await dialog.getByRole("radio", { name: "PDF", exact: true }).click();
    await dialog.getByLabel("Page size").selectOption("a4");
    const pdfBytes = await readDownload(await exportAs(page, "PDF"));
    expect(pdfBytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBe(1);
    const size = pdf.getPage(0).getSize();
    expect([Math.round(size.width * 100) / 100, Math.round(size.height * 100) / 100]).toEqual([595.28, 841.89]);
  });

  test("exports Arabic designs with embedded Arabic fonts", async ({ page }) => {
    test.setTimeout(120_000);
    await openDesigner(page, AR_DESIGNER);
    await page.getByRole("button", { name: "تصدير" }).first().click();
    const svg = (await readDownload(await exportAs(page, "SVG"))).toString("utf8");
    expect(svg).toContain('direction="rtl"');
    expect(svg).toContain("لوحة الأداء");
    expect(svg).toMatch(/@font-face\{font-family:'(Cairo|Tajawal)'[^}]*unicode-range:U\+0600/);
    const png = pngInfo(await readDownload(await exportAs(page, "PNG")));
    expect(png.width).toBe(2160);
  });

  test("saves designs locally and restores them after a reload", async ({ page }) => {
    await openDesigner(page);
    await page.getByLabel("Design name").fill("Quarterly report");
    await expect(page.getByText("Saved on this device")).toBeVisible();
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByLabel("Design name")).toHaveValue("Quarterly report", { timeout: 30_000 });
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(page.getByText("Quarterly report", { exact: true }).last()).toBeVisible();
  });

  test("never uploads designs, data or images", async ({ page }) => {
    test.setTimeout(120_000);
    const requests: { url: string; method: string; body: number }[] = [];
    page.on("request", (r) => requests.push({ url: r.url(), method: r.method(), body: r.postDataBuffer()?.length ?? 0 }));
    await openDesigner(page);
    await page.getByRole("button", { name: "Uploads", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: makePng(300, 200) });
    await expect(canvas(page).locator("image")).toHaveCount(1);
    await page.getByRole("button", { name: "Export" }).first().click();
    await exportAs(page, "PNG");
    const origin = new URL(page.url()).origin;
    expect(requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith("data:") && !r.url.startsWith("blob:"))).toEqual([]);
    expect(requests.filter((r) => r.body > 4096)).toEqual([]);
  });

  test("uses an adapted editing interface on phones", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    await openDesigner(page);
    await expect(page.getByRole("navigation", { name: "Design panels" }).last()).toBeVisible();
    await page.getByRole("button", { name: "Charts", exact: true }).last().click();
    const sheet = page.getByRole("dialog", { name: "Charts" });
    await expect(sheet).toBeVisible();
    const n = await canvas(page).locator("[data-el]").count();
    await sheet.getByRole("button", { name: "Doughnut", exact: true }).click();
    await expect(canvas(page).locator("[data-el]")).toHaveCount(n + 1);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Properties" }).getByLabel("Chart type")).toHaveValue("doughnut");
    await context.close();
  });
});

test.describe("colour tools", () => {
  test("palette library: applies palettes, checks contrast and keeps favourites", async ({ page }) => {
    await page.goto("/en/tools/color-palettes");
    await dismissBanner(page);
    await expect(page.getByText("Palette library (110)")).toBeVisible();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    const first = page.locator("li").filter({ has: page.getByText("Dark 1", { exact: true }) });
    await first.getByRole("button", { name: "Use" }).click();
    await expect(page.getByRole("button", { name: "Copy #0D1117" }).first()).toBeVisible();
    await expect(page.getByText(/Contrast ratio \d+\.\d\d:1/)).toBeVisible();
    await first.getByRole("button", { name: "Add to favourites" }).click();
    await page.reload();
    await dismissBanner(page);
    await page.getByRole("button", { name: "Favourites (1)" }).click();
    await expect(page.locator("li").filter({ has: page.getByText("Dark 1", { exact: true }) })).toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByLabel("Search by HEX code or style").fill("#zzzzzz");
    await expect(page.getByText("No palette matches these filters.")).toBeVisible();
  });

  test("pattern generator: previews and exports SVG, PNG and CSS", async ({ page }) => {
    await page.goto("/en/tools/pattern-generator");
    await dismissBanner(page);
    await page.getByRole("button", { name: "Hexagons" }).click();
    await expect(page.getByTestId("pattern-preview").locator("pattern")).toHaveCount(1);
    const [svgD] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "SVG", exact: true }).click()]);
    const svg = (await readDownload(svgD)).toString("utf8");
    expect(svg).toContain('width="1200" height="800"');
    expect(svg).toContain("<pattern");
    const [pngD] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PNG", exact: true }).click()]);
    const png = pngInfo(await readDownload(pngD));
    expect([png.width, png.height]).toEqual([1200, 800]);
    const [cssD] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSS", exact: true }).click()]);
    expect((await readDownload(cssD)).toString("utf8")).toContain("background-image: url(\"data:image/svg+xml,");
  });
});
