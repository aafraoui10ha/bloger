import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canEditArticle } from "@/lib/auth/permissions";
import { stripHtml } from "@/lib/html-text";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, Badge, EmptyState, Table, Td, formatDateTime } from "@/admin/components/ui";
import { RestoreRevision } from "./RestoreRevision";

export default async function RevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await adminContext("article.create");
  const article = await db.article.findUnique({ where: { id }, include: { translations: { select: { locale: true, title: true } } } });
  if (!article) notFound();
  if (!canEditArticle(user, article)) redirect("/admin/forbidden");
  const revisions = await db.articleRevision.findMany({ where: { articleId: id }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true } } } });
  const title = article.translations[0]?.title ?? id;

  return (
    <>
      <AdminPageHeader title={t("art.revisionsTitle")} crumbs={[{ label: t("art.title"), href: "/admin/articles" }, { label: title, href: `/admin/articles/${id}` }, { label: t("art.revisionsTitle") }]} />
      <Table head={[t("c.time"), t("c.locale"), t("c.type"), t("c.title"), t("c.user"), t("art.wordCount", { count: "" }).trim(), ""]} empty={revisions.length ? undefined : <EmptyState>{t("c.noResults")}</EmptyState>}>
        {revisions.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt, user.locale)}</Td>
            <Td>{r.locale.toUpperCase()}</Td>
            <Td><Badge tone={r.kind === "PUBLISH" ? "success" : r.kind === "AUTOSAVE" ? "neutral" : "accent"}>{t(`art.revisionKind.${r.kind}`)}</Badge></Td>
            <Td>{r.title}</Td>
            <Td className="text-muted">{r.user?.name ?? t("c.system")}</Td>
            <Td className="tabular-nums text-muted">{stripHtml(r.contentHtml).split(/\s+/).filter(Boolean).length}</Td>
            <Td><RestoreRevision revisionId={r.id} /></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
