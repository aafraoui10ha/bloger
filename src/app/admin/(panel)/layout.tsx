import Link from "next/link";
import {
  Activity, BarChart3, Cookie, Files, Folder, FolderCog, Images, LayoutDashboard, LogOut, Megaphone, Navigation, Newspaper,
  ScrollText, Settings, Shuffle, Tags, User, Users, Wrench, ExternalLink,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/auth/permissions";
import { adminT, type AdminKey } from "@/admin/i18n";
import { logoutAction } from "@/admin/actions/auth";
import { getSiteSettings } from "@/lib/content";
import { AdminNavLink } from "./AdminNavLink";

type Item = { href: string; label: AdminKey; icon: typeof Activity; perm: Permission };

const GROUPS: { label: AdminKey; items: Item[] }[] = [
  {
    label: "nav.dashboard",
    items: [{ href: "/admin", label: "nav.overview", icon: LayoutDashboard, perm: "dashboard.view" }],
  },
  {
    label: "nav.content",
    items: [
      { href: "/admin/articles", label: "nav.articles", icon: Newspaper, perm: "article.create" },
      { href: "/admin/categories", label: "nav.categories", icon: Folder, perm: "category.manage" },
      { href: "/admin/tags", label: "nav.tags", icon: Tags, perm: "tag.manage" },
      { href: "/admin/tools", label: "nav.tools", icon: Wrench, perm: "tool.manage" },
      { href: "/admin/categories?kind=TOOL", label: "nav.toolCategories", icon: FolderCog, perm: "category.manage" },
      { href: "/admin/pages", label: "nav.pages", icon: Files, perm: "page.manage" },
      { href: "/admin/media", label: "nav.media", icon: Images, perm: "media.upload" },
    ],
  },
  {
    label: "nav.site",
    items: [
      { href: "/admin/navigation", label: "nav.navigation", icon: Navigation, perm: "navigation.manage" },
      { href: "/admin/seo", label: "nav.seo", icon: Activity, perm: "seo.view" },
      { href: "/admin/redirects", label: "nav.redirects", icon: Shuffle, perm: "redirect.manage" },
      { href: "/admin/settings", label: "nav.settings", icon: Settings, perm: "settings.manage" },
    ],
  },
  {
    label: "nav.monetization",
    items: [
      { href: "/admin/ads", label: "nav.ads", icon: Megaphone, perm: "ads.manage" },
      { href: "/admin/consent", label: "nav.consent", icon: Cookie, perm: "consent.manage" },
      { href: "/admin/analytics", label: "nav.analytics", icon: BarChart3, perm: "analytics.manage" },
    ],
  },
  {
    label: "nav.system",
    items: [
      { href: "/admin/users", label: "nav.users", icon: Users, perm: "user.manage" },
      { href: "/admin/audit", label: "nav.audit", icon: ScrollText, perm: "audit.view" },
    ],
  },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = adminT(user.locale);
  const { siteName } = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-2 p-4">
          <Link href="/admin" className="font-semibold">
            {siteName}
          </Link>
          <a href={`/${user.locale}`} target="_blank" rel="noopener" className="btn-ghost btn-sm" title={t("nav.viewSite")}>
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("nav.viewSite")}</span>
          </a>
        </div>
        <details className="group lg:open" open>
          <summary className="cursor-pointer px-4 pb-2 text-xs text-muted lg:hidden">{t("nav.dashboard")}</summary>
          <nav aria-label={t("nav.dashboard")} className="px-2 pb-4">
            {GROUPS.map((g) => {
              const items = g.items.filter((i) => can(user.role, i.perm));
              if (!items.length) return null;
              return (
                <div key={g.label} className="mt-3">
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t(g.label)}</p>
                  <ul className="mt-1 space-y-0.5">
                    {items.map((i) => (
                      <li key={i.href}>
                        <AdminNavLink href={i.href}>
                          <i.icon className="size-4 shrink-0" aria-hidden="true" />
                          {t(i.label)}
                        </AdminNavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </details>
        <div className="border-t border-border p-3">
          <p className="truncate px-2 text-sm font-medium">{user.name}</p>
          <p className="truncate px-2 text-xs text-muted">{t(`role.${user.role}`)}</p>
          <div className="mt-2 flex gap-1">
            <AdminNavLink href="/admin/account">
              <User className="size-4" aria-hidden="true" />
              {t("nav.account")}
            </AdminNavLink>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost btn-sm">
                <LogOut className="size-4" aria-hidden="true" />
                {t("nav.logout")}
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}

