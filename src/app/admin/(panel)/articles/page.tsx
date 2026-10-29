import Link from "next/link";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, AdminPagination, Badge, EmptyState, StatusBadge, Table, Td, formatDateTime } from "@/admin/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { BulkBar } from "./BulkBar";

const PAGE_SIZE = 20;
const STATUSES = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; locale?: string; sort?: string; page?: string }> }) {
  const { user, t } = await adminContext("article.create");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = STATUSES.find((s) => s === sp.status);
  const locale = ["en", "fr", "ar"].find((l) => l === sp.locale) as "en" | "fr" | "ar" | undefined;

  const where: Prisma.ArticleWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { translations: { some: { title: { contains: q } } } } : {}),
    ...(locale ? { translations: { some: { locale, ...(q ? { title: { contains: q } } : {}) } } } : {}),
    // Authors see only their own articles.
    ...(can(user.role, "article.editAny") ? {} : { authorId: user.id }),
  };
  const orderBy: Prisma.ArticleOrderByWithRelationInput = sp.sort === "created" ? { createdAt: "desc" } : { updatedAt: "desc" };
  const [rows, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } }, translations: { select: { locale: true, title: true, isComplete: true } } },
    }),
    db.article.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `/admin/articles?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(locale ? { locale } : {}), ...(sp.sort ? { sort: sp.sort } : {}), page: String(p) })}`;

  return (
    <>
      <AdminPageHeader
        title={t("art.title")}
        crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("art.title") }]}
        actions={<Link href="/admin/articles/new" className="btn-primary">{t("art.new")}</Link>}
      />
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div>
          <label htmlFor="q" className="sr-only">{t("c.search")}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t("art.searchPlaceholder")} className="input w-56" />
        </div>
        <select name="status" defaultValue={status ?? ""} className="input w-40" aria-label={t("c.status")}>
          <option value="">{t("c.status")}: {t("c.all")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select name="locale" defaultValue={locale ?? ""} className="input w-36" aria-label={t("c.locale")}>
          <option value="">{t("c.locale")}: {t("c.all")}</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} className="input w-44" aria-label="Sort">
          <option value="">{t("art.sortUpdated")}</option>
          <option value="created">{t("art.sortCreated")}</option>
        </select>
        <button className="btn-secondary">{t("c.filter")}</button>
      </form>

      <BulkBar canDelete={can(user.role, "article.delete")} canPublish={can(user.role, "article.publish")} formId="bulk-form" />
      <Table
        head={["", t("c.title"), t("c.status"), t("art.languages"), t("c.author"), t("c.updated")]}
        empty={rows.length === 0 ? <EmptyState>{t("c.noResults")}</EmptyState> : undefined}
      >
        {rows.map((a) => {
          const primary = a.translations.find((x) => x.locale === user.locale) ?? a.translations[0];
          return (
            <tr key={a.id} className="hover:bg-surface-2/50">
              <Td>
                <input type="checkbox" name="ids" value={a.id} form="bulk-form" aria-label={primary?.title ?? a.id} />
              </Td>
              <Td>
                <Link href={`/admin/articles/${a.id}`} className="font-medium hover:text-accent">{primary?.title || t("art.untitled")}</Link>
                {a.isDemo && <span className="ms-2"><Badge tone="warning">{t("art.demo")}</Badge></span>}
              </Td>
              <Td>
                <StatusBadge status={a.status} label={t(`status.${a.status}`)} />
                {a.status === "SCHEDULED" && a.publishAt && <p className="mt-1 text-xs text-muted">{formatDateTime(a.publishAt, user.locale)}</p>}
              </Td>
              <Td>
                <div className="flex gap-1">
                  {(["en", "fr", "ar"] as const).map((l) => {
                    const tr = a.translations.find((x) => x.locale === l);
                    return (
                      <Badge key={l} tone={tr?.isComplete ? "success" : tr ? "warning" : "neutral"}>
                        <span title={tr ? (tr.isComplete ? t("c.complete") : t("status.DRAFT")) : t("c.missing")}>{l.toUpperCase()}</span>
                      </Badge>
                    );
                  })}
                </div>
              </Td>
              <Td className="text-muted">{a.author.name}</Td>
              <Td className="text-muted">{formatDateTime(a.updatedAt, user.locale)}</Td>
            </tr>
          );
        })}
      </Table>
      <AdminPagination page={page} total={pages} href={qs} label={t("c.pageOf", { page, total: pages })} />
    </>
  );
}
