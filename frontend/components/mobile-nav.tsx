"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Blog", href: "/blog" },
  { label: "Instagram", href: "/download-instagram-reels" },
  { label: "Facebook", href: "/download-facebook-video" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on route change / ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="relative md:hidden" ref={menuRef}>
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card/80 text-muted-foreground transition hover:text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border bg-card/95 p-2 shadow-soft backdrop-blur-md animate-fade-in-up">
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <div className="mx-4 my-1 border-t border-border/60" />
            <Link
              href="/#downloader"
              onClick={() => setOpen(false)}
              className="mx-2 mb-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
            >
              Try Free
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
