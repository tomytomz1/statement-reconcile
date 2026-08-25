"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The small-viewport navigation.
 *
 * Below `md` the header previously rendered no navigation at all — the desktop list was
 * simply hidden, leaving the wordmark and the CTA. That is fine for a visitor who lands on
 * the homepage and converts, and useless for one who wants to read the security page on a
 * phone before trusting the tool with a bank statement.
 */
export function MobileNav({ items }: { items: ReadonlyArray<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // A client-side navigation re-renders the header without unmounting it, so the panel would
  // otherwise stay open over the page the visitor just asked for. Adjusting during render
  // rather than in an effect: React re-runs this component immediately with the new state and
  // never commits the stale open panel, so there is no flash of the menu over the new page.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (pathname !== renderedPath) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="text-ink-700 hover:bg-ink-50 hover:text-ink-950 flex size-10 items-center justify-center rounded-md transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          className="border-ink-200 absolute inset-x-0 top-16 border-b bg-white shadow-sm"
        >
          <nav aria-label="Main" className="flex flex-col px-4 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-ink-700 hover:bg-ink-50 hover:text-ink-950 rounded-md px-3 py-3 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
