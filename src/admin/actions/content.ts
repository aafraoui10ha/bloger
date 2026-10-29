"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";
import { isValidSlug, slugify } from "@/lib/slug";
import { normalizePath } from "@/lib/urls";
import { faqSchema } from "@/lib/json-fields";
import { deleteMedia, newStorageKey, putMedia, validateMediaUpload } from "@/lib/media/storage";
import { isToolModuleKey, TOOL_ICONS } from "@/tools/registry";
import { ActionError, bool, optional, revalidatePublic, runAction, str, type ActionState } from "@/admin/server";
import type { AdminKey } from "@/admin/i18n";
import type { Prisma } from "@/generated/prisma/client";

const LOCALES = ["en", "fr", "ar"] as const;

async function redirectPath(tx: Prisma.TransactionClient, from: string, to: string) {
  const f = normalizePath(from);
  const t = normalizePath(to);
  if (f === t) return;
  await tx.redirect.deleteMany({ where: { fromPath: t } });
  await tx.redirect.updateMany({ where: { toPath: f }, data: { toPath: t } });
  await tx.redirect.upsert({ where: { fromPath: f }, update: { toPath: t }, create: { fromPath: f, toPath: t } });
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 30);
}

// ---------------------------------------------------------------------------
// Tools (metadata only)
// ---------------------------------------------------------------------------
export async function registerToolAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await runAction(async () => {
    const user = await authorize("tool.manage");
    const moduleKey = str(fd, "moduleKey");
    // Only version-controlled modules can be registered; nothing executable is accepted.
    if (!isToolModuleKey(moduleKey)) throw new ActionError("c.validation", { moduleKey: "c.validation" });
    if (await db.tool.findUnique({ where: { moduleKey } })) throw new ActionError("c.slugTaken");
    const tool = await db.tool.create({
      data: {
        moduleKey,
        enabled: false,
        translations: { create: LOCALES.map((locale) => ({ locale, slug: moduleKey, title: moduleKey, shortDescription: "", aboutHtml: "", steps: [], examples: [], faq: [], isComplete: false })) },
      },
    });
    id = tool.id;
    await audit(user.id, "tool.registered", "Tool", tool.id, { moduleKey });
  });
  if (res.error) return res;
  redirect(`/admin/tools/${id}`);
}

