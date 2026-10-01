"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { FAUCET, EXPLORER } from "@/lib/chain";
import { supabaseBrowser } from "@/lib/supabase";

const PUBLIC_LINKS = [{ href: "/", label: "Home" }];
const APP_LINKS = [
  { href: "/app", label: "App" },
  { href: "/distribute", label: "Distribute" },
  { href: "/bridge", label: "Bridge USDC" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  const links = signedIn ? [...PUBLIC_LINKS, ...APP_LINKS] : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo />
          <span className="text-xl font-bold">IPIN</span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-ink/80 hover:text-laterite">{link.label}</Link>
          ))}
          {!signedIn && <Link href="/account" className="btn-primary h-11 px-4 text-sm">Sign in</Link>}
        </nav>
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>☰</button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-ink/10 px-5 py-4 lg:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-12 items-center" onClick={() => setOpen(false)}>{link.label}</Link>
          ))}
          {!signedIn && <Link href="/account" className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>Sign in</Link>}
          {signedIn && <a href={FAUCET} target="_blank" rel="noreferrer" className="flex min-h-12 items-center">Faucet</a>}
          {signedIn && <a href={EXPLORER} target="_blank" rel="noreferrer" className="flex min-h-12 items-center">Explorer</a>}
        </nav>
      )}
    </header>
  );
}
