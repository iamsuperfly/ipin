"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { erc20Abi, ipinAbi } from "@/lib/abi";
import { USDC, explorerAddress, explorerTx } from "@/lib/chain";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { formatUsdc, parseUsdc, shortAddr } from "@/lib/format";

export default function PotPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id || "0");
  const contract = ipinAddress();
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("1");

  const pot = useReadContract({
    address: contract,
    abi: ipinAbi,
    functionName: "pots",
    args: [id],
    query: { enabled: Boolean(contract && params.id) },
  });

  const roster = useReadContract({
    address: contract,
    abi: ipinAbi,
    functionName: "membersOf",
    args: [id],
    query: { enabled: Boolean(contract && params.id) },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    pot.refetch();
    roster.refetch();
  }, [isSuccess, pot, roster]);

  const busy = isPending || waiting;
  const data = pot.data;
  const owner = data?.[0];
  const name = data?.[1];
  const totalShares = data?.[3] ?? 0n;
  const round = data?.[4] ?? 0;
  const balance = data?.[5] ?? 0n;
  const isOwner = Boolean(address && owner && address.toLowerCase() === owner.toLowerCase());

  const members = roster.data?.[0] ?? [];
  const shares = roster.data?.[1] ?? [];
  const paidFlags = roster.data?.[2] ?? [];

  function fund() {
    if (!contract) return;
    const units = parseUsdc(amount);
    writeContract({
      address: USDC,
      abi: erc20Abi,
      functionName: "approve",
      args: [contract, units],
    });
  }

  function deposit() {
    if (!contract) return;
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "fund",
      args: [id, parseUsdc(amount)],
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
      <p className="text-sm text-laterite">Pot {params.id} · round {String(round)}</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{name || "…"}</h1>
      <p className="mt-2 text-mute">
        Owner{" "}
        {owner && (
          <a className="font-mono text-ink hover:text-laterite" href={explorerAddress(owner)} target="_blank" rel="noreferrer">
            {shortAddr(owner)}
          </a>
        )}
      </p>

      <div className="mt-8 rounded-3xl border border-ink/10 bg-panel p-6">
        <p className="text-sm text-mute">In the pot</p>
        <p className="font-display text-5xl tabular-nums">{formatUsdc(balance as bigint)} USDC</p>
      </div>

      <section className="mt-8 space-y-3">
        {members.map((m, i) => {
          const sh = shares[i] ?? 0n;
          const pct = totalShares === 0n ? 0 : Number((sh * 1000n) / totalShares) / 10;
          const done = paidFlags[i];
          return (
            <div key={m} className="rounded-2xl border border-ink/10 bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <a className="font-mono text-sm hover:text-laterite" href={explorerAddress(m)} target="_blank" rel="noreferrer">
                  {shortAddr(m)}
                </a>
                {done ? <span className="stamp text-sm font-semibold">paid</span> : <span className="text-sm text-mute">unpaid</span>}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ground">
                <div className="h-full bg-laterite" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-mute">
                <span>{pct}% · {String(sh)} shares</span>
                {isOwner && !done && (
                  <button
                    type="button"
                    className="btn-ghost h-11 px-4 text-sm"
                    disabled={busy}
                    onClick={() =>
                      contract &&
                      writeContract({
                        address: contract,
                        abi: ipinAbi,
                        functionName: "pay",
                        args: [id, m],
                      })
                    }
                  >
                    Pay this share
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-ink/10 bg-panel p-6">
        <h2 className="font-display text-2xl">Pour USDC in</h2>
        <p className="mt-1 text-sm text-mute">Approve first, then fund. Two clicks. Testnet only.</p>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite"
        />
        {isConnected ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-ghost w-full" disabled={busy || !contract} onClick={fund}>
              Approve
            </button>
            <button type="button" className="btn-primary w-full" disabled={busy || !contract} onClick={deposit}>
              Fund pot
            </button>
          </div>
        ) : (
          <ConnectButton className="mt-4 w-full" />
        )}
      </section>

      {isOwner && (
        <button
          type="button"
          className="btn-primary mt-6 w-full"
          disabled={busy || !contract}
          onClick={() =>
            contract &&
            writeContract({
              address: contract,
              abi: ipinAbi,
              functionName: "payAll",
              args: [id],
            })
          }
        >
          Cut every unpaid share
        </button>
      )}

      {hash && (
        <a className="mt-4 inline-block font-mono text-sm text-laterite" href={explorerTx(hash)} target="_blank" rel="noreferrer">
          View transaction
        </a>
      )}
      {error && <p className="mt-3 text-sm text-danger">{writeErrorText(error)}</p>}
    </main>
  );
}
