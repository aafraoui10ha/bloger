import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card, EmptyState, Table, Td, formatDateTime } from "@/admin/components/ui";
import { DeleteRedirect, NewRedirectForm } from "./RedirectForms";

export default async function RedirectsPage() {
  const { user, t } = await adminContext("redirect.manage");
  const rows = await db.redirect.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <>
      <AdminPageHeader title={t("rd.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("rd.title") }]} />
      <Card title={t("rd.new")} className="mb-6"><NewRedirectForm /></Card>
      <Table head={[t("rd.from"), t("rd.to"), t("c.type"), t("rd.hits"), t("c.created"), ""]} empty={rows.length ? undefined : <EmptyState>{t("c.noResults")}</EmptyState>}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="font-mono text-xs" >{r.fromPath}</Td>
            <Td className="font-mono text-xs">{r.toPath}</Td>
            <Td>{r.permanent ? "308" : "307"}</Td>
            <Td className="tabular-nums">{r.hits}</Td>
            <Td className="text-muted">{formatDateTime(r.createdAt, user.locale)}</Td>
            <Td><DeleteRedirect id={r.id} /></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
