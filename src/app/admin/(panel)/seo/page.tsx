import Link from "next/link";
import { adminContext } from "@/admin/server";
import { computeSeoIssues } from "@/admin/seo-health";
import { AdminPageHeader, Badge, Card, Table, Td } from "@/admin/components/ui";

export default async function SeoPage() {
  const { t } = await adminContext("seo.view");
  const issues = await computeSeoIssues();
  const errors = issues.filter((i) => i.severity === "error");
  const sorted = [...errors, ...issues.filter((i) => i.severity === "warning")];

  return (
    <>
      <AdminPageHeader title={t("seo.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("seo.title") }]} description={t("seo.intro")} />
      {issues.length === 0 ? (
        <Card><p className="text-success">{t("seo.allGood")}</p></Card>
      ) : (
        <Table head={["", t("seo.issue"), t("seo.item")]}>
          {sorted.map((i, n) => (
            <tr key={n}>
              <Td>{i.severity === "error" ? <Badge tone="danger">!</Badge> : <Badge tone="warning">i</Badge>}</Td>
              <Td>{t(i.key, i.vars)}</Td>
              <Td><Link href={i.href} className="text-accent hover:underline">{i.item}</Link></Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
