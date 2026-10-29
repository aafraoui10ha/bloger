"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { isValidSlug, slugify } from "@/lib/slug";
import { isSafeHref, normalizePath } from "@/lib/urls";
import { isValidPublisherId, isValidSlotId } from "@/lib/ads";
import { publishDueArticles } from "@/lib/publishing";
import { TOOL_ICONS } from "@/tools/registry";
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

const catBase = (kind: "ARTICLE" | "TOOL") => (kind === "TOOL" ? "tools/category" : "blog/category");

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("category.manage");
    const id = optional(fd, "id");
    const kind = z.enum(["ARTICLE", "TOOL"]).parse(str(fd, "kind"));
    const icon = optional(fd, "icon");
    if (icon && !(TOOL_ICONS as readonly string[]).includes(icon)) throw new ActionError("c.validation");
    const order = Number(str(fd, "order")) || 0;
    const imageId = optional(fd, "imageId");

    const fieldErrors: Record<string, AdminKey> = {};
    const rows = LOCALES.map((l) => ({
      locale: l,
      name: str(fd, `name_${l}`).slice(0, 80),
      slug: str(fd, `slug_${l}`).toLowerCase() || slugify(str(fd, `name_${l}`)),
      description: optional(fd, `description_${l}`)?.slice(0, 500) ?? null,
      seoTitle: optional(fd, `seoTitle_${l}`)?.slice(0, 120) ?? null,
      seoDescription: optional(fd, `seoDescription_${l}`)?.slice(0, 320) ?? null,
    })).filter((r) => r.name);
    if (!rows.length) fieldErrors.name_en = "c.validation";
    for (const r of rows) {
      if (!isValidSlug(r.slug)) fieldErrors[`slug_${r.locale}`] = "c.invalidSlug";
      const clash = await db.categoryTranslation.findFirst({ where: { kind, locale: r.locale, slug: r.slug, ...(id ? { categoryId: { not: id } } : {}) } });
      if (clash) fieldErrors[`slug_${r.locale}`] = "c.slugTaken";
    }
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);

    await db.$transaction(async (tx) => {
      const cat = id
        ? await tx.category.update({ where: { id }, data: { icon, order, imageId }, include: { translations: true } })
        : await tx.category.create({ data: { kind, icon, order, imageId }, include: { translations: true } });
      for (const r of rows) {
        const prev = cat.translations.find((x) => x.locale === r.locale);
        if (prev && prev.slug !== r.slug) await redirectPath(tx, `/${r.locale}/${catBase(kind)}/${prev.slug}`, `/${r.locale}/${catBase(kind)}/${r.slug}`);
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: cat.id, locale: r.locale } },
          update: { ...r },
          create: { ...r, categoryId: cat.id, kind },
        });
      }
      const keep = rows.map((r) => r.locale);
      await tx.categoryTranslation.deleteMany({ where: { categoryId: cat.id, locale: { notIn: keep } } });
      await audit(user.id, id ? "category.updated" : "category.created", "Category", cat.id, { kind, locales: keep });
    });
    revalidatePublic();
    revalidatePath("/admin/categories");
  });
}

