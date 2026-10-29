import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import ar from "../../messages/ar.json";
import { can, canAssignRole, canEditArticle, canManageUser } from "@/lib/auth/permissions";
import { checkPasswordStrength } from "@/lib/auth/password";
import { sanitizeRichText, addHeadingIds } from "@/lib/sanitize";
import { slugify, isValidSlug } from "@/lib/slug";
import { readingTimeMinutes } from "@/lib/reading-time";
import { isSafeHref, safeInternalPath, isValidCanonical, normalizePath } from "@/lib/urls";
import { pageAdMode, placementAdMode, validateAdsTxt, isValidPublisherId, isValidSlotId, type AdSettingsSnapshot } from "@/lib/ads";
import { consentModeSignals, effectiveConsent, parseConsent, serializeConsent } from "@/lib/consent";
import { buildAlternates, clampDescription, jsonLd } from "@/lib/seo";
import { buildSitemapEntries } from "@/lib/sitemap-builder";
import { sanitizeAuditDetails } from "@/lib/audit-sanitize";
import { buildContactMail, contactSchema } from "@/lib/contact";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("translations", () => {
  it("fr and ar have exactly the same keys as en, with no empty strings", () => {
    const base = keys(en).sort();
    expect(keys(fr).sort()).toEqual(base);
    expect(keys(ar).sort()).toEqual(base);
    for (const dict of [en, fr, ar]) {
      const values = JSON.stringify(dict);
      expect(values).not.toMatch(/"\s*"/);
      // The Lorem Ipsum generator legitimately names its own output.
      expect(JSON.stringify({ ...dict, extra: { ...dict.extra, startWithLorem: "" } })).not.toMatch(/TODO|lorem ipsum/i);
    }
  });
});

describe("permissions", () => {
  it("enforces role capabilities", () => {
    expect(can("AUTHOR", "article.create")).toBe(true);
    expect(can("AUTHOR", "article.publish")).toBe(false);
    expect(can("EDITOR", "article.publish")).toBe(true);
    expect(can("EDITOR", "user.manage")).toBe(false);
    expect(can("ADMIN", "ads.manage")).toBe(true);
    expect(can(null, "dashboard.view")).toBe(false);
  });
  it("prevents privilege escalation", () => {
    expect(canAssignRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "EDITOR")).toBe(true);
    expect(canAssignRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(canManageUser("ADMIN", "SUPER_ADMIN")).toBe(false);
  });
  it("lets authors edit only their own unpublished drafts", () => {
    const author = { id: "u1", role: "AUTHOR" as const };
    expect(canEditArticle(author, { authorId: "u1", status: "DRAFT" })).toBe(true);
    expect(canEditArticle(author, { authorId: "u1", status: "PUBLISHED" })).toBe(false);
    expect(canEditArticle(author, { authorId: "u2", status: "DRAFT" })).toBe(false);
    expect(canEditArticle({ id: "e", role: "EDITOR" }, { authorId: "u2", status: "PUBLISHED" })).toBe(true);
  });
  it("requires strong passwords", () => {
    expect(checkPasswordStrength("short")).toBe("tooShort");
    expect(checkPasswordStrength("alllowercaseletters")).toBe("tooSimple");
    expect(checkPasswordStrength("Correct-Horse-9-Battery")).toBeNull();
  });
});

describe("rich text safety", () => {
  it("removes scripts, handlers and javascript: URLs", () => {
    const dirty = '<h1>T</h1><p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="x" onerror="y"><iframe src="https://e.com"></iframe>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe/);
    expect(clean).toContain("<h2>T</h2>");
  });
  it("hardens external links", () => {
    expect(sanitizeRichText('<a href="https://e.com">e</a>')).toContain('rel="noopener noreferrer nofollow"');
  });
  it("builds a table of contents with unique ids", () => {
    const { html, toc } = addHeadingIds("<h2>Intro</h2><p>x</p><h3>Step &amp; one</h3><h2>Intro</h2>");
    expect(toc.map((t) => t.id)).toEqual(["intro", "step-one", "intro-2"]);
    expect(html).toContain('<h2 id="intro-2">');
  });
});

describe("slugs, reading time and URLs", () => {
  it("creates localized slugs", () => {
    expect(slugify("Compresser une Image — Guide!")).toBe("compresser-une-image-guide");
    expect(slugify("ضغط الصور")).toBe("ضغط-الصور");
    expect(isValidSlug("ok-slug")).toBe(true);
    expect(isValidSlug("Bad Slug")).toBe(false);
  });
  it("estimates reading time", () => {
    expect(readingTimeMinutes("<p>word</p>")).toBe(1);
    expect(readingTimeMinutes(`<p>${"word ".repeat(1100)}</p>`)).toBe(5);
  });
  it("validates hrefs and redirects", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("//evil.com")).toBe(false);
    expect(isSafeHref("/tools")).toBe(true);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(safeInternalPath("https://evil.com")).toBe("/admin");
    expect(safeInternalPath("/admin/articles")).toBe("/admin/articles");
    expect(isValidCanonical("http://x.com")).toBe(false);
    expect(normalizePath("en/blog/old/?x=1")).toBe("/en/blog/old");
  });
});

