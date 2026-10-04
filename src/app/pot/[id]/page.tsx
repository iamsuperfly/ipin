"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { erc20Abi, ipinAbi } from "@/lib/abi";
import { explorerAddress, explorerTx } from "@/lib/chain";
import { ipinAddress } from "@/lib/contract";
import { writeErrorText } from "@/lib/errors";
import { formatUsdc, parseUsdc, shortAddr } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase";
import { USDC, tokenSymbol } from "@/lib/tokens";

export default function PotPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id || "0");
  const contract = ipinAddress();
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [action, setAction] = useState("");

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
  const walletUsdc = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const allowance = useReadContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && contract ? [address, contract] : undefined,
    query: { enabled: Boolean(address && contract) },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess || !hash || !contract) return;
    pot.refetch();
    roster.refetch();
    walletUsdc.refetch();
    allowance.refetch();
    if (action === "approve") {
      setAction("fund");
      setNote("Approved. Confirm the fund in the wallet.");
      writeContract({
        address: contract,
        abi: ipinAbi,
        functionName: "fund",
        args: [id, parseUsdc(amount)],
      });
      return;
    }
    if (action === "fund") {
      setNote("Fund sent. The balance updates when Arc confirms.");
      return;
    }
    if (action !== "pay") return;
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const campaign = await sb.from("campaigns").select("id,pool_amount").eq("pot_id", Number(id)).maybeSingle();
      const saved = campaign.data;
      if (!saved?.id) return;
      const members = roster.data?.[0] ?? [];
      const shares = roster.data?.[1] ?? [];
      const total = shares.reduce((sum, share) => sum + BigInt(share), 0n);
      const pool = BigInt(Math.round(Number(saved.pool_amount) * 1_000_000));
      if (members.length && total > 0n) {
        await sb.from("allocations").insert(members.map((member, i) => ({
          campaign_id: saved.id,
          recipient: member.toLowerCase(),
          amount: Number(formatUsdc((pool * BigInt(shares[i])) / total)),
          tx_hash: hash,
          paid: true,
        })));
      }
      await sb.from("distributions").insert({
        account_id: data.user.id,
        campaign_id: saved.id,
        pot_id: Number(id),
        gross: saved.pool_amount,
        fee: 0,
        tx_hash: hash,
        status: "done",
      });
      await sb.from("campaigns").update({ status: "done" }).eq("id", saved.id);
    });
  }, [isSuccess, hash, action, amount, contract, id, pot, roster, walletUsdc, allowance]);

  const busy = isPending || waiting;
  const data = pot.data;
  const owner = data?.[0];
  const name = data?.[1];
  const token = data?.[2];
  const totalShares = data?.[4] ?? 0n;
  const round = data?.[5] ?? 0;
  const balance = (data?.[6] ?? 0n) as bigint;
  const symbol = tokenSymbol(token);
  const isOwner = Boolean(address && owner && address.toLowerCase() === owner.toLowerCase());
  const walletBalance = (walletUsdc.data ?? 0n) as bigint;
  const canPay = balance > 0n;
  const members = roster.data?.[0] ?? [];
  const shares = roster.data?.[1] ?? [];
  const paidFlags = roster.data?.[2] ?? [];

  function fundOnce() {
    if (!contract || !token) return;
    const units = parseUsdc(amount);
    if (units === 0n) {
      setNote("Enter an amount first.");
      return;
    }
    if (walletBalance < units) {
      setNote("The wallet does not have enough USDC on Arc.");
      return;
    }
    const allowed = (allowance.data ?? 0n) as bigint;
    if (allowed < units) {
      setAction("approve");
      setNote("Confirm the approval. The fund is the next wallet prompt.");
      writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [contract, units],
      });
      return;
    }
    setAction("fund");
    setNote("Confirm the fund in the wallet.");
    writeContract({
      address: contract,
      abi: ipinAbi,
      functionName: "fund",
      args: [id, units],
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <p className="text-sm text-laterite">Distribution {params.id} · round {String(round)} · {symbol}</p>
      <h1 className="mt-2 text-4xl font-bold">{name || "Distribution"}</h1>
      <p className="mt-2 text-mute">
        Owner{" "}
        {owner && (
          <a className="font-mono text-ink hover:text-laterite" href={explorerAddress(owner)} target="_blank" rel="noreferrer">
            {shortAddr(owner)}
          </a>
        )}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-ink/10 bg-panel p-6">
          <p className="text-sm text-mute">In the distribution</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{formatUsdc(balance)} {symbol}</p>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-panel p-6">
          <p className="text-sm text-mute">Your USDC on Arc</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{isConnected ? formatUsdc(walletBalance) : "-"} USDC</p>
        </div>
      </div>
      <section className="mt-8 space-y-3">
        {members.map((m, i) => {
          const sh = shares[i] ?? 0n;
          const pct = totalShares === 0n ? 0 : Number((sh * 1000n) / totalShares) / 10;
          const done = paidFlags[i];
          return (
            <div key={m} className="rounded-2xl border border-ink/10 bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <a className="font-mono text-sm hover:text-laterite" href={explorerAddress(m)} target="_blank" rel="noreferrer">{shortAddr(m)}</a>
                {done ? <span className="text-sm font-semibold text-laterite">Paid</span> : <span className="text-sm text-mute">Unpaid</span>}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ground"><div className="h-full bg-laterite" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-sm text-mute">{pct}%</p>
            </div>
          );
        })}
      </section>
      <section className="mt-8 rounded-3xl border border-ink/10 bg-panel p-6">
        <h2 className="text-2xl font-bold">Fund</h2>
        <p className="mt-1 text-sm text-mute">Rabby needs two confirms. First the approval, then the fund. Pay stays off until Arc shows a balance.</p>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        {isConnected ? (
          <button type="button" className="btn-primary mt-4 w-full" disabled={busy || !contract} onClick={fundOnce}>
            {busy ? "Confirm in the wallet" : "Approve and fund"}
          </button>
        ) : <ConnectButton className="mt-4 w-full" />}
        {note && <p className="mt-3 text-sm text-mute">{note}</p>}
        <Link href={`/bridge?pot=${params.id}`} className="mt-4 inline-block text-sm text-laterite">USDC is on another chain</Link>
      </section>
      {isOwner && (
        <button type="button" className="btn-primary mt-6 w-full" disabled={busy || !contract || !canPay} onClick={() => {
          setAction("pay");
          contract && writeContract({ address: contract, abi: ipinAbi, functionName: "payAll", args: [id] });
        }}>
          {canPay ? "Pay everyone" : "Pay everyone after it is funded"}
        </button>
      )}
      {hash && <a className="mt-4 inline-block font-mono text-sm text-laterite" href={explorerTx(hash)} target="_blank" rel="noreferrer">View transaction</a>}
      {error && <p className="mt-3 text-sm text-danger">{writeErrorText(error)}</p>}
    </main>
  );
}