export async function deleteCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("category.manage");
    const id = str(fd, "id");
    const mergeInto = optional(fd, "mergeInto");
    const cat = await db.category.findUnique({ where: { id }, include: { translations: true, _count: { select: { articles: true, tools: true } } } });
    if (!cat) throw new ActionError("c.noResults");
    const hasItems = cat._count.articles + cat._count.tools > 0;
    const target = mergeInto ? await db.category.findFirst({ where: { id: mergeInto, kind: cat.kind, NOT: { id } }, include: { translations: true } }) : null;
    if (hasItems && !target) throw new ActionError("cat.inUse", { mergeInto: "cat.inUse" });

    await db.$transaction(async (tx) => {
      if (target) {
        await tx.article.updateMany({ where: { categoryId: id }, data: { categoryId: target.id } });
        await tx.tool.updateMany({ where: { categoryId: id }, data: { categoryId: target.id } });
      }
      // Old category URLs keep working: they redirect to the target category or the section index.
      for (const tr of cat.translations) {
        const dest = target?.translations.find((x) => x.locale === tr.locale);
        const section = cat.kind === "TOOL" ? "tools" : "blog";
        await redirectPath(tx, `/${tr.locale}/${catBase(cat.kind)}/${tr.slug}`, dest ? `/${tr.locale}/${catBase(cat.kind)}/${dest.slug}` : `/${tr.locale}/${section}`);
      }
      await tx.category.delete({ where: { id } });
    });
    await audit(user.id, target ? "category.merged" : "category.deleted", "Category", id, { into: target?.id ?? null });
    revalidatePublic();
    revalidatePath("/admin/categories");
  });
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function saveTagAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("tag.manage");
    const id = optional(fd, "id");
    const name = str(fd, "name").slice(0, 60);
    const locale = z.enum(LOCALES).parse(str(fd, "locale"));
    const slug = slugify(name);
    if (!name || !slug) throw new ActionError("c.validation", { name: "c.validation" });
    const clash = await db.tag.findFirst({ where: { locale, slug, ...(id ? { NOT: { id } } : {}) } });
    if (clash) throw new ActionError("c.slugTaken", { name: "c.slugTaken" });
    const tag = id ? await db.tag.update({ where: { id }, data: { name, slug, locale } }) : await db.tag.create({ data: { name, slug, locale } });
    await audit(user.id, id ? "tag.updated" : "tag.created", "Tag", tag.id, { name, locale });
    revalidatePath("/admin/tags");
    revalidatePublic();
  });
}

export async function deleteTagAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("tag.manage");
    const id = str(fd, "id");
    const into = optional(fd, "mergeInto");
    await db.$transaction(async (tx) => {
      if (into && into !== id) {
        const links = await tx.articleTag.findMany({ where: { tagId: id } });
        for (const l of links) await tx.articleTag.upsert({ where: { articleId_tagId: { articleId: l.articleId, tagId: into } }, update: {}, create: { articleId: l.articleId, tagId: into } });
      }
      await tx.tag.delete({ where: { id } });
    });
    await audit(user.id, into ? "tag.merged" : "tag.deleted", "Tag", id, { into });
    revalidatePath("/admin/tags");
    revalidatePublic();
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export async function saveNavItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("navigation.manage");
    const id = optional(fd, "id");
    const href = str(fd, "href");
    const fieldErrors: Record<string, AdminKey> = {};
    if (!isSafeHref(href) || href.length > 500) fieldErrors.href = "c.invalidUrl";
    const labels = { labelEn: str(fd, "labelEn").slice(0, 60), labelFr: str(fd, "labelFr").slice(0, 60), labelAr: str(fd, "labelAr").slice(0, 60) };
    for (const [k, v] of Object.entries(labels)) if (!v) fieldErrors[k] = "c.validation";
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);
    const data = {
      ...labels,
      href,
      external: !href.startsWith("/"),
      location: z.enum(["HEADER", "FOOTER", "SOCIAL"]).parse(str(fd, "location")),
      order: Number(str(fd, "order")) || 0,
      enabled: bool(fd, "enabled"),
    };
    const item = id ? await db.navigationItem.update({ where: { id }, data }) : await db.navigationItem.create({ data });
    await audit(user.id, id ? "navigation.updated" : "navigation.created", "NavigationItem", item.id, { href, location: data.location });
    revalidatePublic();
    revalidatePath("/admin/navigation");
  });
}

export async function deleteNavItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("navigation.manage");
    const id = str(fd, "id");
    await db.navigationItem.delete({ where: { id } });
    await audit(user.id, "navigation.deleted", "NavigationItem", id);
    revalidatePublic();
    revalidatePath("/admin/navigation");
  });
}

