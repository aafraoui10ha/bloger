import "server-only";
import { db } from "@/lib/db";

/**
 * Finalizes scheduled articles whose publish time has passed: flips status to
 * PUBLISHED and records publishedAt. Public pages already show them on time
 * (see publicArticleWhere); this keeps stored state accurate. Idempotent.
 */
export async function publishDueArticles(now = new Date()): Promise<number> {
  const due = await db.article.findMany({ where: { status: "SCHEDULED", publishAt: { lte: now } }, select: { id: true, publishAt: true } });
  for (const a of due) {
    await db.article.update({
      where: { id: a.id },
      data: { status: "PUBLISHED", publishedAt: a.publishAt ?? now, contentUpdatedAt: a.publishAt ?? now },
    });
    await db.auditLog.create({ data: { action: "article.autoPublished", entityType: "Article", entityId: a.id } });
  }
  await db.siteSettings.upsert({ where: { id: "default" }, update: { lastSchedulerRunAt: now }, create: { id: "default", lastSchedulerRunAt: now } });
  return due.length;
}
