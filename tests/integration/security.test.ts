import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { validateMediaUpload, MEDIA_MAX_BYTES } from "@/lib/media/storage";
import { resetDb, makeUser } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("rate limiting", () => {
  it("allows up to the limit, then blocks within the window", async () => {
    for (let i = 0; i < 5; i++) expect(await rateLimit("login:test", 5, 900)).toBe(true);
    expect(await rateLimit("login:test", 5, 900)).toBe(false);
    expect(await rateLimit("login:other", 5, 900)).toBe(true);
  });
  it("resets after the window expires", async () => {
    await db.rateLimit.create({ data: { key: "k", count: 99, windowStart: new Date(Date.now() - 1000_000) } });
    expect(await rateLimit("k", 5, 900)).toBe(true);
  });
});

describe("credentials and sessions", () => {
  it("hashes passwords with bcrypt and verifies them", async () => {
    const h = await hashPassword("Correct-Horse-9-Battery");
    expect(h).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("Correct-Horse-9-Battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
  });
  it("stores only hashed session tokens", async () => {
    const u = await makeUser("ADMIN");
    const token = generateToken();
    await db.session.create({ data: { tokenHash: hashToken(token), userId: u.id, expiresAt: new Date(Date.now() + 1000) } });
    const row = await db.session.findFirstOrThrow();
    expect(row.tokenHash).not.toContain(token);
    expect(row.tokenHash).toHaveLength(64);
  });
});

describe("audit log", () => {
  it("never stores sensitive fields", async () => {
    await audit(null, "test.action", "User", "1", { email: "a@b.c", password: "secret", sessionToken: "t" });
    const row = await db.auditLog.findFirstOrThrow();
    expect(row.details).toEqual({ email: "a@b.c" });
  });
});

describe("media upload validation", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3]);
  it("accepts real images and reads dimensions", () => {
    expect(validateMediaUpload(png, "image/png")).toMatchObject({ ok: true, mimeType: "image/png", width: 2, height: 3 });
  });
  it("rejects SVG, mismatched types, empty and oversized files", () => {
    expect(validateMediaUpload(new TextEncoder().encode('<svg onload="x()">'), "image/svg+xml")).toEqual({ ok: false, error: "unsupportedType" });
    expect(validateMediaUpload(png, "image/jpeg")).toEqual({ ok: false, error: "mismatch" });
    expect(validateMediaUpload(new Uint8Array(), "image/png")).toEqual({ ok: false, error: "empty" });
    expect(validateMediaUpload(new Uint8Array(MEDIA_MAX_BYTES + 1), "image/png")).toEqual({ ok: false, error: "tooLarge" });
    expect(validateMediaUpload(new TextEncoder().encode("<?php echo 1;"), "image/png")).toEqual({ ok: false, error: "unsupportedType" });
  });
});
