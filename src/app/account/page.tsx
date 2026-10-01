"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { supabaseBrowser } from "@/lib/supabase";
import { shortAddr } from "@/lib/format";

type WalletRow = { id: string; address: string; is_active: boolean };

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [email, setEmail] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [note, setNote] = useState("");

  async function refresh() {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email ?? null);
    if (!data.user) return;
    const rows = await supabase.from("wallets").select("id,address,is_active").order("created_at");
    setWallets((rows.data as WalletRow[]) ?? []);
  }

  useEffect(() => { void refresh(); }, []);

  async function google() {
    if (!supabase) {
      setNote("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then enable Google.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function attach() {
    if (!supabase || !address) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setNote("Sign in with Google first.");
    const active = wallets.length === 0;
    await supabase.from("wallets").upsert({ account_id: data.user.id, address: address.toLowerCase(), is_active: active }, { onConflict: "account_id,address" });
    await refresh();
  }

  async function makeActive(id: string) {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("wallets").update({ is_active: false }).eq("account_id", data.user.id);
    await supabase.from("wallets").update({ is_active: true }).eq("id", id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-5xl">Account</h1>
      <p className="mt-3 text-mute">Google is the identity. Wallets attach to it. One is active.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <p>{email ? email : "Not signed in"}</p>
        <button type="button" className="btn-primary w-full" onClick={google}>Continue with Google</button>
        {isConnected ? (
          <button type="button" className="btn-ghost w-full" onClick={() => disconnect()}>Disconnect {shortAddr(address)}</button>
        ) : (
          <button type="button" className="btn-ghost w-full" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>Connect wallet</button>
        )}
        <button type="button" className="btn-ghost w-full" onClick={attach} disabled={!isConnected}>Attach connected wallet</button>
        {note && <p className="text-sm text-mute">{note}</p>}
      </div>
      <ul className="mt-6 space-y-3">
        {wallets.map((w) => (
          <li key={w.id} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-panel px-4 py-3">
            <span className="font-mono text-sm">{shortAddr(w.address)}</span>
            {w.is_active ? <span className="text-sm text-laterite">Active</span> : (
              <button type="button" className="btn-ghost h-11 px-4 text-sm" onClick={() => makeActive(w.id)}>Make active</button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
