"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/session";
import { can, canEditArticle, AuthorizationError } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";
import { readingTimeMinutes } from "@/lib/reading-time";
import { isValidSlug, slugify } from "@/lib/slug";
import { isValidCanonical, normalizePath, safeInternalPath } from "@/lib/urls";
import { faqSchema } from "@/lib/json-fields";
import { ActionError, revalidatePublic, runAction, str, type ActionState } from "@/admin/server";
import { canTransition, checkPublishable, type PublishIssue } from "@/admin/article-rules";
import type { AdminKey } from "@/admin/i18n";
import type { Prisma } from "@/generated/prisma/client";

const LOCALES = ["en", "fr", "ar"] as const;
type Locale = (typeof LOCALES)[number];

const translationSchema = z.object({
  locale: z.enum(LOCALES),
  title: z.string().trim().max(200),
  slug: z.string().trim().max(80),
  excerpt: z.string().trim().max(500),
  contentHtml: z.string().max(400_000),
  faq: faqSchema,
  featuredImageAlt: z.string().trim().max(300).nullable(),
  seoTitle: z.string().trim().max(120).nullable(),
  seoDescription: z.string().trim().max(320).nullable(),
  canonicalUrl: z.string().trim().max(500).nullable(),
  ogTitle: z.string().trim().max(120).nullable(),
  ogDescription: z.string().trim().max(320).nullable(),
  robotsNoindex: z.boolean(),
  robotsNofollow: z.boolean(),
  structuredData: z.enum(["NONE", "ARTICLE", "BLOG_POSTING"]),
  isComplete: z.boolean(),
  tags: z.string().max(500),
});

const payloadSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullable(),
  featuredImageId: z.string().nullable(),
  relatedArticleIds: z.array(z.string()).max(10),
  toolIds: z.array(z.string()).max(10),
  translations: z.array(translationSchema).min(1).max(3),
});

export type ArticlePayload = z.infer<typeof payloadSchema>;
export type ArticleSaveResult = ActionState & { issues?: PublishIssue[]; slugRedirects?: boolean };

async function loadForEdit(id: string, userId: string, role: Parameters<typeof canEditArticle>[0]["role"]) {
  const article = await db.article.findUnique({ where: { id }, include: { translations: true, featuredImage: { select: { alt: true } } } });
  if (!article) throw new ActionError("c.noResults");
  if (!canEditArticle({ id: userId, role }, article)) throw new AuthorizationError();
  return article;
}

function blogPath(locale: string, slug: string) {
  return `/${locale}/blog/${slug}`;
}

/** Creates a permanent redirect and flattens chains that pointed at the old URL. */
async function addRedirect(tx: Prisma.TransactionClient, from: string, to: string) {
  const f = normalizePath(from);
  const tPath = normalizePath(to);
  if (f === tPath) return;
  await tx.redirect.deleteMany({ where: { fromPath: tPath } }); // the new URL must not redirect away
  await tx.redirect.updateMany({ where: { toPath: f }, data: { toPath: tPath } });
  await tx.redirect.upsert({ where: { fromPath: f }, update: { toPath: tPath, permanent: true }, create: { fromPath: f, toPath: tPath, permanent: true } });
}

async function syncTags(tx: Prisma.TransactionClient, articleId: string, locale: Locale, raw: string) {
  const names = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 15);
  const existing = await tx.articleTag.findMany({ where: { articleId, tag: { locale } }, select: { tagId: true } });
  await tx.articleTag.deleteMany({ where: { articleId, tagId: { in: existing.map((e) => e.tagId) } } });
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await tx.tag.upsert({ where: { locale_slug: { locale, slug } }, update: {}, create: { locale, slug, name: name.slice(0, 60) } });
    await tx.articleTag.upsert({ where: { articleId_tagId: { articleId, tagId: tag.id } }, update: {}, create: { articleId, tagId: tag.id } });
  }
}

