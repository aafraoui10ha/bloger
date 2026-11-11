"use client";

// Small persistent stores (localStorage, which lives in the app's WebView2 profile
// and survives restarts and updates). Read through useSyncExternalStore so the
// pre-rendered static HTML and the user's saved settings never cause a hydration error.
import { useSyncExternalStore } from "react";

export type Locale = "en" | "fr" | "ar";
export type Theme = "system" | "light" | "dark";
export type Settings = { locale: Locale; theme: Theme };

export const SETTINGS_KEY = "toolbox:settings";
const FAVORITES_KEY = "toolbox:favorites";
const RECENTS_KEY = "toolbox:recent-tools";
export const MAX_RECENTS = 8;

/** First launch: follow the system language when it is one we support. */
export function systemLocale(languages: readonly string[] = typeof navigator !== "undefined" ? navigator.languages : []): Locale {
  for (const l of languages) {
    const base = l.toLowerCase().split("-")[0];
    if (base === "ar" || base === "fr" || base === "en") return base;
  }
  return "en";
}

function read<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v: unknown = JSON.parse(raw);
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function createStore<T>(key: string, initial: () => T, serverValue: T, valid: (v: unknown) => v is T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;
  const get = () => (cache ??= read(key, initial(), valid));
  const set = (next: T) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage unavailable: keep the value for this session.
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, get, () => serverValue);
  return { get, set, use, subscribe };
}

const isSettings = (v: unknown): v is Settings =>
  !!v && typeof v === "object" && ["en", "fr", "ar"].includes((v as Settings).locale) && ["system", "light", "dark"].includes((v as Settings).theme);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

export const DEFAULT_SETTINGS: Settings = { locale: "en", theme: "system" };
export const settingsStore = createStore<Settings>(SETTINGS_KEY, () => ({ locale: systemLocale(), theme: "system" }), DEFAULT_SETTINGS, isSettings);
const EMPTY: string[] = [];
export const favoritesStore = createStore<string[]>(FAVORITES_KEY, () => [], EMPTY, isStringList);
export const recentsStore = createStore<string[]>(RECENTS_KEY, () => [], EMPTY, isStringList);

export function toggleFavorite(key: string) {
  const list = favoritesStore.get();
  favoritesStore.set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
}

export function addRecent(key: string) {
  recentsStore.set([key, ...recentsStore.get().filter((k) => k !== key)].slice(0, MAX_RECENTS));
}

/** Inline script for <head>: applies language, direction and theme before the first paint. */
export const settingsInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${SETTINGS_KEY}')||'null');var l=s&&s.locale;if(l!=='en'&&l!=='fr'&&l!=='ar'){var n=(navigator.languages||[]).map(function(x){return x.toLowerCase().split('-')[0]});l=n.find(function(x){return x==='ar'||x==='fr'||x==='en'})||'en'}var d=document.documentElement;d.lang=l;d.dir=l==='ar'?'rtl':'ltr';var t=(s&&s.theme)||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')}catch(e){}})();`;
