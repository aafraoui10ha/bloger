"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { ToolIconView } from "@/components/icons";
import type { DesktopTool } from "../catalog";
import { favoritesStore, toggleFavorite, type Locale } from "../shell/store";

export function FavoriteButton({ toolKey, className = "" }: { toolKey: string; className?: string }) {
  const t = useTranslations("desktop.tool");
  const favorites = favoritesStore.use();
  const on = favorites.includes(toolKey);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t("unfavorite") : t("favorite")}
      title={on ? t("unfavorite") : t("favorite")}
      className={`grid size-9 place-items-center rounded-lg hover:bg-surface-2 ${on ? "text-accent-2" : "text-muted"} ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(toolKey);
      }}
    >
      <Star className={`size-4 ${on ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}

export function ToolCard({ tool }: { tool: DesktopTool }) {
  const locale = useLocale() as Locale;
  return (
    <Link href={`/tool/${tool.key}/`} className="card card-hover group relative flex gap-3 p-4" data-tool={tool.key}>
      <span className="icon-tile size-10 shrink-0">
        <ToolIconView name={tool.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{tool.title[locale]}</span>
        <span className="mt-1 line-clamp-2 block text-sm text-muted">{tool.short[locale]}</span>
      </span>
      <FavoriteButton toolKey={tool.key} className="-me-2 -mt-2 shrink-0" />
    </Link>
  );
}

export function ToolGrid({ tools }: { tools: DesktopTool[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((t) => (
        <ToolCard key={t.key} tool={t} />
      ))}
    </div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
