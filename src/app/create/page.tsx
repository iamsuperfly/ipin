"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeEventLog, isAddress } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ipinAbi } from "@/lib/abi";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { tokenAddress, type PotToken } from "@/lib/tokens";

type Row = { address: string; share: string };

export default function CreatePage() {
  const router = useRouter();
  const contract = ipinAddress();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [token, setToken] = useState<PotToken>("USDC");
  const [rows, setRows] = useState<Row[]>([
    { address: "", share: "50" },
    { address: "", share: "50" },
  ]);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: waiting } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!receipt) return;
    const created = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({ abi: ipinAbi, data: log.data, topics: log.topics });
        } catch {
          return null;
        }
      })
      .find((e) => e && e.eventName === "PotCreated");
    if (created && created.eventName === "PotCreated") {
      router.replace(`/pot/${String(created.args.id)}`);
    }
  }, [receipt, router]);

  function submit() {
    if (!contract) return;
    const members = rows.map((r) => r.address.trim());
    const shares = rows.map((r) => BigInt(r.share || "0"));
    if (!name.trim()) return;
    if (members.some((m) => !isAddress(m))) return;
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "createPot",
      args: [name.trim(), tokenAddress(token), members as `0x${string}`[], shares],
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Create a pot</h1>
      <p className="mt-3 text-mute">One currency per pot. You own this pot only.</p>

      {!contract && (
        <p className="mt-6 rounded-2xl border border-laterite/30 bg-panel px-4 py-3 text-sm">
          Set NEXT_PUBLIC_IPIN_ADDRESS after Remix deploy (constructor now needs USDC and EURC).
        </p>
      )}

      <div className="mt-8 space-y-5 rounded-3xl border border-ink/10 bg-panel p-6">
        <label className="block">
          <span className="text-sm text-mute">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Night crew"
            className="mt-2 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 outline-none focus:border-laterite"
          />
        </label>

        <fieldset>
          <legend className="text-sm text-mute">Currency</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["USDC", "EURC"] as PotToken[]).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setToken(sym)}
                className={`h-12 rounded-2xl border text-sm font-medium ${
                  token === sym ? "border-laterite bg-laterite/10" : "border-ink/15 bg-ground"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </fieldset>

        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem_auto]">
            <input
              value={row.address}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, address: e.target.value };
                setRows(next);
              }}
              placeholder="0x member"
              className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite"
            />
            <input
              value={row.share}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, share: e.target.value };
                setRows(next);
              }}
              inputMode="numeric"
              placeholder="Share"
              className="h-12 rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite"
            />
            <button
              type="button"
              className="btn-ghost h-12 px-4"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              disabled={rows.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}

        <button type="button" className="btn-ghost w-full" onClick={() => setRows([...rows, { address: "", share: "1" }])}>
          Add member
        </button>

        {isConnected ? (
          <button type="button" className="btn-primary w-full" onClick={submit} disabled={!contract || isPending || waiting}>
            {isPending || waiting ? "Cutting the pot…" : "Create pot"}
          </button>
        ) : (
          <ConnectButton className="w-full" />
        )}
        {error && <p className="text-sm text-danger">{writeErrorText(error)}</p>}
      </div>
    </main>
  );
}