// ---------------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------------
export async function saveRedirectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("redirect.manage");
    const from = normalizePath(str(fd, "fromPath"));
    const toRaw = str(fd, "toPath");
    const to = toRaw.startsWith("/") ? normalizePath(toRaw) : toRaw;
    if (!from || from === "/" || from.startsWith("/admin") || from.startsWith("/api")) throw new ActionError("c.invalidUrl", { fromPath: "c.invalidUrl" });
    if (!isSafeHref(to) || to.startsWith("mailto:")) throw new ActionError("c.invalidUrl", { toPath: "c.invalidUrl" });
    if (from === to) throw new ActionError("rd.loop", { toPath: "rd.loop" });
    if (await db.redirect.findUnique({ where: { fromPath: from } })) throw new ActionError("rd.exists", { fromPath: "rd.exists" });
    const r = await db.redirect.create({ data: { fromPath: from, toPath: to, permanent: bool(fd, "permanent") } });
    await audit(user.id, "redirect.created", "Redirect", r.id, { from, to });
    revalidatePublic();
    revalidatePath("/admin/redirects");
  });
}

export async function deleteRedirectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("redirect.manage");
    const id = str(fd, "id");
    await db.redirect.delete({ where: { id } });
    await audit(user.id, "redirect.deleted", "Redirect", id);
    revalidatePublic();
    revalidatePath("/admin/redirects");
  });
}

// ---------------------------------------------------------------------------
// Site settings, scheduler
// ---------------------------------------------------------------------------
export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("settings.manage");
    const email = optional(fd, "contactEmail");
    const logo = optional(fd, "organizationLogoUrl");
    const fieldErrors: Record<string, AdminKey> = {};
    if (email && !z.email().safeParse(email).success) fieldErrors.contactEmail = "c.validation";
    if (logo && !/^https:\/\//.test(logo)) fieldErrors.organizationLogoUrl = "c.invalidUrl";
    const siteName = str(fd, "siteName").slice(0, 60);
    if (!siteName) fieldErrors.siteName = "c.validation";
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);
    const data = {
      siteName,
      taglineEn: str(fd, "taglineEn").slice(0, 160),
      taglineFr: str(fd, "taglineFr").slice(0, 160),
      taglineAr: str(fd, "taglineAr").slice(0, 160),
      contactEmail: email,
      organizationName: optional(fd, "organizationName")?.slice(0, 120) ?? null,
      organizationLogoUrl: logo,
      defaultLocale: z.enum(LOCALES).parse(str(fd, "defaultLocale")),
    };
    await db.siteSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
    await audit(user.id, "settings.updated", "SiteSettings", "default", { siteName });
    revalidatePublic();
  });
}

export async function runSchedulerAction(): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("settings.manage");
    const count = await publishDueArticles();
    await audit(user.id, "scheduler.manualRun", "SiteSettings", "default", { published: count });
    revalidatePublic();
    revalidatePath("/admin/settings");
    return { ok: true, message: "st.ranNow", data: { count: String(count) } };
  });
}

// ---------------------------------------------------------------------------
// Consent & analytics
// ---------------------------------------------------------------------------
export async function saveConsentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("consent.manage");
    const current = await db.consentConfiguration.findUnique({ where: { id: "default" } });
    const data = {
      mode: z.enum(["BUILT_IN", "EXTERNAL_CMP"]).parse(str(fd, "mode")),
      bannerEnabled: bool(fd, "bannerEnabled"),
      externalCmpNotes: optional(fd, "externalCmpNotes")?.slice(0, 1000) ?? null,
      policyVersion: (current?.policyVersion ?? 1) + (bool(fd, "bump") ? 1 : 0),
    };
    await db.consentConfiguration.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
    await audit(user.id, "consent.updated", "ConsentConfiguration", "default", { mode: data.mode, bannerEnabled: data.bannerEnabled, policyVersion: data.policyVersion });
    revalidatePublic();
    revalidatePath("/admin/consent");
  });
}

