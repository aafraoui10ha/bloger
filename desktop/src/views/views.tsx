"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Briefcase, ExternalLink, FilePlus2, FolderOpen, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { agencyUrl, WHATSAPP_URL } from "@/lib/agency-links";
import { ToolRenderer } from "@/tools/ToolRenderer";
import { deleteProject, listProjects, rememberLastProject, type ProjectSummary } from "@/tools/designer/storage";
import { CATEGORIES, FEATURED, getTool, searchTools, toolsIn, type CategoryId } from "../catalog";
import { addRecent, favoritesStore, recentsStore, settingsStore, type Locale, type Theme } from "../shell/store";
import { appInfo, openExternal, type AppInfo } from "../shell/native";
import { FavoriteButton, PageTitle, ToolGrid } from "./ToolCard";
import { CategoryIcon } from "./icons";

const page = "mx-auto w-full max-w-6xl px-6 py-8";
const byKeys = (keys: readonly string[]) => keys.map((k) => getTool(k)).filter((t): t is NonNullable<typeof t> => !!t);

export function HomeView() {
  const t = useTranslations("desktop");
  const favorites = favoritesStore.use();
  const recents = recentsStore.use();
  return (
    <div className={page}>
      <section className="band band-plum mb-8 rounded-2xl px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("home.greeting")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("home.subtitle")}</p>
      </section>
      {recents.length > 0 && (
        <section className="mb-8" aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-3 text-lg font-semibold">
            {t("home.recent")}
          </h2>
          <ToolGrid tools={byKeys(recents).slice(0, 6)} />
        </section>
      )}
      {favorites.length > 0 && (
        <section className="mb-8" aria-labelledby="fav-h">
          <h2 id="fav-h" className="mb-3 text-lg font-semibold">
            {t("home.favorites")}
          </h2>
          <ToolGrid tools={byKeys(favorites)} />
        </section>
      )}
      <section className="mb-8" aria-labelledby="featured-h">
        <h2 id="featured-h" className="mb-3 text-lg font-semibold">
          {t("home.featured")}
        </h2>
        <ToolGrid tools={byKeys(FEATURED)} />
      </section>
      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-3 text-lg font-semibold">
          {t("home.categories")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/tools/${c}/`} className="card card-hover flex items-center gap-3 p-4">
              <span className="icon-tile size-10">
                <CategoryIcon category={c} />
              </span>
              <span>
                <span className="block font-semibold">{t(`categories.${c}`)}</span>
                <span className="text-sm text-muted">{t("home.count", { count: toolsIn(c).length })}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AllToolsView() {
  const t = useTranslations("desktop");
  const locale = useLocale() as Locale;
  const q = useSearchParams().get("q") ?? "";
  const tools = useMemo(() => searchTools(q, locale), [q, locale]);
  return (
    <div className={page}>
      <PageTitle title={t("nav.allTools")} subtitle={t("home.count", { count: tools.length })} />
      {tools.length ? <ToolGrid tools={tools} /> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">{t("search.noResults", { query: q })}</p>}
    </div>
  );
}

export function CategoryView({ category }: { category: CategoryId }) {
  const t = useTranslations("desktop");
  const tools = toolsIn(category);
  return (
    <div className={page}>
      <PageTitle title={t(`categories.${category}`)} subtitle={t("home.count", { count: tools.length })} />
      <ToolGrid tools={tools} />
    </div>
  );
}

export function ToolView({ toolKey }: { toolKey: string }) {
  const t = useTranslations("desktop");
  const locale = useLocale() as Locale;
  const tool = getTool(toolKey);
  useEffect(() => {
    if (tool) addRecent(tool.key);
  }, [tool]);
  if (!tool) return null;
  return (
    <div className={tool.wide ? "w-full px-4 py-4" : page}>
      <div className={`flex items-start gap-3 ${tool.wide ? "mb-3" : "mb-5"}`}>
        <Link href="/tools/" className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={t("tool.back")} title={t("tool.back")}>
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={`${tool.wide ? "text-xl" : "text-2xl"} font-bold tracking-tight`}>{tool.title[locale]}</h1>
          {!tool.wide && <p className="mt-1 text-muted">{tool.short[locale]}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            {t("tool.local")}
          </p>
        </div>
        <FavoriteButton toolKey={tool.key} />
      </div>
      <section aria-label={tool.title[locale]} className={tool.wide ? "" : "card p-4 sm:p-6"}>
        <ToolRenderer moduleKey={tool.key} toolKey={tool.key} />
      </section>
    </div>
  );
}

export function FavoritesView() {
  const t = useTranslations("desktop");
  const favorites = favoritesStore.use();
  const tools = byKeys(favorites);
  return (
    <div className={page}>
      <PageTitle title={t("favorites.title")} />
      {tools.length ? <ToolGrid tools={tools} /> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">{t("favorites.empty")}</p>}
    </div>
  );
}

export function ProjectsView() {
  const t = useTranslations("desktop.projects");
  const locale = useLocale();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const refresh = () => listProjects().then(setProjects, () => setProjects([]));
  useEffect(() => {
    let alive = true;
    listProjects().then(
      (p) => alive && setProjects(p),
      () => alive && setProjects([]),
    );
    return () => {
      alive = false;
    };
  }, []);
  const fmt = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const open = (id: string) => {
    rememberLastProject(id);
    router.push("/tool/chart-designer/");
  };
  return (
    <div className={page}>
      <PageTitle title={t("title")} subtitle={t("subtitle")}>
        <button type="button" className="btn-primary" onClick={() => open("")}>
          <FilePlus2 className="size-4" aria-hidden="true" />
          {t("new")}
        </button>
      </PageTitle>
      {projects && projects.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">{t("empty")}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects?.map((p) => (
          <li key={p.id} className="card flex flex-col gap-2 p-4">
            <p className="truncate font-semibold" dir="auto">
              {p.name}
            </p>
            <p className="text-sm text-muted">
              {p.width}×{p.height} · {t("elements", { count: p.elements })}
            </p>
            <p className="text-xs text-muted">{t("updated", { date: fmt.format(p.updatedAt) })}</p>
            <div className="mt-1 flex gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => open(p.id)}>
                <FolderOpen className="size-4" aria-hidden="true" />
                {t("open")}
              </button>
              {confirm === p.id ? (
                <button type="button" className="btn-danger btn-sm" onClick={() => void deleteProject(p.id).then(refresh).then(() => setConfirm(null))}>
                  {t("confirmDelete")}
                </button>
              ) : (
                <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => setConfirm(p.id)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t("delete")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

export function SettingsView() {
  const t = useTranslations("desktop.settings");
  const settings = settingsStore.use();
  const [cleared, setCleared] = useState(false);
  const set = (patch: Partial<typeof settings>) => settingsStore.set({ ...settings, ...patch });
  return (
    <div className={`${page} max-w-3xl`}>
      <PageTitle title={t("title")} />
      <div className="space-y-4">
        <section className="card p-5">
          <label htmlFor="language" className="label">
            {t("language")}
          </label>
          <select id="language" className="input max-w-xs" value={settings.locale} onChange={(e) => set({ locale: e.target.value as Locale })}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value} lang={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="hint mt-2">{t("languageHint")}</p>
        </section>
        <section className="card p-5">
          <span className="label">{t("theme")}</span>
          <div role="radiogroup" aria-label={t("theme")} className="inline-flex rounded-lg border border-border-strong p-0.5">
            {(["system", "light", "dark"] as Theme[]).map((th) => (
              <button key={th} type="button" role="radio" aria-checked={settings.theme === th} className={`rounded-md px-4 py-1.5 text-sm font-medium ${settings.theme === th ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`} onClick={() => set({ theme: th })}>
                {t(th === "system" ? "themeSystem" : th === "light" ? "themeLight" : "themeDark")}
              </button>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="label">{t("data")}</h2>
          <p className="hint mb-3">{t("dataHint")}</p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              recentsStore.set([]);
              setCleared(true);
            }}
          >
            {t("clearRecents")}
          </button>
          {cleared && (
            <p role="status" className="mt-2 text-sm text-success">
              {t("cleared")}
            </p>
          )}
        </section>
        <section className="card p-5">
          <h2 className="label">{t("shortcuts")}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {[
              ["Ctrl + K", t("shortcutSearch")],
              ["Ctrl + ,", t("shortcutSettings")],
              ["Ctrl + Shift + H", t("shortcutHome")],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs" dir="ltr">
                    {k}
                  </kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

export function AboutView() {
  const t = useTranslations("desktop.about");
  const tp = useTranslations("desktop.platforms");
  const locale = useLocale();
  const [info, setInfo] = useState<AppInfo | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    appInfo().then(
      (i) => alive && setInfo(i),
      () => alive && setInfo(null),
    );
    return () => {
      alive = false;
    };
  }, []);
  const site = process.env.NEXT_PUBLIC_TOOLBOX_SITE_URL || "";
  const platform = info ? `${tp.has(info.platform) ? tp(info.platform as "windows") : info.platform} ${info.arch === "x86_64" ? "x64" : info.arch}` : "";
  const date = info?.releaseDate ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { dateStyle: "long" }).format(new Date(info.releaseDate)) : t("notSet");
  return (
    <div className={`${page} max-w-3xl`}>
      <PageTitle title={t("title")} />
      <section className="card mb-4 flex items-center gap-5 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
        <img src="/app-icon.svg" alt="" className="size-16" />
        <div>
          <p className="text-xl font-bold">{t("product")}</p>
          {info && (
            <p className="text-muted" data-testid="app-version">
              {t("version", { version: info.version })}
            </p>
          )}
          {info === null && <p className="text-sm text-muted">{t("notInApp")}</p>}
        </div>
      </section>
      {info && (
        <section className="card mb-4 p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
            <dt className="text-muted">{t("profile")}</dt>
            <dd>{t(`profiles.${info.profile === "production" ? "production" : "development"}`)}</dd>
            <dt className="text-muted">{t("build")}</dt>
            <dd className="font-mono text-xs" dir="ltr">
              {info.buildId}
            </dd>
            <dt className="text-muted">{t("channel")}</dt>
            <dd>{t(`channels.${info.channel === "beta" ? "beta" : "stable"}`)}</dd>
            <dt className="text-muted">{t("releaseDate")}</dt>
            <dd>{date}</dd>
            <dt className="text-muted">{t("platform")}</dt>
            <dd dir="ltr" className="text-start">
              {platform}
            </dd>
            <dt className="text-muted">{t("engine")}</dt>
            <dd dir="ltr" className="text-start">
              Tauri {info.tauriVersion}
            </dd>
          </dl>
        </section>
      )}
      <section className="band band-plum mb-4 rounded-2xl p-6" aria-labelledby="agency-h" data-testid="agency-card">
        <div className="flex items-start gap-4">
          <span className="icon-tile size-11 shrink-0">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="agency-h" className="text-lg font-bold">
              {t("agencyTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("agencyBody")}</p>
            <p className="mt-4 font-semibold">{t("projectTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("projectBody")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={() => void openExternal(WHATSAPP_URL)}>
                <MessageCircle className="size-4" aria-hidden="true" />
                {t("projectCta")}
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => void openExternal(agencyUrl(locale))}>
                <ExternalLink className="size-4" aria-hidden="true" />
                {t("agencyVisit")}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="card mb-4 p-6">
        <h2 className="mb-2 font-semibold">{t("updates")}</h2>
        <p className="text-sm text-muted">{t("updatesNote")}</p>
        {site ? (
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void openExternal(site)}>
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("website")}
          </button>
        ) : (
          <p className="hint mt-2">{t("noWebsite")}</p>
        )}
      </section>
      <section className="card mb-4 p-6">
        <h2 className="mb-2 font-semibold">{t("privacy")}</h2>
        <p className="text-sm text-muted">{t("privacyText")}</p>
      </section>
      <section className="card p-6">
        <h2 className="mb-2 font-semibold">{t("credits")}</h2>
        <p className="text-sm text-muted">{t("creditsText")}</p>
      </section>
    </div>
  );
}
