"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export function AdminNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [path, query] = href.split("?");
  const kindMatch = query ? search.toString().includes(query) : !search.get("kind");
  const active = (path === "/admin" ? pathname === "/admin" : pathname.startsWith(path!)) && kindMatch;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
    >
      {children}
    </Link>
  );
}
