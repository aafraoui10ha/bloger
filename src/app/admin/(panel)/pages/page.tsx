import Link from "next/link";
import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Badge, Table, Td, formatDateTime } from "@/admin/components/ui";

export default async function PagesAdmin() {
  const { user, t } = await adminContext("page.manage");
  const pages = await db.page.findMany({ orderBy: { key: "asc" }, include: { translations: true } });
  return (
    <>
      <AdminPageHeader title={t("page.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("page.title") }]} />
      <Table head={[t("c.title"), t("art.languages"), t("c.type"), t("c.updated")]}>
        {pages.map((p) => {
          const tr = p.translations.find((x) => x.locale === user.locale) ?? p.translations[0];
          const latest = p.translations.reduce<Date | null>((m, x) => (!m || x.updatedAt > m ? x.updatedAt : m), null);
          return (
            <tr key={p.id}>
              <Td><Link href={`/admin/pages/${p.id}`} className="font-medium hover:text-accent">{tr?.title ?? p.key}</Link></Td>
              <Td>
                <div className="flex gap-1">
                  {(["en", "fr", "ar"] as const).map((l) => {
                    const x = p.translations.find((y) => y.locale === l);
                    return <Badge key={l} tone={x?.isPublished ? (p.isLegal && !x.legalReviewed ? "warning" : "success") : "neutral"}>{l.toUpperCase()}</Badge>;
                  })}
                </div>
              </Td>
              <Td>{p.isLegal ? <Badge tone="warning">{t("page.legal")}</Badge> : "—"}</Td>
              <Td className="text-muted">{formatDateTime(latest, user.locale)}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
