"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";

/** Locale-less path for each locale where the current page exists (null = unavailable). */
export type Alternates = Partial<Record<AppLocale, string | null>>;

const Ctx = createContext<{ value: Alternates | null; set: (v: Alternates | null) => void }>({ value: null, set: () => {} });

export function AlternatesProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<Alternates | null>(null);
  return <Ctx.Provider value={{ value, set }}>{children}</Ctx.Provider>;
}

/** Rendered by pages whose URLs differ per locale (localized slugs). */
export function RegisterAlternates({ value }: { value: Alternates }) {
  const { set } = useContext(Ctx);
  const key = JSON.stringify(value);
  useEffect(() => {
    set(JSON.parse(key) as Alternates);
    return () => set(null);
  }, [key, set]);
  return null;
}

export function useAlternates() {
  return useContext(Ctx).value;
}
