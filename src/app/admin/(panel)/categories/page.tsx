import Link from "next/link";
import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, EmptyState, Table, Td } from "@/admin/components/ui";
import { ToolIconView } from "@/components/icons";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { user, t } = await adminContext("category.manage");
  const kind = (await searchParams).kind === "TOOL" ? "TOOL" : "ARTICLE";
  const cats = await db.category.findMany({
    where: { kind },
    orderBy: { order: "asc" },
    include: { translations: true, _count: { select: { articles: true, tools: true } } },
  });
  const title = kind === "TOOL" ? t("cat.toolTitle") : t("cat.title");

  return (
    <>
      <AdminPageHeader
        title={title}
        crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: title }]}
        actions={<Link href={`/admin/categories/new?kind=${kind}`} className="btn-primary">{t("cat.new")}</Link>}
      />
      <div className="mb-4 flex gap-2">
        <Link href="/admin/categories" className={`btn-sm ${kind === "ARTICLE" ? "btn-primary" : "btn-secondary"}`}>{t("cat.kind.ARTICLE")}</Link>
        <Link href="/admin/categories?kind=TOOL" className={`btn-sm ${kind === "TOOL" ? "btn-primary" : "btn-secondary"}`}>{t("cat.kind.TOOL")}</Link>
      </div>
      <Table head={[t("c.name"), t("art.languages"), t("cat.items"), t("c.order")]} empty={cats.length ? undefined : <EmptyState>{t("c.noResults")}</EmptyState>}>
        {cats.map((c) => {
          const tr = c.translations.find((x) => x.locale === user.locale) ?? c.translations[0];
          return (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/categories/${c.id}`} className="flex items-center gap-2 font-medium hover:text-accent">
                  <ToolIconView name={c.icon} className="size-4 text-muted" />
                  {tr?.name ?? c.id}
                </Link>
              </Td>
              <Td className="text-muted">{c.translations.map((x) => x.locale.toUpperCase()).join(" · ")}</Td>
              <Td className="tabular-nums">{c._count.articles + c._count.tools}</Td>
              <Td className="tabular-nums">{c.order}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
