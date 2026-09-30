"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "./ConnectButton";
import { FAUCET, EXPLORER } from "@/lib/chain";

const DESKTOP_LINKS = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create pot" },
];

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create pot" },
  { href: FAUCET, label: "Get testnet USDC", external: true },
  { href: EXPLORER, label: "Explorer", external: true },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 overflow-x-hidden border-b border-ink/10">
        <div className="bg-ground/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:h-[4.25rem] sm:gap-4 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <img src="/logo/logo.svg" alt="" className="hidden h-8 w-8 sm:h-9 sm:w-9" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <ShareMark />
              <span className="truncate font-display text-xl tracking-tight sm:text-2xl">Ipin</span>
            </Link>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
              {DESKTOP_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-ink/80 transition hover:text-laterite">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <ConnectButton />
            </div>

            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <ConnectButton className="h-11 min-w-[3.25rem] px-3 text-sm sm:px-4" />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-panel"
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="sr-only">Menu</span>
                <span className="relative block h-3.5 w-5">
                  <span className={`absolute left-0 h-0.5 w-5 bg-ink transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
                  <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-ink transition ${open ? "opacity-0" : "opacity-100"}`} />
                  <span className={`absolute left-0 h-0.5 w-5 bg-ink transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[80] overflow-hidden lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none invisible"}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-ground/70 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
        <div
          id="mobile-menu"
          className={`absolute right-0 top-0 flex h-full w-[min(22rem,88vw)] flex-col bg-panel shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <span className="font-display text-xl">Menu</span>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-4" aria-label="Mobile">
            {MENU_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium hover:bg-ground/40"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium hover:bg-ground/40"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

function ShareMark() {
  return (
    <svg className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#2A1C12" />
      <path d="M7 22h18v2H7zm2-3h3V10H9zm5.5 0h3V8h-3zM20 19h3V12h-3z" fill="#C45C26" />
    </svg>
  );
}