export async function saveToolAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("tool.manage");
    const id = str(fd, "id");
    const tool = await db.tool.findUnique({ where: { id }, include: { translations: true } });
    if (!tool) throw new ActionError("c.noResults");
    const icon = str(fd, "icon");
    if (!(TOOL_ICONS as readonly string[]).includes(icon)) throw new ActionError("c.validation", { icon: "c.validation" });
    const categoryId = optional(fd, "categoryId");
    if (categoryId && !(await db.category.findFirst({ where: { id: categoryId, kind: "TOOL" } }))) throw new ActionError("c.validation");

    const fieldErrors: Record<string, AdminKey> = {};
    const rows: Prisma.ToolTranslationUncheckedCreateWithoutToolInput[] = [];
    for (const l of LOCALES) {
      const faqRaw = str(fd, `faq_${l}`);
      let faq: z.infer<typeof faqSchema> = [];
      try {
        faq = faqSchema.parse(faqRaw ? JSON.parse(faqRaw) : []);
      } catch {
        fieldErrors[`faq_${l}`] = "c.validation";
      }
      const row = {
        locale: l,
        title: str(fd, `title_${l}`).slice(0, 120),
        slug: str(fd, `slug_${l}`).toLowerCase(),
        shortDescription: str(fd, `short_${l}`).slice(0, 300),
        aboutHtml: sanitizeRichText(String(fd.get(`about_${l}`) ?? "")).slice(0, 100_000),
        steps: lines(str(fd, `steps_${l}`)),
        examples: lines(str(fd, `examples_${l}`)),
        faq,
        seoTitle: optional(fd, `seoTitle_${l}`)?.slice(0, 120) ?? null,
        seoDescription: optional(fd, `seoDescription_${l}`)?.slice(0, 320) ?? null,
        isComplete: bool(fd, `complete_${l}`),
      };
      if (!isValidSlug(row.slug)) fieldErrors[`slug_${l}`] = "c.invalidSlug";
      else if (await db.toolTranslation.findFirst({ where: { locale: l, slug: row.slug, NOT: { toolId: id } } })) fieldErrors[`slug_${l}`] = "c.slugTaken";
      if (row.isComplete && (!row.title || !row.shortDescription)) fieldErrors[`title_${l}`] = "c.validation";
      rows.push(row);
    }
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);

    const related = fd.getAll("related").map(String).filter((x) => x !== id).slice(0, 8);
    const placements = fd.getAll("placements").map(String);

    await db.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id },
        data: { icon, categoryId, order: Number(str(fd, "order")) || 0, featured: bool(fd, "featured"), enabled: bool(fd, "enabled") },
      });
      for (const r of rows) {
        const prev = tool.translations.find((t) => t.locale === r.locale);
        if (prev && prev.slug !== r.slug && prev.isComplete && tool.enabled) await redirectPath(tx, `/${r.locale}/tools/${prev.slug}`, `/${r.locale}/tools/${r.slug}`);
        await tx.toolTranslation.upsert({ where: { toolId_locale: { toolId: id, locale: r.locale } }, update: r, create: { ...r, toolId: id } });
      }
      await tx.toolRelation.deleteMany({ where: { fromId: id } });
      for (const toId of related) await tx.toolRelation.create({ data: { fromId: id, toId } });
      await tx.toolAdPlacement.deleteMany({ where: { toolId: id } });
      const valid = await tx.adPlacement.findMany({ where: { id: { in: placements } }, select: { id: true } });
      for (const p of valid) await tx.toolAdPlacement.create({ data: { toolId: id, placementId: p.id } });
    });
    await audit(user.id, "tool.updated", "Tool", id, { moduleKey: tool.moduleKey, enabled: bool(fd, "enabled") });
    revalidatePublic();
    revalidatePath(`/admin/tools/${id}`);
  });
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
export async function savePageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("page.manage");
    const pageId = str(fd, "pageId");
    const locale = z.enum(LOCALES).parse(str(fd, "locale"));
    const page = await db.page.findUnique({ where: { id: pageId }, include: { translations: { where: { locale } } } });
    if (!page) throw new ActionError("c.noResults");
    const prev = page.translations[0];
    const slug = str(fd, "slug").toLowerCase() || slugify(str(fd, "title"));
    const title = str(fd, "title").slice(0, 150);
    const fieldErrors: Record<string, AdminKey> = {};
    if (!title) fieldErrors.title = "c.validation";
    if (!isValidSlug(slug)) fieldErrors.slug = "c.invalidSlug";
    else if (["tools", "blog", "search", "admin", "api", "media"].includes(slug)) fieldErrors.slug = "c.slugTaken";
    else if (await db.pageTranslation.findFirst({ where: { locale, slug, NOT: { pageId } } })) fieldErrors.slug = "c.slugTaken";
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);

    const data = {
      title,
      slug,
      contentHtml: sanitizeRichText(String(fd.get("contentHtml") ?? "")),
      seoTitle: optional(fd, "seoTitle")?.slice(0, 120) ?? null,
      seoDescription: optional(fd, "seoDescription")?.slice(0, 320) ?? null,
      isPublished: bool(fd, "isPublished"),
      legalReviewed: page.isLegal ? bool(fd, "legalReviewed") : false,
      updatedById: user.id,
    };
    await db.$transaction(async (tx) => {
      // Keep the previous version so legal text edits are always recoverable.
      if (prev) await tx.pageRevision.create({ data: { pageId, locale, title: prev.title, contentHtml: prev.contentHtml, userId: user.id } });
      if (prev && prev.slug !== slug) await redirectPath(tx, `/${locale}/${prev.slug}`, `/${locale}/${slug}`);
      await tx.pageTranslation.upsert({ where: { pageId_locale: { pageId, locale } }, update: data, create: { ...data, pageId, locale } });
    });
    await audit(user.id, "page.updated", "Page", pageId, { key: page.key, locale, published: data.isPublished, legalReviewed: data.legalReviewed });
    revalidatePublic();
    revalidatePath(`/admin/pages/${pageId}`);
  });
}

