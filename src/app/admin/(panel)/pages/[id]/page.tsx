import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Card, formatDateTime } from "@/admin/components/ui";
import { PageEditor, RestorePageRevision } from "./PageEditor";

export default async function PageEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await adminContext("page.manage");
  const page = await db.page.findUnique({ where: { id }, include: { translations: true } });
  if (!page) notFound();
  const [revisions, media] = await Promise.all([
    db.pageRevision.findMany({ where: { pageId: id }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } }),
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, filename: true, alt: true } }),
  ]);
  const title = page.translations.find((x) => x.locale === user.locale)?.title ?? page.key;

  return (
    <>
      <AdminPageHeader title={title} crumbs={[{ label: t("page.title"), href: "/admin/pages" }, { label: title }]} />
      {page.isLegal && <p className="alert-warning mb-4">{t("page.legalWarning")}</p>}
      <PageEditor
        pageId={page.id}
        isLegal={page.isLegal}
        translations={page.translations.map((x) => ({ locale: x.locale, title: x.title, slug: x.slug, contentHtml: x.contentHtml, seoTitle: x.seoTitle, seoDescription: x.seoDescription, isPublished: x.isPublished, legalReviewed: x.legalReviewed }))}
        media={media}
      />
      {revisions.length > 0 && (
        <Card title={t("page.versions")} className="mt-6">
          <ul className="divide-y divide-border text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{r.locale.toUpperCase()}</span> · {r.title} <span className="text-muted">— {r.user?.name ?? t("c.system")}, {formatDateTime(r.createdAt, user.locale)}</span>
                </span>
                <RestorePageRevision revisionId={r.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
