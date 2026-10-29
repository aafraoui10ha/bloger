import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card } from "@/admin/components/ui";
import { NavItemForm, DeleteNavItem } from "./NavForms";

export default async function NavigationPage() {
  const { t } = await adminContext("navigation.manage");
  const items = await db.navigationItem.findMany({ orderBy: [{ location: "asc" }, { order: "asc" }] });
  return (
    <>
      <AdminPageHeader title={t("nv.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("nv.title") }]} description={t("nv.defaultsNote")} />
      <Card title={t("nv.new")} className="mb-6">
        <NavItemForm />
      </Card>
      {(["HEADER", "FOOTER", "SOCIAL"] as const).map((loc) => {
        const list = items.filter((i) => i.location === loc);
        return (
          <Card key={loc} title={t(`nv.loc.${loc}`)} className="mb-4">
            {list.length === 0 ? (
              <p className="text-sm text-muted">{t("c.noResults")}</p>
            ) : (
              <ul className="space-y-4">
                {list.map((i) => (
                  <li key={i.id} className="rounded-lg border border-border p-3">
                    <NavItemForm item={i} />
                    <div className="mt-2"><DeleteNavItem id={i.id} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </>
  );
}
