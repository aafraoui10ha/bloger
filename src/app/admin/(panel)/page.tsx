import Link from "next/link";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { isProduction, liveAdsAllowedByEnv } from "@/lib/env";
import { pageAdMode } from "@/lib/ads";
import { getAdState } from "@/lib/content";
import { storageDriver } from "@/lib/media/storage";
import { adminContext } from "@/admin/server";
import { computeSeoIssues } from "@/admin/seo-health";
import { AdminPageHeader, Badge, Card, formatDateTime } from "@/admin/components/ui";

export default async function OverviewPage() {
  const { user, t } = await adminContext("dashboard.view");
  const now = new Date();
  const [counts, tools, categories, staff, recent, settings, analytics, demo, ads] = await Promise.all([
    db.article.groupBy({ by: ["status"], _count: true }),
    db.tool.count({ where: { enabled: true } }),
    db.category.count(),
    db.user.count({ where: { isActive: true, role: { in: ["SUPER_ADMIN", "ADMIN", "EDITOR"] } } }),
    can(user.role, "audit.view") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }) : Promise.resolve([]),
    db.siteSettings.findUnique({ where: { id: "default" } }),
    db.analyticsSettings.findUnique({ where: { id: "default" } }),
    db.article.count({ where: { isDemo: true } }),
    db.adSettings.findUnique({ where: { id: "default" } }),
  ]);
  const overdue = await db.article.count({ where: { status: "SCHEDULED", publishAt: { lte: now } } });
  const issues = can(user.role, "seo.view") ? await computeSeoIssues() : [];
  const c = (s: string) => counts.find((x) => x.status === s)?._count ?? 0;
  const { settings: adSnap } = await getAdState();
  const liveMode = pageAdMode(adSnap, { kind: "article", hasSubstantialContent: true }, { liveAllowed: liveAdsAllowedByEnv(), isProduction: isProduction() });

  const stats = [
    { label: t("ov.published"), value: c("PUBLISHED"), href: "/admin/articles?status=PUBLISHED" },
    { label: t("ov.drafts"), value: c("DRAFT"), href: "/admin/articles?status=DRAFT" },
    { label: t("ov.scheduled"), value: c("SCHEDULED"), href: "/admin/articles?status=SCHEDULED" },
    { label: t("ov.inReview"), value: c("IN_REVIEW"), href: "/admin/articles?status=IN_REVIEW" },
    { label: t("ov.tools"), value: tools, href: "/admin/tools" },
    { label: t("ov.categories"), value: categories, href: "/admin/categories" },
    { label: t("ov.staff"), value: staff, href: "/admin/users" },
    { label: t("ov.missingTranslations"), value: issues.filter((i) => i.key === "seo.i.missingTranslation").length, href: "/admin/seo" },
    { label: t("ov.seoIssues"), value: issues.length, href: "/admin/seo" },
    { label: t("ov.brokenLinks"), value: issues.filter((i) => i.key === "seo.i.brokenLink").length, href: "/admin/seo" },
  ];

  return (
    <>
      <AdminPageHeader title={t("ov.title")} />
      {demo > 0 && <p className="alert-warning mb-4">{t("ov.demoWarning", { count: demo })}</p>}
      {overdue > 0 && <p className="alert-info mb-4">{t("ov.overdue", { count: overdue })}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-accent/60">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{t("ov.noData")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t("ov.adsense")}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("ov.adsLive")}</dt>
              <dd>{liveMode === "live" ? <Badge tone="success">{t("ov.on")}</Badge> : <Badge>{t("ov.off")}</Badge>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("ov.approval")}</dt>
              <dd>{t(`ads.ap.${ads?.approvalStatus ?? "NOT_APPLIED"}`)}</dd>
            </div>
            {ads?.approvalSource && <p className="text-xs text-muted">{ads.approvalSource}</p>}
          </dl>
          {can(user.role, "ads.manage") && <Link href="/admin/ads" className="btn-secondary btn-sm mt-4">{t("nav.ads")}</Link>}
        </Card>
        <Card title={t("ov.integrations")}>
          <dl className="space-y-2 text-sm">
            {[
              ["Google Analytics", !!(analytics?.enabled && analytics.gaMeasurementId)],
              ["Search Console", !!analytics?.searchConsoleVerification],
              [t("ov.cronSecret"), !!process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd>{ok ? <Badge tone="success">{t("ov.configured")}</Badge> : <Badge tone="warning">{t("ov.notConfigured")}</Badge>}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("ov.storage")}</dt>
              <dd><Badge>{storageDriver()}</Badge></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("ov.scheduler")}</dt>
              <dd className="text-xs">{t("ov.lastRun", { time: settings?.lastSchedulerRunAt ? formatDateTime(settings.lastSchedulerRunAt, user.locale) : t("c.never") })}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {recent.length > 0 && (
        <Card title={t("ov.recentActivity")} className="mt-6" actions={<Link href="/admin/audit" className="text-sm text-accent">{t("c.view")}</Link>}>
          <ul className="divide-y divide-border text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <code className="text-xs">{r.action}</code> <span className="text-muted">— {r.user?.name ?? t("c.system")}</span>
                </span>
                <time className="text-xs text-muted">{formatDateTime(r.createdAt, user.locale)}</time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
