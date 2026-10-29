import { db } from "@/lib/db";

/** Empties every table between tests. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ name: string }[]>`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
  // FOREIGN_KEY_CHECKS is per connection, so pin one connection with a transaction.
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of tables) await tx.$executeRawUnsafe(`DELETE FROM \`${t.name}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
}

export async function makeUser(role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AUTHOR" = "AUTHOR") {
  return db.user.create({ data: { email: `${role.toLowerCase()}-${Math.random().toString(36).slice(2)}@test.local`, name: role, role, passwordHash: "x" } });
}

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

export async function makeArticle(opts: {
  authorId: string;
  status?: "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishAt?: Date | null;
  translations?: { locale: "en" | "fr" | "ar"; slug: string; isComplete?: boolean; robotsNoindex?: boolean; canonicalUrl?: string | null; contentHtml?: string }[];
}) {
  return db.article.create({
    data: {
      authorId: opts.authorId,
      status: opts.status ?? "DRAFT",
      publishAt: opts.publishAt ?? null,
      publishedAt: opts.status === "PUBLISHED" ? new Date() : null,
      translations: {
        create: (opts.translations ?? [{ locale: "en", slug: "a" }]).map((t) => ({
          locale: t.locale,
          slug: t.slug,
          title: `Title ${t.slug}`,
          excerpt: "An excerpt that is long enough to satisfy the publishing rules here.",
          contentHtml: t.contentHtml ?? `<p>${words(200)}</p>`,
          isComplete: t.isComplete ?? true,
          robotsNoindex: t.robotsNoindex ?? false,
          canonicalUrl: t.canonicalUrl ?? null,
          faq: [],
        })),
      },
    },
    include: { translations: true },
  });
}
