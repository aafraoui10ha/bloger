"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import { BarChart3, CheckCircle2, FolderOpen, Home, Info, LayoutGrid, Search, Settings, Star, X, AlertTriangle } from "lucide-react";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ar from "../../../messages/ar.json";
import { CATEGORIES } from "../catalog";
import { installNativeLinks, isTauri, type SaveResult } from "./native";
import { settingsStore, type Locale } from "./store";
import { CategoryIcon } from "../views/icons";
import { agencyUrl } from "@/lib/agency-links";

const MESSAGES: Record<Locale, typeof en> = { en, fr, ar };

function applyDocumentSettings(locale: Locale, theme: string) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function DesktopShell({ children }: { children: ReactNode }) {
  const settings = settingsStore.use();
  useEffect(() => {
    applyDocumentSettings(settings.locale, settings.theme);
    if (settings.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentSettings(settings.locale, settings.theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.locale, settings.theme]);

  return (
    <NextIntlClientProvider locale={settings.locale} messages={MESSAGES[settings.locale]} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
      <Frame>{children}</Frame>
    </NextIntlClientProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const t = useTranslations("desktop");
  const router = useRouter();
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Native save dialog for tool downloads, default browser for web links.
  useEffect(() => {
    if (!isTauri()) return;
    return installNativeLinks((r) => {
      if (r.ok !== "cancelled") setSaved(r);
    });
  }, []);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(null), saved.ok === true ? 6000 : 12000);
    return () => clearTimeout(id);
  }, [saved]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === ",") {
        e.preventDefault();
        router.push("/settings/");
      } else if (e.key.toLowerCase() === "h" && e.shiftKey) {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-fg">
      <Suspense fallback={<aside className="band band-ink w-60 shrink-0" />}>
        <Sidebar searchRef={searchRef} />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto" id="main">
        {children}
      </main>
      {saved && (
        <div role="status" className={`fixed bottom-4 z-[70] flex max-w-lg items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-xl ltr:right-4 rtl:left-4 ${saved.ok === true ? "bg-ink text-cream" : "bg-danger-soft text-danger"}`}>
          {saved.ok === true ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span className="min-w-0 break-all" dir="auto">
            {saved.ok === true ? t("save.saved", { path: saved.path }) : saved.ok === false ? t("save.failed", { error: saved.error }) : null}
          </span>
          <button type="button" className="shrink-0 opacity-80 hover:opacity-100" onClick={() => setSaved(null)} aria-label={t("save.dismiss")}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function NavLink({ href, icon, children, active }: { href: string; icon: ReactNode; children: ReactNode; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-cream text-ink" : "text-cream/85 hover:bg-white/10 hover:text-cream"}`}>
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Sidebar({ searchRef }: { searchRef: React.RefObject<HTMLInputElement | null> }) {
  const t = useTranslations("desktop");
  const locale = useLocale();
  const path = usePathname() || "/";
  const router = useRouter();
  const params = useSearchParams();
  const is = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));
  return (
    <aside className="band band-ink flex w-60 shrink-0 flex-col gap-4 overflow-y-auto px-3 py-4">
      <Link href="/" className="flex items-center gap-2 px-2 text-lg font-bold text-cream">
        {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
        <img src="/app-logo.png" alt="" className="size-8" />
        {t("appName")}
      </Link>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-cream/60 ltr:left-3 rtl:right-3" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label={t("search.label")}
          placeholder={t("search.placeholder")}
          defaultValue={path.startsWith("/tools") ? (params.get("q") ?? "") : ""}
          className="w-full rounded-lg border border-white/15 bg-white/10 py-2 text-sm text-cream placeholder:text-cream/55 focus:bg-white/15 focus:outline-none ltr:pr-3 ltr:pl-9 rtl:pr-9 rtl:pl-3"
          onChange={(e) => router.replace(`/tools/?q=${encodeURIComponent(e.target.value)}`)}
        />
      </div>
      <nav aria-label={t("nav.main")} className="flex flex-col gap-0.5">
        <NavLink href="/" icon={<Home className="size-4" />} active={is("/")}>
          {t("nav.home")}
        </NavLink>
        <NavLink href="/tools/" icon={<LayoutGrid className="size-4" />} active={path === "/tools/" || path === "/tools"}>
          {t("nav.allTools")}
        </NavLink>
        <NavLink href="/tool/chart-designer/" icon={<BarChart3 className="size-4" />} active={is("/tool/chart-designer")}>
          {t("nav.chartDesigner")}
        </NavLink>
        <NavLink href="/favorites/" icon={<Star className="size-4" />} active={is("/favorites")}>
          {t("nav.favorites")}
        </NavLink>
        <NavLink href="/projects/" icon={<FolderOpen className="size-4" />} active={is("/projects")}>
          {t("nav.projects")}
        </NavLink>
      </nav>
      <div>
        <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-cream/55 uppercase">{t("nav.categories")}</p>
        <nav aria-label={t("nav.categories")} className="flex flex-col gap-0.5">
          {CATEGORIES.map((c) => (
            <NavLink key={c} href={`/tools/${c}/`} icon={<CategoryIcon category={c} className="size-4" />} active={is(`/tools/${c}`)}>
              {t(`categories.${c}`)}
            </NavLink>
          ))}
        </nav>
      </div>
      <nav className="mt-auto flex flex-col gap-0.5 border-t border-white/10 pt-3" aria-label={t("nav.settings")}>
        <NavLink href="/settings/" icon={<Settings className="size-4" />} active={is("/settings")}>
          {t("nav.settings")}
        </NavLink>
        <NavLink href="/about/" icon={<Info className="size-4" />} active={is("/about")}>
          {t("nav.about")}
        </NavLink>
      </nav>
      <a href={agencyUrl(locale)} target="_blank" rel="noopener noreferrer" className="px-3 text-xs text-cream/60 hover:text-cream" data-testid="agency-link">
        {t("builtBy")}
      </a>
    </aside>
  );
}