/** Saves all article fields. `autosave` skips conflicting slug changes instead of failing. */
export async function saveArticle(input: ArticlePayload, opts: { autosave?: boolean } = {}): Promise<ArticleSaveResult> {
  return runAction(async () => {
    const user = await authorize("article.create");
    const parsed = payloadSchema.safeParse(input);
    if (!parsed.success) throw new ActionError("c.validation");
    const p = parsed.data;
    const article = await loadForEdit(p.id, user.id, user.role);
    if (opts.autosave && article.status !== "DRAFT" && article.status !== "IN_REVIEW") return { ok: true };

    const fieldErrors: Record<string, AdminKey> = {};
    for (const t of p.translations) {
      if (!isValidSlug(t.slug)) fieldErrors[`${t.locale}.slug`] = "c.invalidSlug";
      if (t.canonicalUrl && !isValidCanonical(t.canonicalUrl)) fieldErrors[`${t.locale}.canonicalUrl`] = "art.issue.canonical";
      const clash = await db.articleTranslation.findFirst({ where: { locale: t.locale, slug: t.slug, articleId: { not: p.id } }, select: { id: true } });
      if (clash) fieldErrors[`${t.locale}.slug`] = "c.slugTaken";
    }
    if (Object.keys(fieldErrors).length && !opts.autosave) throw new ActionError("c.validation", fieldErrors);

    const wasPublic = article.status === "PUBLISHED" || article.status === "SCHEDULED";
    let slugRedirects = false;
    const now = new Date();

    await db.$transaction(async (tx) => {
      // Published articles may only be modified by staff; authors are blocked in loadForEdit.
      if (p.categoryId) {
        const cat = await tx.category.findFirst({ where: { id: p.categoryId, kind: "ARTICLE" } });
        if (!cat) throw new ActionError("c.validation");
      }
      await tx.article.update({
        where: { id: p.id },
        data: {
          categoryId: p.categoryId,
          featuredImageId: p.featuredImageId,
          ...(article.status === "PUBLISHED" && !opts.autosave ? { contentUpdatedAt: now } : {}),
        },
      });
      await tx.articleRelation.deleteMany({ where: { fromId: p.id } });
      for (const toId of p.relatedArticleIds.filter((x) => x !== p.id)) await tx.articleRelation.create({ data: { fromId: p.id, toId } }).catch(() => {});
      await tx.articleTool.deleteMany({ where: { articleId: p.id } });
      for (const toolId of p.toolIds) await tx.articleTool.create({ data: { articleId: p.id, toolId } }).catch(() => {});

      for (const t of p.translations) {
        const prev = article.translations.find((x) => x.locale === t.locale);
        const slugBad = !!fieldErrors[`${t.locale}.slug`];
        const slug = slugBad ? (prev?.slug ?? `${slugify(t.title) || "article"}-${p.id.slice(-6)}`) : t.slug;
        const contentHtml = sanitizeRichText(t.contentHtml);
        const data = {
          title: t.title || "Untitled",
          slug,
          excerpt: t.excerpt,
          contentHtml,
          faq: t.faq,
          readingTimeMinutes: readingTimeMinutes(contentHtml),
          featuredImageAlt: t.featuredImageAlt,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
          canonicalUrl: fieldErrors[`${t.locale}.canonicalUrl`] ? prev?.canonicalUrl ?? null : t.canonicalUrl,
          ogTitle: t.ogTitle,
          ogDescription: t.ogDescription,
          robotsNoindex: t.robotsNoindex,
          robotsNofollow: t.robotsNofollow,
          structuredData: t.structuredData,
          isComplete: t.isComplete,
        };
        await tx.articleTranslation.upsert({ where: { articleId_locale: { articleId: p.id, locale: t.locale } }, update: data, create: { ...data, articleId: p.id, locale: t.locale } });
        await syncTags(tx, p.id, t.locale, t.tags);

        const changed = !prev || prev.title !== data.title || prev.contentHtml !== contentHtml || prev.excerpt !== data.excerpt || JSON.stringify(prev.faq) !== JSON.stringify(t.faq);
        if (changed) {
          await tx.articleRevision.create({
            data: { articleId: p.id, locale: t.locale, kind: opts.autosave ? "AUTOSAVE" : article.status === "PUBLISHED" ? "PUBLISH" : "MANUAL", title: data.title, excerpt: data.excerpt, contentHtml, faq: t.faq, userId: user.id },
          });
        }
        if (wasPublic && prev && prev.slug !== slug && prev.isComplete) {
          await addRedirect(tx, blogPath(t.locale, prev.slug), blogPath(t.locale, slug));
          slugRedirects = true;
        }
      }
      if (opts.autosave) {
        // Keep only the 20 most recent autosaves per article.
        const old = await tx.articleRevision.findMany({ where: { articleId: p.id, kind: "AUTOSAVE" }, orderBy: { createdAt: "desc" }, skip: 20, select: { id: true } });
        if (old.length) await tx.articleRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
      }
    });

    if (!opts.autosave) await audit(user.id, "article.saved", "Article", p.id, { locales: p.translations.map((t) => t.locale), status: article.status });
    if (wasPublic) revalidatePublic();
    const result: ArticleSaveResult = { ok: true, message: slugRedirects ? "art.slugRedirectNotice" : "c.saved", slugRedirects };
    if (Object.keys(fieldErrors).length) result.fieldErrors = fieldErrors;
    return result;
  });
}