export async function restorePageRevisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("page.manage");
    const rev = await db.pageRevision.findUnique({ where: { id: str(fd, "revisionId") } });
    if (!rev) throw new ActionError("c.noResults");
    const current = await db.pageTranslation.findUnique({ where: { pageId_locale: { pageId: rev.pageId, locale: rev.locale } } });
    await db.$transaction(async (tx) => {
      if (current) await tx.pageRevision.create({ data: { pageId: rev.pageId, locale: rev.locale, title: current.title, contentHtml: current.contentHtml, userId: user.id } });
      await tx.pageTranslation.update({ where: { pageId_locale: { pageId: rev.pageId, locale: rev.locale } }, data: { title: rev.title, contentHtml: rev.contentHtml, updatedById: user.id } });
    });
    await audit(user.id, "page.revisionRestored", "Page", rev.pageId, { locale: rev.locale });
    revalidatePublic();
    revalidatePath(`/admin/pages/${rev.pageId}`);
  });
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export async function uploadMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("media.upload");
    const file = fd.get("file");
    if (!(file instanceof File)) throw new ActionError("media.error.empty");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateMediaUpload(bytes, file.type);
    if (!check.ok) throw new ActionError(`media.error.${check.error}` as AdminKey);
    const key = newStorageKey(check.ext);
    let stored;
    try {
      stored = await putMedia(bytes, check.mimeType, key);
    } catch {
      throw new ActionError("media.error.storage");
    }
    const safeName = (file.name || `image.${check.ext}`).replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120);
    const asset = await db.mediaAsset.create({
      data: {
        filename: safeName,
        mimeType: check.mimeType,
        sizeBytes: bytes.length,
        width: check.width,
        height: check.height,
        storage: stored.storage,
        storageKey: key,
        data: stored.data,
        alt: str(fd, "alt").slice(0, 300),
        caption: optional(fd, "caption")?.slice(0, 300) ?? null,
        uploadedById: user.id,
      },
    });
    await audit(user.id, "media.uploaded", "MediaAsset", asset.id, { filename: safeName, sizeBytes: bytes.length, mimeType: check.mimeType });
    revalidatePath("/admin/media");
  });
}

export async function updateMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("media.upload");
    const id = str(fd, "id");
    await db.mediaAsset.update({ where: { id }, data: { alt: str(fd, "alt").slice(0, 300), caption: optional(fd, "caption")?.slice(0, 300) ?? null } });
    await audit(user.id, "media.updated", "MediaAsset", id);
    revalidatePath("/admin/media");
    revalidatePublic();
  });
}

/** Lists everything that references a media file (featured images, category images, inline content). */
export async function mediaUsage(id: string) {
  await authorize("media.upload");
  const needle = `/media/${id}`;
  const [articles, categories, articleBodies, pageBodies, toolBodies] = await Promise.all([
    db.article.findMany({ where: { featuredImageId: id }, select: { id: true, translations: { select: { title: true }, take: 1 } } }),
    db.category.findMany({ where: { imageId: id }, select: { id: true, translations: { select: { name: true }, take: 1 } } }),
    db.articleTranslation.findMany({ where: { contentHtml: { contains: needle } }, select: { articleId: true, title: true } }),
    db.pageTranslation.findMany({ where: { contentHtml: { contains: needle } }, select: { pageId: true, title: true } }),
    db.toolTranslation.findMany({ where: { aboutHtml: { contains: needle } }, select: { toolId: true, title: true } }),
  ]);
  return [
    ...articles.map((a) => ({ type: "article", id: a.id, label: a.translations[0]?.title ?? a.id, href: `/admin/articles/${a.id}` })),
    ...articleBodies.map((a) => ({ type: "article", id: a.articleId, label: a.title, href: `/admin/articles/${a.articleId}` })),
    ...categories.map((c) => ({ type: "category", id: c.id, label: c.translations[0]?.name ?? c.id, href: `/admin/categories/${c.id}` })),
    ...pageBodies.map((p) => ({ type: "page", id: p.pageId, label: p.title, href: `/admin/pages/${p.pageId}` })),
    ...toolBodies.map((t) => ({ type: "tool", id: t.toolId, label: t.title, href: `/admin/tools/${t.toolId}` })),
  ];
}

export async function deleteMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("media.delete");
    const id = str(fd, "id");
    const usage = await mediaUsage(id);
    if (usage.length) throw new ActionError("media.inUse");
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new ActionError("c.noResults");
    await deleteMedia(asset.storage, asset.storageKey);
    await db.mediaAsset.delete({ where: { id } });
    await audit(user.id, "media.deleted", "MediaAsset", id, { filename: asset.filename });
    revalidatePath("/admin/media");
  });
}