export async function saveAnalyticsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("analytics.manage");
    const id = optional(fd, "gaMeasurementId")?.toUpperCase() ?? null;
    if (id && !/^G-[A-Z0-9]{4,12}$/.test(id)) throw new ActionError("an.invalidId", { gaMeasurementId: "an.invalidId" });
    const verification = optional(fd, "searchConsoleVerification");
    if (verification && !/^[\w-]{10,100}$/.test(verification)) throw new ActionError("c.validation", { searchConsoleVerification: "c.validation" });
    const data = { gaMeasurementId: id, enabled: bool(fd, "enabled") && !!id, searchConsoleVerification: verification };
    await db.analyticsSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
    await audit(user.id, "analytics.updated", "AnalyticsSettings", "default", { enabled: data.enabled, hasId: !!id, hasVerification: !!verification });
    revalidatePublic();
    revalidatePath("/admin/analytics");
  });
}

// ---------------------------------------------------------------------------
// AdSense
// ---------------------------------------------------------------------------
export async function saveAdSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("ads.manage");
    const publisherId = optional(fd, "publisherId");
    const approvalStatus = z.enum(["NOT_APPLIED", "UNDER_REVIEW", "APPROVED", "REJECTED", "UNKNOWN"]).parse(str(fd, "approvalStatus"));
    const approvalSource = optional(fd, "approvalSource")?.slice(0, 300) ?? null;
    const ownerConfirmedAuthorized = bool(fd, "ownerConfirmedAuthorized");
    const hostname = optional(fd, "siteHostname")?.toLowerCase() ?? null;
    const fieldErrors: Record<string, AdminKey> = {};
    if (publisherId && !isValidPublisherId(publisherId)) fieldErrors.publisherId = "ads.invalidPublisher";
    if (approvalStatus !== "NOT_APPLIED" && !approvalSource) fieldErrors.approvalSource = "ads.sourceRequired";
    if (ownerConfirmedAuthorized && !isValidPublisherId(publisherId)) fieldErrors.ownerConfirmedAuthorized = "ads.confirmRequiresPublisher";
    if (hostname && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname)) fieldErrors.siteHostname = "c.validation";
    if (Object.keys(fieldErrors).length) throw new ActionError("c.validation", fieldErrors);

    const prev = await db.adSettings.findUnique({ where: { id: "default" } });
    const data = {
      masterEnabled: bool(fd, "masterEnabled"),
      mode: z.enum(["TEST", "LIVE"]).parse(str(fd, "mode")),
      siteHostname: hostname,
      publisherId,
      autoAds: bool(fd, "autoAds"),
      ownerConfirmedAuthorized,
      approvalStatus,
      approvalSource,
      approvalVerifiedAt: approvalStatus !== prev?.approvalStatus || approvalSource !== prev?.approvalSource ? (approvalStatus === "NOT_APPLIED" ? null : new Date()) : prev?.approvalVerifiedAt ?? null,
      adsTxt: optional(fd, "adsTxt")?.slice(0, 5000) ?? null,
    };
    await db.adSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
    await audit(user.id, "ads.settingsUpdated", "AdSettings", "default", {
      masterEnabled: data.masterEnabled, mode: data.mode, ownerConfirmedAuthorized, approvalStatus, approvalSource, autoAds: data.autoAds, hasAdsTxt: !!data.adsTxt,
    });
    revalidatePublic();
    revalidatePath("/admin/ads");
  });
}

export async function savePlacementAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await authorize("ads.manage");
    const id = str(fd, "id");
    const slotId = optional(fd, "slotId");
    if (slotId && !isValidSlotId(slotId)) throw new ActionError("ads.invalidSlot", { slotId: "ads.invalidSlot" });
    const minHeight = Math.min(1000, Math.max(50, Number(str(fd, "minHeight")) || 280));
    const p = await db.adPlacement.update({ where: { id }, data: { slotId, enabled: bool(fd, "enabled"), minHeight, desktopOnly: bool(fd, "desktopOnly") } });
    await audit(user.id, "ads.placementUpdated", "AdPlacement", id, { key: p.key, enabled: p.enabled, hasSlot: !!slotId });
    revalidatePublic();
    revalidatePath("/admin/ads");
  });
}
