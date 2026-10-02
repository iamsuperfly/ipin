"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FAUCET } from "@/lib/chain";
import { ipinAddress } from "@/lib/contract";

export default function AppHome() {
  const router = useRouter();
  const [id, setId] = useState("");
  const deployed = Boolean(ipinAddress());

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
      <p className="text-sm text-laterite">App · Arc testnet · USDC</p>
      <h1 className="mt-2 font-display text-5xl">Distributions</h1>
      <p className="mt-3 text-mute">Create a cut, fund it, pay each address once. EURC stays in the contract and off this screen.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/distribute" className="btn-primary w-full sm:w-auto">New distribution</Link>
        <Link href="/account" className="btn-ghost w-full sm:w-auto">Account</Link>
        <a href={FAUCET} className="btn-ghost w-full sm:w-auto" target="_blank" rel="noreferrer">Faucet</a>
      </div>
      {!deployed && <p className="mt-6 text-sm text-mute">Set NEXT_PUBLIC_IPIN_ADDRESS after the two-argument Remix deploy.</p>}
      <form className="mt-10 rounded-3xl border border-ink/10 bg-panel p-6" onSubmit={(e) => { e.preventDefault(); if (id.trim()) router.push(`/pot/${id.trim()}`); }}>
        <label className="font-display text-xl">Open an existing pot</label>
        <input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" placeholder="Pot number" className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        <button type="submit" className="btn-primary mt-4 w-full">Open</button>
      </form>
    </main>
  );
}
