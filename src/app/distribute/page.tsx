"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ipinAbi } from "@/lib/abi";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { quoteFee } from "@/lib/fee";
import { formatUsdc, parseUsdc } from "@/lib/format";
import { USDC } from "@/lib/tokens";

type Row = { address: string; amount: string };

export default function DistributePage() {
  const router = useRouter();
  const contract = ipinAddress();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([{ address: "", amount: "10" }, { address: "", amount: "10" }]);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });

  const pool = useMemo(() => rows.reduce((sum, row) => sum + parseUsdc(row.amount || "0"), 0n), [rows]);
  const quote = quoteFee(0n, pool);

  function submit() {
    if (!contract || !name.trim()) return;
    const members = rows.map((r) => r.address.trim());
    if (members.some((m) => !isAddress(m))) return;
    const shares = rows.map((r) => parseUsdc(r.amount || "0"));
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "createPot",
      args: [name.trim(), USDC, members as `0x${string}`[], shares],
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-5xl">New distribution</h1>
      <p className="mt-3 text-mute">USDC only. Amounts are the shares. Recipients are not reduced by the fee.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="September contributor rewards" className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite" />
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <input value={row.address} onChange={(e) => { const next = [...rows]; next[i] = { ...row, address: e.target.value }; setRows(next); }} placeholder="0x recipient" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite" />
            <input value={row.amount} onChange={(e) => { const next = [...rows]; next[i] = { ...row, amount: e.target.value }; setRows(next); }} placeholder="USDC" className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setRows([...rows, { address: "", amount: "1" }])}>Add recipient</button>
        <p className="text-sm text-mute">Recipients receive {formatUsdc(pool)} USDC. You send {formatUsdc(quote.organizerPays)} if this month is still inside the free allowance shown here. Fee on top: {formatUsdc(quote.fee)}.</p>
        {isConnected ? (
          <button type="button" className="btn-primary w-full" disabled={!contract || isPending || isLoading} onClick={submit}>{isPending || isLoading ? "Creating…" : "Create distribution"}</button>
        ) : <ConnectButton className="w-full" />}
        {hash && <p className="text-sm text-mute">Created. Open the pot from the app once the transaction confirms, then fund it.</p>}
        {error && <p className="text-sm text-danger">{writeErrorText(error)}</p>}
        <button type="button" className="btn-ghost w-full" onClick={() => router.push("/app")}>Back to app</button>
      </div>
    </main>
  );
}
