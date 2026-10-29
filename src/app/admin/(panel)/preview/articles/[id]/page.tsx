import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canEditArticle, can } from "@/lib/auth/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { readFaq } from "@/lib/json-fields";
import { adminContext } from "@/admin/server";
import { prepareArticleHtml, TableOfContents } from "@/components/site/ArticleBody";

// Previews are private: auth-gated, X-Robots-Tag noindex, never in sitemaps, never with ads.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ArticlePreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  const [{ id }, { locale }] = await Promise.all([params, searchParams]);
  const { user, t } = await adminContext("article.create");
  const article = await db.article.findUnique({ where: { id }, include: { translations: true, author: { select: { name: true } } } });
  if (!article) notFound();
  if (!canEditArticle(user, article) && !can(user.role, "article.editAny")) redirect("/admin/forbidden");
  const tr = article.translations.find((x) => x.locale === locale) ?? article.translations[0];
  if (!tr) notFound();
  const { html, toc } = prepareArticleHtml(sanitizeRichText(tr.contentHtml));
  const faq = readFaq(tr.faq);

  return (
    <div dir={tr.locale === "ar" ? "rtl" : "ltr"} lang={tr.locale}>
      <p className="alert-warning mb-6">{t("art.previewNotice")}</p>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">{tr.title}</h1>
        {tr.excerpt && <p className="mt-3 text-lg text-muted">{tr.excerpt}</p>}
        <p className="mt-2 text-sm text-muted">{article.author.name} · {t("art.readingTime", { count: tr.readingTimeMinutes })}</p>
        {article.featuredImageId && (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview
          <img src={`/media/${article.featuredImageId}`} alt={tr.featuredImageAlt ?? ""} className="mt-6 w-full rounded-xl" />
        )}
        <div className="my-6"><TableOfContents toc={toc} title="TOC" /></div>
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: html }} />
        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">FAQ</h2>
            {faq.map((f, i) => (
              <div key={i} className="mt-3"><p className="font-medium">{f.q}</p><p className="text-sm text-muted">{f.a}</p></div>
            ))}
          </section>
        )}
      </article>
    </div>
  );
}
