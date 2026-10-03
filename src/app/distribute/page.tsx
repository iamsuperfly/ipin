"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ipinAbi } from "@/lib/abi";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { quoteFee } from "@/lib/fee";
import { formatUsdc, parseUsdc } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase";
import { USDC } from "@/lib/tokens";

type Row = { address: string; amount: string; edited: boolean };

function split(total: string, rows: Row[]): Row[] {
  const people = rows.length || 1;
  const base = parseUsdc(total || "0");
  const each = base / BigInt(people);
  const remainder = base - each * BigInt(people);
  return rows.map((row, i) => {
    if (row.edited) return row;
    const share = each + (i === 0 ? remainder : 0n);
    return { ...row, amount: formatUsdc(share) };
  });
}

export default function DistributePage() {
  const contract = ipinAddress();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [total, setTotal] = useState("100");
  const [rows, setRows] = useState<Row[]>([{ address: "", amount: "50", edited: false }, { address: "", amount: "50", edited: false }]);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  const even = useMemo(() => split(total, rows), [total, rows]);
  const pool = useMemo(() => even.reduce((sum, row) => sum + parseUsdc(row.amount || "0"), 0n), [even]);
  const quote = quoteFee(0n, pool);

  function add() {
    setRows(split(total, [...rows, { address: "", amount: "0", edited: false }]));
  }

  async function submit() {
    if (!contract || !name.trim()) return;
    const members = even.map((r) => r.address.trim());
    if (members.some((m) => !isAddress(m))) return;
    const shares = even.map((r) => parseUsdc(r.amount || "0"));
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "createPot",
      args: [name.trim(), USDC, members as `0x${string}`[], shares],
    });
    const sb = supabaseBrowser();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (sb && user) {
      await sb.from("campaigns").insert({ account_id: user.id, name: name.trim(), pool_amount: Number(formatUsdc(pool)), status: "waiting" });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="text-4xl font-bold">Create a distribution</h1>
      <p className="mt-3 text-mute">The total splits equally. Change one amount if someone should get a different share.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="September rewards" className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
        <label className="block text-sm text-mute">Total USDC
          <input value={total} onChange={(e) => setTotal(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        </label>
        {even.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <input value={row.address} onChange={(e) => { const next = [...even]; next[i] = { ...row, address: e.target.value }; setRows(next); }} placeholder="0x recipient" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
            <input value={row.amount} onChange={(e) => { const next = [...even]; next[i] = { ...row, amount: e.target.value, edited: true }; setRows(next); }} className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={add}>Add recipient</button>
        <p className="text-sm text-mute">Recipients receive {formatUsdc(pool)} USDC. Fee on top: {formatUsdc(quote.fee)}. Fund that total from the distribution after it is created.</p>
        {isConnected ? (
          <button type="button" className="btn-primary w-full" disabled={!contract || isPending || isLoading} onClick={submit}>{isPending || isLoading ? "Creating\u2026" : "Create distribution"}</button>
        ) : <ConnectButton className="w-full" />}
        {isSuccess && <p className="text-sm text-mute">Created. It is now under Waiting. Open it to fund and pay.</p>}
        {error && <p className="text-sm text-danger">{writeErrorText(error)}</p>}
      </div>
    </main>
  );
}
