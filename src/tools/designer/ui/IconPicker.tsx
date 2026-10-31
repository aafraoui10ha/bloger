"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ICON_GROUPS } from "../icons";

export function IconPicker({ value, onPick, compact }: { value?: string; onPick: (name: string) => void; compact?: boolean }) {
  const t = useTranslations("designer.icons");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  return (
    <div className="space-y-2">
      <input type="search" className="input h-9 py-1 text-sm" placeholder={t("search")} aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className={`space-y-3 overflow-auto ${compact ? "max-h-56" : ""}`}>
        {Object.entries(ICON_GROUPS).map(([group, icons]) => {
          const names = Object.keys(icons).filter((n) => !query || n.includes(query) || t(`groups.${group}`).toLowerCase().includes(query));
          if (!names.length) return null;
          return (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold text-muted">{t(`groups.${group}`)}</p>
              <div className="grid grid-cols-6 gap-1">
                {names.map((n) => {
                  const Icon = icons[n]!;
                  return (
                    <button key={n} type="button" title={n} aria-label={n} aria-pressed={value === n} className={`grid aspect-square place-items-center rounded-md border ${value === n ? "border-accent-2 bg-accent-soft" : "border-transparent hover:bg-surface-2"}`} onClick={() => onPick(n)}>
                      <Icon className="size-5" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