export async function createArticleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async () => {
    const user = await authorize("article.create");
    const locale = z.enum(LOCALES).catch("en").parse(str(fd, "locale"));
    const title = str(fd, "title").slice(0, 200);
    if (!title) throw new ActionError("c.validation", { title: "art.issue.title" });
    let slug = slugify(title) || "article";
    if (await db.articleTranslation.findUnique({ where: { locale_slug: { locale, slug } } })) slug = `${slug}-${Date.now().toString(36)}`;
    const article = await db.article.create({
      data: { authorId: user.id, translations: { create: { locale, title, slug, contentHtml: "", faq: [] } } },
    });
    id = article.id;
    await audit(user.id, "article.created", "Article", article.id, { locale });
  });
  if (res.error) return res;
  redirect(`/admin/articles/${id}`);
}

export type StatusChange = "submitReview" | "publish" | "schedule" | "unpublish" | "archive" | "restoreDraft";

export async function changeArticleStatus(id: string, change: StatusChange, publishAtIso?: string): Promise<ArticleSaveResult> {
  return runAction(async () => {
    const user = await authorize("article.create");
    const article = await db.article.findUnique({ where: { id }, include: { translations: true, featuredImage: { select: { alt: true } } } });
    if (!article) throw new ActionError("c.noResults");
    const target = { submitReview: "IN_REVIEW", publish: "PUBLISHED", schedule: "SCHEDULED", unpublish: "DRAFT", archive: "ARCHIVED", restoreDraft: "DRAFT" }[change];

    if (change === "submitReview") {
      if (!canEditArticle(user, article)) throw new AuthorizationError();
    } else if (!can(user.role, "article.publish")) {
      throw new AuthorizationError();
    }
    if (!canTransition(article.status, target)) throw new ActionError("c.validation");

    const now = new Date();
    if (change === "publish" || change === "schedule") {
      const issues = checkPublishable(article.translations, article.featuredImage);
      if (issues.length) return { error: "art.notPublishable", issues };
    }

    if (change === "publish") {
      await db.$transaction([
        db.article.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? now, contentUpdatedAt: now, publishAt: null, archivedAt: null } }),
        ...article.translations
          .filter((t) => t.isComplete)
          .map((t) => db.articleRevision.create({ data: { articleId: id, locale: t.locale, kind: "PUBLISH", title: t.title, excerpt: t.excerpt, contentHtml: t.contentHtml, faq: t.faq ?? [], userId: user.id } })),
      ]);
    } else if (change === "schedule") {
      const at = publishAtIso ? new Date(publishAtIso) : null;
      if (!at || Number.isNaN(at.getTime()) || at.getTime() < now.getTime() + 60_000) throw new ActionError("c.validation", { publishAt: "c.validation" });
      await db.article.update({ where: { id }, data: { status: "SCHEDULED", publishAt: at } });
    } else if (change === "archive") {
      await db.article.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: now } });
    } else {
      await db.article.update({ where: { id }, data: { status: target as "DRAFT" | "IN_REVIEW", ...(change === "unpublish" ? { publishAt: null } : {}), archivedAt: null } });
    }
    await audit(user.id, `article.${change}`, "Article", id, { from: article.status, to: target, ...(publishAtIso ? { publishAt: publishAtIso } : {}) });
    revalidatePublic();
    revalidatePath(`/admin/articles/${id}`);
    return { ok: true, message: "c.saved" };
  });
}

