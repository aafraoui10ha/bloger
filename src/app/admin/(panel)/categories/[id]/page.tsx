import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader } from "@/admin/components/ui";
import { CategoryForm, DeleteCategory } from "./CategoryForm";

export default async function CategoryEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const { user, t } = await adminContext("category.manage");
  const isNew = id === "new";
  const cat = isNew ? null : await db.category.findUnique({ where: { id }, include: { translations: true, _count: { select: { articles: true, tools: true } } } });
  if (!isNew && !cat) notFound();
  const kind = cat?.kind ?? ((await searchParams).kind === "TOOL" ? "TOOL" : "ARTICLE");
  const [media, others] = await Promise.all([
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, filename: true, alt: true } }),
    db.category.findMany({ where: { kind, ...(cat ? { NOT: { id: cat.id } } : {}) }, include: { translations: { where: { locale: user.locale } } } }),
  ]);
  const name = cat?.translations.find((x) => x.locale === user.locale)?.name ?? cat?.translations[0]?.name ?? t("cat.new");
  const listHref = kind === "TOOL" ? "/admin/categories?kind=TOOL" : "/admin/categories";

  return (
    <>
      <AdminPageHeader
        title={name}
        crumbs={[{ label: kind === "TOOL" ? t("cat.toolTitle") : t("cat.title"), href: listHref }, { label: name }]}
        actions={cat ? <DeleteCategory id={cat.id} hasItems={cat._count.articles + cat._count.tools > 0} targets={others.map((o) => ({ id: o.id, name: o.translations[0]?.name ?? o.id }))} /> : undefined}
      />
      <CategoryForm
        kind={kind}
        category={cat ? { id: cat.id, icon: cat.icon, order: cat.order, imageId: cat.imageId, translations: cat.translations } : null}
        media={media}
      />
    </>
  );
}
