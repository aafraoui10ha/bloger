import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { readFaq, readStringList } from "@/lib/json-fields";
import { adminContext } from "@/admin/server";
import { AdminPageHeader } from "@/admin/components/ui";
import { ToolForm } from "./ToolForm";

export default async function ToolEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await adminContext("tool.manage");
  const tool = await db.tool.findUnique({ where: { id }, include: { translations: true, relatedFrom: true, adPlacements: true } });
  if (!tool) notFound();
  const [categories, others, placements, media] = await Promise.all([
    db.categoryTranslation.findMany({ where: { kind: "TOOL", locale: user.locale }, select: { categoryId: true, name: true } }),
    db.toolTranslation.findMany({ where: { locale: user.locale, NOT: { toolId: id } }, select: { toolId: true, title: true } }),
    db.adPlacement.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true, label: true } }),
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, filename: true, alt: true } }),
  ]);
  const title = tool.translations.find((x) => x.locale === user.locale)?.title ?? tool.moduleKey;

  return (
    <>
      <AdminPageHeader title={title} crumbs={[{ label: t("tool.title"), href: "/admin/tools" }, { label: title }]} description={`${t("tool.module")}: ${tool.moduleKey} — ${t("tool.moduleHint")}`} />
      <ToolForm
        tool={{
          id: tool.id,
          icon: tool.icon,
          order: tool.order,
          featured: tool.featured,
          enabled: tool.enabled,
          categoryId: tool.categoryId,
          related: tool.relatedFrom.map((r) => r.toId),
          placements: tool.adPlacements.map((p) => p.placementId),
          translations: tool.translations.map((tr) => ({
            locale: tr.locale,
            title: tr.title,
            slug: tr.slug,
            shortDescription: tr.shortDescription,
            aboutHtml: tr.aboutHtml,
            steps: readStringList(tr.steps).join("\n"),
            examples: readStringList(tr.examples).join("\n"),
            faq: readFaq(tr.faq),
            seoTitle: tr.seoTitle,
            seoDescription: tr.seoDescription,
            isComplete: tr.isComplete,
          })),
        }}
        categories={categories.map((c) => ({ id: c.categoryId, name: c.name }))}
        others={others.map((o) => ({ id: o.toolId, title: o.title }))}
        placements={placements}
        media={media}
      />
    </>
  );
}
