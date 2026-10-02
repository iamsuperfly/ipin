"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Avatar } from "@/components/Avatar";
import { supabaseBrowser } from "@/lib/supabase";
import { shortAddr } from "@/lib/format";

type WalletRow = { id: string; address: string; is_active: boolean };

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [pic, setPic] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [note, setNote] = useState("");

  async function refresh() {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    if (!data.user) return;
    const row = await supabase.from("profiles").select("display_name,avatar_url").eq("id", data.user.id).maybeSingle();
    const meta = data.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
    setName(row.data?.display_name || meta.full_name || meta.name || "");
    setPic(row.data?.avatar_url || meta.avatar_url || meta.picture || null);
    const rows = await supabase.from("wallets").select("id,address,is_active").order("created_at");
    setWallets((rows.data as WalletRow[]) ?? []);
  }

  useEffect(() => { void refresh(); }, []);

  async function google() {
    if (!supabase) {
      setNote("Sign-in is not configured.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function saveName() {
    if (!supabase || !user) return;
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, display_name: name });
    setNote("Name saved.");
  }

  async function onFile(file: File) {
    if (!supabase || !user) return;
    const path = `${user.id}/avatar`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setNote("Run supabase/002_profile.sql, then try the picture again.");
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const stamped = `${url}?v=${Date.now()}`;
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, avatar_url: stamped });
    setPic(stamped);
    setNote("Picture saved.");
  }

  async function attach() {
    if (!supabase || !address || !user) return;
    const active = wallets.length === 0;
    await supabase.from("wallets").upsert({ account_id: user.id, address: address.toLowerCase(), is_active: active }, { onConflict: "account_id,address" });
    await refresh();
  }

  async function makeActive(id: string) {
    if (!supabase || !user) return;
    await supabase.from("wallets").update({ is_active: false }).eq("account_id", user.id);
    await supabase.from("wallets").update({ is_active: true }).eq("id", id);
    await refresh();
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-5 pb-24 pt-16">
        <h1 className="text-4xl font-bold">Sign in</h1>
        <button type="button" className="btn-primary mt-6 w-full" onClick={google}>Continue with Google</button>
        {note && <p className="mt-3 text-sm text-mute">{note}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <div className="flex items-center gap-4">
        <Avatar name={name || user.email || "I"} src={pic} size={72} />
        <div>
          <h1 className="text-4xl font-bold">{name || "Profile"}</h1>
          <p className="text-mute">{user.email}</p>
        </div>
      </div>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <label className="block text-sm text-mute">Picture
          <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <label className="block text-sm text-mute">Name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
        </label>
        <button type="button" className="btn-primary w-full" onClick={saveName}>Save profile</button>
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
