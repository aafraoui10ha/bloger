"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

export function MobileMenu({ items, labels }: { items: { href: string; label: string; external: boolean }[]; labels: { open: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close on navigation
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="btn-ghost size-10 p-0"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>
      {open && (
        <nav id="mobile-nav" className="band absolute inset-x-0 top-16 z-40 border-b border-border">
          <ul className="container-page flex flex-col py-2">
            {items.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a href={item.href} rel="noopener noreferrer" className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-surface-2">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-surface-2">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
