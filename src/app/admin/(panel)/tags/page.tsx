import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, EmptyState, Table, Td } from "@/admin/components/ui";
import { NewTagForm, TagRowActions } from "./TagForms";

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const { user, t } = await adminContext("tag.manage");
  const sp = await searchParams;
  const locale = (["en", "fr", "ar"] as const).find((l) => l === sp.locale) ?? user.locale;
  const tags = await db.tag.findMany({ where: { locale }, orderBy: { name: "asc" }, include: { _count: { select: { articles: true } } } });

  return (
    <>
      <AdminPageHeader title={t("tag.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("tag.title") }]} />
      <form className="mb-4 flex gap-2">
        <select name="locale" defaultValue={locale} className="input w-40" aria-label={t("c.locale")}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
        <button className="btn-secondary">{t("c.filter")}</button>
      </form>
      <div className="card mb-6 p-4">
        <NewTagForm locale={locale} />
      </div>
      <Table head={[t("c.name"), t("c.slug"), t("tag.articles"), t("c.actions")]} empty={tags.length ? undefined : <EmptyState>{t("c.noResults")}</EmptyState>}>
        {tags.map((tag) => (
          <tr key={tag.id}>
            <Td className="font-medium">{tag.name}</Td>
            <Td className="font-mono text-xs text-muted">{tag.slug}</Td>
            <Td className="tabular-nums">{tag._count.articles}</Td>
            <Td>
              <TagRowActions tag={{ id: tag.id, name: tag.name, locale: tag.locale }} others={tags.filter((x) => x.id !== tag.id).map((x) => ({ id: x.id, name: x.name }))} />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
