import { deflateSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";

/** Local-only test accounts (created by global-setup against the local DB). */
export const E2E_USERS = {
  admin: { email: "e2e-admin@localhost.test", name: "E2E Admin", role: "ADMIN" as const, password: "E2e-Admin-Pass-2026!" },
  editor: { email: "e2e-editor@localhost.test", name: "E2E Editor", role: "EDITOR" as const, password: "E2e-Editor-Pass-2026!" },
  author: { email: "e2e-author@localhost.test", name: "E2E Author", role: "AUTHOR" as const, password: "E2e-Author-Pass-2026!" },
};

export async function login(page: Page, who: keyof typeof E2E_USERS) {
  const u = E2E_USERS[who];
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Builds a real RGBA PNG of the given size (a gradient, so it compresses meaningfully). */
export function makePng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      raw[i] = (x * 255) / width;
      raw[i + 1] = (y * 255) / height;
      raw[i + 2] = ((x ^ y) * 7) & 255;
      raw[i + 3] = 255;
    }
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
