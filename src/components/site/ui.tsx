import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { absoluteUrl, encodePath, jsonLd, localizedPath } from "@/lib/seo";
import type { ArticleCard as ArticleCardData, ToolCard as ToolCardData } from "@/lib/content";
import { ToolIconView } from "@/components/icons";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

export type Crumb = { label: string; href?: string };

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. */
export function Breadcrumbs({ locale, items, label }: { locale: AppLocale; items: Crumb[]; label: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href !== undefined ? { item: absoluteUrl(encodePath(localizedPath(locale, c.href))) } : {}),
    })),
  };
  return (
    <>
      <nav aria-label={label} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />}
              {c.href !== undefined && i < items.length - 1 ? (
                <Link href={c.href} className="hover:text-fg hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-fg">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={data} />
    </>
  );
}

export function ToolCard({ tool }: { tool: ToolCardData }) {
  return (
    <Link href={`/tools/${tool.slug}`} data-reveal className="card card-hover group flex h-full flex-col gap-3 p-5 focus-visible:border-accent-2">
      <span className="flex items-start justify-between">
        <span className="icon-tile transition-colors duration-300 group-hover:bg-berry">
          <ToolIconView name={tool.icon} />
        </span>
        <ArrowUpRight className="size-5 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-2 rtl:-scale-x-100" aria-hidden="true" />
      </span>
      <span className="mt-1 text-base font-bold">{tool.title}</span>
      <span className="text-sm leading-relaxed text-muted">{tool.description}</span>
    </Link>
  );
}

export function ArticleCard({ article, locale, readLabel }: { article: ArticleCardData; locale: AppLocale; readLabel: string }) {
  const date = article.publishedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(article.publishedAt)
    : null;
  return (
    <article data-reveal className="card card-hover flex h-full flex-col overflow-hidden">
      {article.imageId && (
        <Image
          src={`/media/${article.imageId}`}
          alt={article.imageAlt}
          width={640}
          height={336}
          className="aspect-[40/21] w-full object-cover"
          unoptimized
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-semibold leading-snug">
          <Link href={`/blog/${article.slug}`} className="hover:text-accent-2">
            {article.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted">{article.excerpt}</p>
        <p className="mt-auto pt-2 text-xs text-muted">
          {date && <time dateTime={article.publishedAt!.toISOString()}>{date}</time>}
          {date && " · "}
          {readLabel}
        </p>
      </div>
    </article>
  );
}

export function FaqList({ items, title }: { items: { q: string; a: string }[]; title: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-12">
      <h2 id="faq-heading" className="text-xl font-bold">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        {items.map((f, i) => (
          <details key={i} className="group p-4">
            <summary className="cursor-pointer list-none font-semibold marker:hidden hover:text-accent-2">
              <span className="flex items-center justify-between gap-4">
                {f.q}
                <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90" aria-hidden="true" />
              </span>
            </summary>
            <p className="mt-2 text-sm text-muted whitespace-pre-line">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Pagination({ page, total, basePath, labels }: { page: number; total: number; basePath: string; labels: { previous: string; next: string; pageOf: string } }) {
  if (total <= 1) return null;
  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  return (
    <nav aria-label={labels.pageOf} className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-secondary" rel="prev">
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {labels.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">{labels.pageOf}</span>
      {page < total ? (
        <Link href={href(page + 1)} className="btn-secondary" rel="next">
          {labels.next}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="band relative overflow-hidden">
      <span aria-hidden="true" data-float className="pointer-events-none absolute -end-10 -top-12 size-44 rounded-full bg-plum" />
      <span aria-hidden="true" data-float className="pointer-events-none absolute end-40 bottom-[-3rem] hidden size-24 rounded-3xl bg-berry sm:block" />
      <div className="container-page relative py-12 sm:py-16">
        {children}
        <h1 data-anim-step className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        {intro && <p data-anim-step className="mt-4 max-w-2xl text-lg text-muted">{intro}</p>}
      </div>
    </div>
  );
}
