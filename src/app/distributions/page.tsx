"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

type Row = { id: string; name: string; pool_amount: number; status: string; pot_id: number | null };

function RowCard({ row }: { row: Row }) {
  const body = (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium">{row.name}</span>
      <span className="font-mono text-sm">{row.pool_amount} USDC</span>
    </div>
  );
  if (!row.pot_id) {
    return (
      <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
        {body}
        <p className="mt-2 text-sm text-mute">Not on Arc yet. Create it again to fund and pay.</p>
      </li>
    );
  }
  return (
    <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
      <Link href={`/pot/${row.pot_id}`}>{body}</Link>
    </li>
  );
}

export default function DistributionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const list = await sb.from("campaigns").select("id,name,pool_amount,status,pot_id").order("created_at", { ascending: false });
      if (list.error) setNote("Couldn't load your distributions. Try again.");
      setRows((list.data as Row[]) ?? []);
    });
  }, []);

  const waiting = rows.filter((r) => r.status !== "done");
  const done = rows.filter((r) => r.status === "done");

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-bold">Distributions</h1>
        <Link href="/distribute" className="btn-primary h-11 shrink-0 px-4 text-sm">Create</Link>
      </div>
      <section className="mt-8">
        <p className="text-sm text-mute">Waiting</p>
        <ul className="mt-3 space-y-3">
          {waiting.length === 0 && <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4 text-sm text-mute">Nothing waiting.</li>}
          {waiting.map((r) => <RowCard key={r.id} row={r} />)}
        </ul>
      </section>
      <section className="mt-8">
        <p className="text-sm text-mute">Done</p>
        <ul className="mt-3 space-y-3">
          {done.length === 0 && <li className="rounded-2xl border border-ink/10 bg-panel px-4 py-4 text-sm text-mute">None completed yet.</li>}
          {done.map((r) => <RowCard key={r.id} row={r} />)}
        </ul>
      </section>
      {note && <p className="mt-4 text-sm text-mute">{note}</p>}
    </main>
  );
}
