"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Inline script that applies the saved theme before first paint (prevents a flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export function ThemeToggle({ labels }: { labels: { theme: string; light: string; dark: string; system: string } }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from storage after hydration
      setTheme((localStorage.getItem("theme") as Theme) || "system");
    } catch {}
  }, []);

  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = { light: labels.light, dark: labels.dark, system: labels.system }[theme];

  return (
    <button
      type="button"
      className="btn-ghost size-10 p-0"
      aria-label={`${labels.theme}: ${label}`}
      title={`${labels.theme}: ${label}`}
      onClick={() => {
        const n = next[theme];
        setTheme(n);
        try {
          localStorage.setItem("theme", n);
        } catch {}
        applyTheme(n);
      }}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
