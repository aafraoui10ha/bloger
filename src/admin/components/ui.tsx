import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function AdminPageHeader({ title, crumbs, actions, description }: { title: string; crumbs?: { label: string; href?: string }[]; actions?: ReactNode; description?: string }) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 rtl:rotate-180" aria-hidden="true" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-fg hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {description && <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-border-strong bg-surface-2 text-muted",
  IN_REVIEW: "border-warning/40 bg-warning-soft text-warning",
  SCHEDULED: "border-accent/40 bg-accent-soft text-accent",
  PUBLISHED: "border-success/40 bg-success-soft text-success",
  ARCHIVED: "border-border bg-surface-2 text-muted line-through",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>{label}</span>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "accent"; children: ReactNode }) {
  const styles = {
    neutral: "border-border-strong bg-surface-2 text-muted",
    success: "border-success/40 bg-success-soft text-success",
    warning: "border-warning/40 bg-warning-soft text-warning",
    danger: "border-danger/40 bg-danger-soft text-danger",
    accent: "border-accent/40 bg-accent-soft text-accent",
  }[tone];
  return <span className={`badge ${styles}`}>{children}</span>;
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>;
}

export function AdminPagination({ page, total, href, label }: { page: number; total: number; href: (p: number) => string; label: string }) {
  if (total <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label={label}>
      {page > 1 ? <Link className="btn-secondary btn-sm" href={href(page - 1)}>←</Link> : <span />}
      <span className="text-muted">{label}</span>
      {page < total ? <Link className="btn-secondary btn-sm" href={href(page + 1)}>→</Link> : <span />}
    </nav>
  );
}

export function formatDateTime(d: Date | null | undefined, locale: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA-u-nu-latn" : locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
