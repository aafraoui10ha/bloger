import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getPublishedArticle, listPublishedArticles, findRedirect } from "@/lib/content";
import { publishDueArticles } from "@/lib/publishing";
import { getSitemapEntries } from "@/lib/sitemap-data";
import { computeSeoIssues } from "@/admin/seo-health";
import { checkPublishable } from "@/admin/article-rules";
import { makeArticle, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("publication workflow visibility", () => {
  it("never exposes drafts, in-review, archived or incomplete translations", async () => {
    const u = await makeUser();
    await makeArticle({ authorId: u.id, status: "DRAFT", translations: [{ locale: "en", slug: "draft" }] });
    await makeArticle({ authorId: u.id, status: "IN_REVIEW", translations: [{ locale: "en", slug: "review" }] });
    await makeArticle({ authorId: u.id, status: "ARCHIVED", translations: [{ locale: "en", slug: "archived" }] });
    await makeArticle({ authorId: u.id, status: "PUBLISHED", translations: [{ locale: "en", slug: "live" }, { locale: "fr", slug: "incomplet", isComplete: false }] });

    expect(await getPublishedArticle("en", "draft")).toBeNull();
    expect(await getPublishedArticle("en", "review")).toBeNull();
    expect(await getPublishedArticle("en", "archived")).toBeNull();
    expect(await getPublishedArticle("en", "live")).not.toBeNull();
    expect(await getPublishedArticle("fr", "incomplet")).toBeNull();
    const list = await listPublishedArticles("en");
    expect(list.items.map((i) => i.slug)).toEqual(["live"]);
  });

  it("shows scheduled articles only once their time has passed, and the scheduler finalizes them", async () => {
    const u = await makeUser();
    await makeArticle({ authorId: u.id, status: "SCHEDULED", publishAt: new Date(Date.now() + 3600_000), translations: [{ locale: "en", slug: "future" }] });
    const past = await makeArticle({ authorId: u.id, status: "SCHEDULED", publishAt: new Date(Date.now() - 60_000), translations: [{ locale: "en", slug: "past" }] });

    expect(await getPublishedArticle("en", "future")).toBeNull();
    expect(await getPublishedArticle("en", "past")).not.toBeNull();

    expect(await publishDueArticles()).toBe(1);
    const after = await db.article.findUniqueOrThrow({ where: { id: past.id } });
    expect(after.status).toBe("PUBLISHED");
    expect(after.publishedAt?.getTime()).toBe(past.publishAt!.getTime());
    expect(await db.auditLog.count({ where: { action: "article.autoPublished" } })).toBe(1);
    expect((await db.siteSettings.findUnique({ where: { id: "default" } }))?.lastSchedulerRunAt).toBeTruthy();
  });
});

describe("sitemap", () => {
  it("contains only canonical, public, indexable, complete URLs with hreflang", async () => {
    const u = await makeUser();
    await makeArticle({ authorId: u.id, status: "PUBLISHED", translations: [{ locale: "en", slug: "public-en" }, { locale: "fr", slug: "public-fr" }] });
    await makeArticle({ authorId: u.id, status: "DRAFT", translations: [{ locale: "en", slug: "secret-draft" }] });
    await makeArticle({ authorId: u.id, status: "PUBLISHED", translations: [{ locale: "en", slug: "hidden", robotsNoindex: true }] });
    await makeArticle({ authorId: u.id, status: "PUBLISHED", translations: [{ locale: "en", slug: "syndicated", canonicalUrl: "https://elsewhere.test/a" }] });
    await db.tool.create({ data: { moduleKey: "word-counter", enabled: false, translations: { create: { locale: "en", slug: "disabled-tool", title: "x", shortDescription: "x", aboutHtml: "", steps: [], examples: [], faq: [], isComplete: true } } } });

    const urls = (await getSitemapEntries()).map((e) => e.url);
    expect(urls).toContain("https://example.test/en/blog/public-en");
    expect(urls).toContain("https://example.test/fr/blog/public-fr");
    expect(urls).toContain("https://example.test/en/blog");
    expect(urls.some((u) => u.includes("secret-draft"))).toBe(false);
    expect(urls.some((u) => u.includes("hidden"))).toBe(false);
    expect(urls.some((u) => u.includes("syndicated"))).toBe(false);
    expect(urls.some((u) => u.includes("disabled-tool"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin") || u.includes("/search"))).toBe(false);
    const entry = (await getSitemapEntries()).find((e) => e.url.endsWith("/en/blog/public-en"));
    expect(entry?.alternates?.languages).toMatchObject({ fr: "https://example.test/fr/blog/public-fr" });
  });
});

describe("redirects and SEO health", () => {
  it("resolves stored redirects and counts hits", async () => {
    await db.redirect.create({ data: { fromPath: "/en/blog/old", toPath: "/en/blog/new" } });
    expect((await findRedirect("/en/blog/old"))?.toPath).toBe("/en/blog/new");
    expect((await db.redirect.findUniqueOrThrow({ where: { fromPath: "/en/blog/old" } })).hits).toBe(1);
    expect(await findRedirect("/en/blog/none")).toBeNull();
  });

  it("detects broken internal links and images without alt text", async () => {
    const u = await makeUser();
    await makeArticle({ authorId: u.id, status: "PUBLISHED", translations: [{ locale: "en", slug: "target" }] });
    await makeArticle({
      authorId: u.id,
      status: "PUBLISHED",
      translations: [{ locale: "en", slug: "linker", contentHtml: `<p><a href="/en/blog/target">ok</a> <a href="/en/blog/missing">bad</a> <img src="/media/x"></p>` }],
    });
    const issues = await computeSeoIssues();
    const broken = issues.filter((i) => i.key === "seo.i.brokenLink");
    expect(broken.map((i) => i.vars?.href)).toEqual(["/en/blog/missing"]);
    expect(issues.some((i) => i.key === "seo.i.imageNoAlt")).toBe(true);
  });
});

describe("publishing rules", () => {
  it("blocks incomplete content", () => {
    const base = { locale: "en", isComplete: true, title: "T", slug: "ok", excerpt: "x".repeat(60), contentHtml: `<p>${"w ".repeat(200)}</p>` };
    expect(checkPublishable([base], null)).toEqual([]);
    expect(checkPublishable([{ ...base, isComplete: false }], null)).toEqual([{ code: "needComplete" }]);
    expect(checkPublishable([{ ...base, excerpt: "short" }], null).map((i) => i.code)).toContain("excerpt");
    expect(checkPublishable([{ ...base, contentHtml: "<p>too short</p>" }], null).map((i) => i.code)).toContain("content");
    expect(checkPublishable([base], { alt: "" }).map((i) => i.code)).toContain("alt");
    expect(checkPublishable([{ ...base, slug: "Bad Slug" }], null).map((i) => i.code)).toContain("slug");
  });
});