describe("advertising gate", () => {
  const live: AdSettingsSnapshot = { masterEnabled: true, mode: "LIVE", publisherId: "ca-pub-1234567890123456", ownerConfirmedAuthorized: true, autoAds: false };
  const prodLive = { liveAllowed: true, isProduction: true };
  const page = { kind: "article" as const, hasSubstantialContent: true };

  it("is disabled by default and in every incomplete configuration", () => {
    expect(pageAdMode({ ...live, masterEnabled: false }, page, prodLive)).toBe("none");
    expect(pageAdMode({ ...live, ownerConfirmedAuthorized: false }, page, prodLive)).toBe("none");
    expect(pageAdMode({ ...live, publisherId: "pub-123" }, page, prodLive)).toBe("none");
    expect(pageAdMode(live, page, { liveAllowed: false, isProduction: true })).toBe("none");
    expect(pageAdMode(live, page, { liveAllowed: true, isProduction: false })).toBe("none");
  });
  it("never shows ads on ineligible or thin pages", () => {
    for (const kind of ["legal", "search", "auth", "admin", "error", "preview"] as const) {
      expect(pageAdMode(live, { kind, hasSubstantialContent: true }, prodLive)).toBe("none");
    }
    expect(pageAdMode(live, { kind: "article", hasSubstantialContent: false }, prodLive)).toBe("none");
  });
  it("loads live ads only when everything is satisfied", () => {
    expect(pageAdMode(live, page, prodLive)).toBe("live");
  });
  it("test mode shows placeholders only outside production", () => {
    expect(pageAdMode({ ...live, mode: "TEST" }, page, { liveAllowed: false, isProduction: false })).toBe("placeholder");
    expect(pageAdMode({ ...live, mode: "TEST" }, page, prodLive)).toBe("none");
  });
  it("gates individual placements", () => {
    const p = { key: "article-in-content", enabled: true, slotId: "1234567890" };
    expect(placementAdMode("live", p)).toBe("live");
    expect(placementAdMode("live", { ...p, slotId: null })).toBe("none");
    expect(placementAdMode("live", { ...p, enabled: false })).toBe("none");
    expect(placementAdMode("live", p, ["sidebar"])).toBe("none");
    expect(placementAdMode("none", p)).toBe("none");
  });
  it("validates IDs and ads.txt", () => {
    expect(isValidPublisherId("ca-pub-1234567890123456")).toBe(true);
    expect(isValidPublisherId("ca-pub-123")).toBe(false);
    expect(isValidSlotId("1234567890")).toBe(true);
    expect(isValidSlotId("12ab")).toBe(false);
    expect(validateAdsTxt("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0", "ca-pub-1234567890123456").ok).toBe(true);
    expect(validateAdsTxt("google.com, pub-0000000000000000, DIRECT", "ca-pub-1234567890123456").issues).toContain("publisherMismatch");
    expect(validateAdsTxt("", null).issues).toContain("empty");
  });
});

describe("consent", () => {
  it("serializes, parses and enforces policy version", () => {
    const s = { version: 2, analytics: true, ads: false, decidedAt: 1700000000 };
    expect(parseConsent(serializeConsent(s))).toEqual(s);
    expect(parseConsent("garbage")).toBeNull();
    expect(effectiveConsent(serializeConsent(s), 3)).toBeNull();
    expect(effectiveConsent(serializeConsent(s), 2)).toEqual(s);
  });
  it("defaults every Consent Mode signal to denied", () => {
    expect(consentModeSignals(null)).toEqual({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    expect(consentModeSignals({ version: 1, analytics: true, ads: false, decidedAt: 0 }).analytics_storage).toBe("granted");
  });
});

describe("seo", () => {
  it("builds canonical and hreflang with x-default", () => {
    const a = buildAlternates("fr", { en: "/blog/a", fr: "/blog/b", ar: "/blog/ج" });
    expect(a.canonical).toBe("http://localhost:3000/fr/blog/b");
    expect(a.languages["x-default"]).toBe("http://localhost:3000/en/blog/a");
    expect(a.languages.ar).toBe(`http://localhost:3000/ar/blog/${encodeURIComponent("ج")}`);
  });
  it("omits x-default when only one language exists", () => {
    expect(buildAlternates("en", { en: "/x" }).languages).toEqual({ en: "http://localhost:3000/en/x" });
  });
  it("clamps descriptions and escapes JSON-LD", () => {
    expect(clampDescription("a ".repeat(200)).length).toBeLessThanOrEqual(158);
    expect(jsonLd({ x: "</script>" })).not.toContain("</script>");
  });
  it("sitemap lists only available translations", () => {
    const entries = buildSitemapEntries([{ paths: { en: "/blog/a", fr: "/blog/b" } }, { paths: { ar: "/x" } }]);
    expect(entries.map((e) => e.url)).toEqual([
      "http://localhost:3000/en/blog/a",
      "http://localhost:3000/fr/blog/b",
      "http://localhost:3000/ar/x",
    ]);
    expect(entries[0]!.alternates?.languages).toBeDefined();
    expect(entries[2]!.alternates).toBeUndefined();
  });
});

describe("audit details", () => {
  it("never stores sensitive fields", () => {
    expect(sanitizeAuditDetails({ email: "a@b.c", password: "x", passwordHash: "y", resetToken: "z", count: 2 })).toEqual({ email: "a@b.c", count: 2 });
  });
});

describe("contact form", () => {
  const valid = { name: "Ada", email: "ada@example.com", subject: "", message: "Hello, the resizer is great." };

  it("validates input", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, email: "a@b.com\r\nBcc: x@y.com" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("builds a plain-text mail that cannot inject headers", () => {
    const mail = buildContactMail({ ...valid, name: "Eve\r\nBcc: spam@x.com", subject: "Hi\nthere" }, { siteName: "Atlas", locale: "fr" });
    expect(mail.subject).toBe("[Atlas] Hi there");
    expect(mail.replyTo).toEqual({ name: "Eve Bcc: spam@x.com", address: "ada@example.com" });
    expect(mail.text).toContain("Language: fr");
    expect(mail.text.endsWith(valid.message)).toBe(true);
    expect(buildContactMail(valid, { siteName: "Atlas", locale: "en" }).subject).toBe("[Atlas] Message from Ada");
  });
});
