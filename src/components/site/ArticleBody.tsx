import type { AppLocale } from "@/i18n/routing";
import { addHeadingIds, type TocEntry } from "@/lib/sanitize";
import { AdSlot } from "@/components/ads/Ads";
import type { PlacementProps } from "@/lib/ads-server";

/**
 * Splits sanitized article HTML before its second h2 so a single in-content
 * placement can sit between sections (never inside a paragraph or list).
 */
export function splitForInContent(html: string): [string, string] {
  const first = html.indexOf("<h2");
  const second = first >= 0 ? html.indexOf("<h2", first + 3) : -1;
  if (second < 0) return [html, ""];
  return [html.slice(0, second), html.slice(second)];
}

export function prepareArticleHtml(sanitized: string): { html: string; toc: TocEntry[] } {
  return addHeadingIds(sanitized);
}

export function ArticleBody({ html, inContent }: { html: string; locale: AppLocale; inContent: PlacementProps }) {
  const [a, b] = splitForInContent(html);
  return (
    <>
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: a }} />
      {b && (
        <>
          <AdSlot {...inContent} />
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: b }} />
        </>
      )}
    </>
  );
}

export function TableOfContents({ toc, title }: { toc: TocEntry[]; title: string }) {
  if (toc.length < 2) return null;
  return (
    <nav aria-labelledby="toc-title" className="card p-4">
      <h2 id="toc-title" className="text-sm font-semibold">
        {title}
      </h2>
      <ol className="mt-2 space-y-1 text-sm">
        {toc.map((e) => (
          <li key={e.id} className={e.level === 3 ? "ps-4" : ""}>
            <a href={`#${e.id}`} className="text-muted hover:text-accent">
              {e.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
