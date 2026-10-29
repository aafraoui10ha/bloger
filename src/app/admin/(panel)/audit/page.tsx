import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, AdminPagination, EmptyState, Table, Td, formatDateTime } from "@/admin/components/ui";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string; page?: string }> }) {
  const { user, t } = await adminContext("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = (sp.action ?? "").slice(0, 60);
  const entity = (sp.entity ?? "").slice(0, 60);
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action } } : {}),
    ...(entity ? { entityType: entity } : {}),
  };
  const [rows, total, entities] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader title={t("au.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("au.title") }]} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="action" defaultValue={action} placeholder={t("au.action")} className="input w-56" aria-label={t("au.action")} />
        <select name="entity" defaultValue={entity} className="input w-48" aria-label={t("au.entity")}>
          <option value="">{t("au.entity")}: {t("c.all")}</option>
          {entities.map((e) => <option key={e.entityType} value={e.entityType}>{e.entityType}</option>)}
        </select>
        <button className="btn-secondary">{t("c.filter")}</button>
      </form>
      <Table head={[t("c.time"), t("c.user"), t("au.action"), t("au.entity"), t("c.details")]} empty={rows.length ? undefined : <EmptyState>{t("c.noResults")}</EmptyState>}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt, user.locale)}</Td>
            <Td>{r.user ? r.user.name : t("c.system")}</Td>
            <Td><code className="text-xs">{r.action}</code></Td>
            <Td className="text-xs text-muted">{r.entityType}{r.entityId ? ` · ${r.entityId.slice(0, 10)}` : ""}</Td>
            <Td><code className="block max-w-md truncate text-xs text-muted" title={r.details ? JSON.stringify(r.details) : ""}>{r.details ? JSON.stringify(r.details) : ""}</code></Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} total={pages} href={(p) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(entity ? { entity } : {}), page: String(p) })}`} label={t("c.pageOf", { page, total: pages })} />
    </>
  );
}