export async function deleteArticleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async () => {
    const user = await authorize("article.delete");
    const id = str(fd, "id");
    const redirectTo = str(fd, "redirectTo");
    const article = await db.article.findUnique({ where: { id }, include: { translations: true } });
    if (!article) throw new ActionError("c.noResults");
    if (redirectTo && safeInternalPath(redirectTo, "") === "") throw new ActionError("c.invalidUrl", { redirectTo: "c.invalidUrl" });
    await db.$transaction(async (tx) => {
      if (redirectTo && article.publishedAt) {
        for (const t of article.translations) await addRedirect(tx, blogPath(t.locale, t.slug), redirectTo);
      }
      await tx.article.delete({ where: { id } });
    });
    await audit(user.id, "article.deleted", "Article", id, { titles: article.translations.map((t) => t.title), redirectTo: redirectTo || null });
    revalidatePublic();
  });
  if (res.error) return res;
  redirect("/admin/articles");
}

export async function bulkArticlesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("article.create");
    const op = str(fd, "op");
    const ids = fd.getAll("ids").map(String).slice(0, 100);
    let done = 0;
    let skipped = 0;
    for (const id of ids) {
      if (op === "delete") {
        if (!can(user.role, "article.delete")) {
          skipped++;
          continue;
        }
        await db.article.delete({ where: { id } }).then(() => done++, () => skipped++);
        await audit(user.id, "article.deleted", "Article", id, { bulk: true });
      } else if (op === "publish" || op === "archive") {
        const r = await changeArticleStatus(id, op);
        if (r.ok) done++;
        else skipped++;
      }
    }
    revalidatePublic();
    revalidatePath("/admin/articles");
    return { ok: true, message: skipped ? "art.bulkSkipped" : "art.bulkDone", data: { count: String(skipped || done) } };
  });
}

export async function restoreRevisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("article.create");
    const rev = await db.articleRevision.findUnique({ where: { id: str(fd, "revisionId") } });
    if (!rev) throw new ActionError("c.noResults");
    const article = await loadForEdit(rev.articleId, user.id, user.role);
    const current = article.translations.find((t) => t.locale === rev.locale);
    await db.$transaction(async (tx) => {
      if (current) {
        await tx.articleRevision.create({ data: { articleId: article.id, locale: rev.locale, kind: "MANUAL", title: current.title, excerpt: current.excerpt, contentHtml: current.contentHtml, faq: current.faq ?? [], userId: user.id } });
      }
      await tx.articleTranslation.update({
        where: { articleId_locale: { articleId: article.id, locale: rev.locale } },
        data: { title: rev.title, excerpt: rev.excerpt, contentHtml: rev.contentHtml, faq: rev.faq ?? [], readingTimeMinutes: readingTimeMinutes(rev.contentHtml) },
      });
      await tx.articleRevision.create({ data: { articleId: article.id, locale: rev.locale, kind: "RESTORE", title: rev.title, excerpt: rev.excerpt, contentHtml: rev.contentHtml, faq: rev.faq ?? [], userId: user.id } });
      if (article.status === "PUBLISHED") await tx.article.update({ where: { id: article.id }, data: { contentUpdatedAt: new Date() } });
    });
    await audit(user.id, "article.revisionRestored", "Article", article.id, { locale: rev.locale, revisionId: rev.id });
    if (article.status === "PUBLISHED") revalidatePublic();
    revalidatePath(`/admin/articles/${article.id}`);
  });
}
