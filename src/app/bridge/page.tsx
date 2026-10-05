"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { encodeFunctionData, isAddress, type Address, type Hex } from "viem";
import { useAccount, useSendCalls, useSwitchChain, useWriteContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { erc20Abi } from "@/lib/abi";
import { arcTestnet, baseSepolia, sepolia } from "@/lib/chain";
import {
  CCTP_DOMAIN_BASE_SEPOLIA,
  CCTP_DOMAIN_SEPOLIA,
  MESSAGE_TRANSMITTER,
  TOKEN_MESSENGER,
  USDC_BASE_SEPOLIA,
  USDC_SEPOLIA,
  fetchAttestation,
  messageTransmitterAbi,
  tokenMessengerAbi,
  toBytes32Address,
} from "@/lib/cctp";
import { writeErrorText } from "@/lib/errors";
import { parseUsdc } from "@/lib/format";
import { sellStep } from "@/lib/sell";

export default function BridgePage() {
  const search = useSearchParams();
  const pot = search.get("pot") ?? "";
  const { address, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [source, setSource] = useState<"base" | "eth">("base");
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("Sell turns USDC on Base or Ethereum into USDC on Arc.");
  const { writeContract, isPending, error } = useWriteContract();
  const { sendCalls, isPending: batching, error: batchError } = useSendCalls();
  const step = sellStep("USDC", source);

  async function sell() {
    if (!address || step !== "sell") {
      setNote("This token has no route into Arc.");
      return;
    }
    const mintTo = address as Address;
    const sourceChain = source === "base" ? baseSepolia : sepolia;
    const burnToken = source === "base" ? USDC_BASE_SEPOLIA : USDC_SEPOLIA;
    const sourceDomain = source === "base" ? CCTP_DOMAIN_BASE_SEPOLIA : CCTP_DOMAIN_SEPOLIA;
    const units = parseUsdc(amount);
    setNote("Confirm the sell in the wallet.");
    try {
      await switchChain({ chainId: sourceChain.id });
      await sendCalls({
        chainId: sourceChain.id,
        calls: [
          {
            to: burnToken,
            data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [TOKEN_MESSENGER, units] }),
          },
          {
            to: TOKEN_MESSENGER,
            data: encodeFunctionData({
              abi: tokenMessengerAbi,
              functionName: "depositForBurn",
              args: [units, 26, toBytes32Address(mintTo), burnToken, toBytes32Address("0x0000000000000000000000000000000000000000"), 0n, 2000],
            }),
          },
        ],
      });
      setNote("Sold. USDC lands on Arc after Circle attests. If it does not show, the wallet did not send the transaction.");
    } catch {
      setNote("The wallet needs the approval first.");
      writeContract({
        chainId: sourceChain.id,
        address: burnToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOKEN_MESSENGER, units],
      });
    }
    void sourceDomain;
    void isAddress;
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Sell</h1>
      <p className="mt-3 text-mute">One slide. USDC on Base or Ethereum becomes the USDC balance on Arc.</p>
      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={`h-12 rounded-2xl border ${source === "base" ? "border-laterite" : "border-ink/15"}`} onClick={() => setSource("base")}>Base</button>
          <button type="button" className={`h-12 rounded-2xl border ${source === "eth" ? "border-laterite" : "border-ink/15"}`} onClick={() => setSource("eth")}>Ethereum</button>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite" />
        {isConnected ? (
          <button type="button" className="btn-primary w-full" disabled={isPending || batching} onClick={sell}>Sell</button>
        ) : (
          <ConnectButton className="w-full" />
        )}
        <p className="text-sm text-mute">{note}</p>
        {(error || batchError) && <p className="text-sm text-danger">{writeErrorText(error ?? batchError)}</p>}
        {pot && <Link href={`/pot/${pot}`} className="inline-block text-sm text-laterite">Back to distribution {pot}</Link>}
      </div>
    </main>
  );
}
