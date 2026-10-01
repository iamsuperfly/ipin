"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "./ConnectButton";
import { BrandLogo } from "./BrandLogo";
import { FAUCET, EXPLORER } from "@/lib/chain";

const DESKTOP_LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "App" },
  { href: "/distribute", label: "Distribute" },
  { href: "/bridge", label: "Bridge USDC" },
  { href: "/account", label: "Account" },
];

const MENU_LINKS = [
  ...DESKTOP_LINKS.map((l) => ({ ...l, external: false })),
  { href: FAUCET, label: "Faucet", external: true },
  { href: EXPLORER, label: "Explorer", external: true },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-ground/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo />
            <span className="font-display text-xl sm:text-2xl">Ipin</span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {DESKTOP_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-ink/80 hover:text-laterite">{link.label}</Link>
            ))}
          </nav>
          <div className="hidden lg:block"><ConnectButton /></div>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>☰</button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" className="absolute inset-0 bg-ground/70" aria-label="Close" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-0 flex h-full w-[min(22rem,88vw)] flex-col gap-1 bg-panel px-5 py-6">
            {MENU_LINKS.map((link) => link.external ? (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="flex min-h-12 items-center" onClick={() => setOpen(false)}>{link.label}</a>
            ) : (
              <Link key={link.href} href={link.href} className="flex min-h-12 items-center" onClick={() => setOpen(false)}>{link.label}</Link>
            ))}
            <ConnectButton className="mt-4 w-full" />
          </nav>
        </div>
      )}
    </>
  );
}
