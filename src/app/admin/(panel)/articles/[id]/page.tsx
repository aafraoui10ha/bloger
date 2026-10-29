import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, canEditArticle } from "@/lib/auth/permissions";
import { readFaq } from "@/lib/json-fields";
import { adminContext } from "@/admin/server";
import { AdminPageHeader, StatusBadge } from "@/admin/components/ui";
import { ArticleEditor } from "./ArticleEditor";
import { DeleteArticle } from "./DeleteArticle";
import type { ArticlePayload } from "@/admin/actions/articles";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await adminContext("article.create");
  const article = await db.article.findUnique({
    where: { id },
    include: {
      translations: true,
      tags: { include: { tag: true } },
      relatedFrom: { select: { toId: true } },
      toolLinks: { select: { toolId: true } },
    },
  });
  if (!article) notFound();
  if (!canEditArticle(user, article)) redirect("/admin/forbidden");

  const [categories, articles, tools, media] = await Promise.all([
    db.categoryTranslation.findMany({ where: { kind: "ARTICLE", locale: user.locale }, select: { categoryId: true, name: true } }),
    db.articleTranslation.findMany({ where: { locale: user.locale }, select: { articleId: true, title: true }, orderBy: { title: "asc" }, take: 300 }),
    db.toolTranslation.findMany({ where: { locale: user.locale }, select: { toolId: true, title: true }, orderBy: { title: "asc" } }),
    db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, filename: true, alt: true } }),
  ]);

  const initial: ArticlePayload = {
    id: article.id,
    categoryId: article.categoryId,
    featuredImageId: article.featuredImageId,
    relatedArticleIds: article.relatedFrom.map((r) => r.toId),
    toolIds: article.toolLinks.map((l) => l.toolId),
    translations: article.translations.map((tr) => ({
      locale: tr.locale,
      title: tr.title,
      slug: tr.slug,
      excerpt: tr.excerpt,
      contentHtml: tr.contentHtml,
      faq: readFaq(tr.faq),
      featuredImageAlt: tr.featuredImageAlt,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
      canonicalUrl: tr.canonicalUrl,
      ogTitle: tr.ogTitle,
      ogDescription: tr.ogDescription,
      robotsNoindex: tr.robotsNoindex,
      robotsNofollow: tr.robotsNofollow,
      structuredData: tr.structuredData,
      isComplete: tr.isComplete,
      tags: article.tags.filter((x) => x.tag.locale === tr.locale).map((x) => x.tag.name).join(", "),
    })),
  };
  const title = article.translations.find((x) => x.locale === user.locale)?.title ?? article.translations[0]?.title ?? t("art.untitled");

  return (
    <>
      <AdminPageHeader
        title={title}
        crumbs={[{ label: t("art.title"), href: "/admin/articles" }, { label: title }]}
        actions={<StatusBadge status={article.status} label={t(`status.${article.status}`)} />}
      />
      <ArticleEditor
        key={article.updatedAt.toISOString()}
        initial={initial}
        status={article.status}
        publishAt={article.publishAt?.toISOString() ?? null}
        isDemo={article.isDemo}
        canPublish={can(user.role, "article.publish")}
        canDelete={can(user.role, "article.delete")}
        categories={categories.map((c) => ({ id: c.categoryId, name: c.name }))}
        articles={articles.map((a) => ({ id: a.articleId, title: a.title }))}
        tools={tools.map((x) => ({ id: x.toolId, title: x.title }))}
        media={media}
        deleteSlot={<DeleteArticle id={article.id} />}
      />
    </>
  );
}
