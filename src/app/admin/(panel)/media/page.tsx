import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { formatBytes } from "@/tools/logic/image";
import { adminContext } from "@/admin/server";
import { mediaUsage } from "@/admin/actions/content";
import { AdminPageHeader, AdminPagination, Badge, EmptyState } from "@/admin/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { MediaItemForms, UploadForm } from "./MediaForms";

const PAGE_SIZE = 24;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; missingAlt?: string; page?: string }> }) {
  const { user, t } = await adminContext("media.upload");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const where: Prisma.MediaAssetWhereInput = {
    ...(q ? { OR: [{ filename: { contains: q } }, { alt: { contains: q } }] } : {}),
    ...(sp.type && /^image\/[a-z+]+$/.test(sp.type) ? { mimeType: sp.type } : {}),
    ...(sp.missingAlt ? { alt: "" } : {}),
  };
  const [items, total] = await Promise.all([
    db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, filename: true, mimeType: true, sizeBytes: true, width: true, height: true, alt: true, caption: true, createdAt: true } }),
    db.mediaAsset.count({ where }),
  ]);
  const usage = await Promise.all(items.map((m) => mediaUsage(m.id)));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader title={t("media.title")} crumbs={[{ label: t("nav.dashboard"), href: "/admin" }, { label: t("media.title") }]} />
      <div className="card mb-6 p-4"><UploadForm /></div>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={t("c.search")} className="input w-56" aria-label={t("c.search")} />
        <select name="type" defaultValue={sp.type ?? ""} className="input w-36" aria-label={t("c.type")}>
          <option value="">{t("c.type")}: {t("c.all")}</option>
          {["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].map((m) => <option key={m} value={m}>{m.replace("image/", "").toUpperCase()}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="missingAlt" value="1" defaultChecked={!!sp.missingAlt} /> {t("media.missingAlt")}</label>
        <button className="btn-secondary">{t("c.filter")}</button>
      </form>
      {items.length === 0 ? (
        <div className="card"><EmptyState>{t("c.noResults")}</EmptyState></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <li key={m.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img src={`/media/${m.id}`} alt={m.alt} loading="lazy" className="aspect-video w-full bg-surface-2 object-contain" />
              <div className="space-y-2 p-4 text-sm">
                <p className="truncate font-medium" title={m.filename}>{m.filename}</p>
                <p className="text-xs text-muted">
                  {m.mimeType.replace("image/", "").toUpperCase()} · {formatBytes(m.sizeBytes, user.locale)}{m.width ? ` · ${m.width}×${m.height}` : ""}
                </p>
                {!m.alt && <Badge tone="warning">{t("media.missingAlt")}</Badge>}
                <div className="text-xs">
                  <span className="text-muted">{t("media.usedBy")}: </span>
                  {usage[i]!.length ? usage[i]!.map((u, j) => <a key={j} href={u.href} className="me-2 text-accent hover:underline">{u.label}</a>) : <span className="text-muted">{t("media.unused")}</span>}
                </div>
                <MediaItemForms item={{ id: m.id, alt: m.alt, caption: m.caption ?? "" }} canDelete={can(user.role, "media.delete")} inUse={usage[i]!.length > 0} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <AdminPagination page={page} total={pages} href={(p) => `/admin/media?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} label={t("c.pageOf", { page, total: pages })} />
    </>
  );
}
