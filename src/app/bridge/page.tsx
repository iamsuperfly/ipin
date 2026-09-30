"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { encodeFunctionData, isAddress, type Address, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  useSendCalls,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
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

const STEPS = ["Pick source", "Approve + burn", "Wait for Circle", "Mint on Arc"];

export default function BridgePage() {
  const search = useSearchParams();
  const pot = search.get("pot") ?? "";
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [source, setSource] = useState<"base" | "eth">("base");
  const [amount, setAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState(0);
  const [burnHash, setBurnHash] = useState<Hex | undefined>();
  const [message, setMessage] = useState<Hex | undefined>();
  const [attestation, setAttestation] = useState<Hex | undefined>();
  const [status, setStatus] = useState("USDC only. Lands as USDC on Arc.");

  const sourceChain = source === "base" ? baseSepolia : sepolia;
  const burnToken = source === "base" ? USDC_BASE_SEPOLIA : USDC_SEPOLIA;
  const sourceDomain = source === "base" ? CCTP_DOMAIN_BASE_SEPOLIA : CCTP_DOMAIN_SEPOLIA;
  const mintTo = (isAddress(recipient) ? recipient : address) as Address | undefined;

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { sendCalls, isPending: batching, error: batchError } = useSendCalls();
  const { isSuccess: burnMined } = useWaitForTransactionReceipt({ hash: burnHash });

  const units = useMemo(() => parseUsdc(amount), [amount]);

  async function burn() {
    if (!mintTo) return;
    setStep(1);
    setStatus("Ask the wallet to approve TokenMessenger and burn.");
    try {
      await sendCalls({
        chainId: sourceChain.id,
        calls: [
          {
            to: burnToken,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [TOKEN_MESSENGER, units],
            }),
          },
          {
            to: TOKEN_MESSENGER,
            data: encodeFunctionData({
              abi: tokenMessengerAbi,
              functionName: "depositForBurn",
              args: [
                units,
                26,
                toBytes32Address(mintTo),
                burnToken,
                toBytes32Address("0x0000000000000000000000000000000000000000"),
                0n,
                2000,
              ],
            }),
          },
        ],
      });
      setStatus("Burn sent. If your wallet hid the hash, paste nothing — poll after you see the source tx.");
      setStep(2);
    } catch {
      setStatus("Wallet will not batch. Approve, then burn as two taps.");
      writeContract({
        chainId: sourceChain.id,
        address: burnToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOKEN_MESSENGER, units],
      });
    }
  }

  function burnOnly() {
    if (!mintTo) return;
    writeContract({
      chainId: sourceChain.id,
      address: TOKEN_MESSENGER,
      abi: tokenMessengerAbi,
      functionName: "depositForBurn",
      args: [
        units,
        26,
        toBytes32Address(mintTo),
        burnToken,
        toBytes32Address("0x0000000000000000000000000000000000000000"),
        0n,
        2000,
      ],
    });
    setBurnHash(hash);
    setStep(2);
  }

  async function poll() {
    const tx = burnHash ?? hash;
    if (!tx) {
      setStatus("Need the burn transaction hash. Run burn first.");
      return;
    }
    setStatus("Asking Circle Iris for the attestation…");
    for (let i = 0; i < 20; i++) {
      const msg = await fetchAttestation(sourceDomain, tx);
      if (msg?.message && msg.attestation && msg.attestation !== "PENDING") {
        setMessage(msg.message as Hex);
        setAttestation(msg.attestation as Hex);
        setStatus("Attested. Switch to Arc Testnet and mint.");
        setStep(3);
        return;
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    setStatus("Still pending. Wait a bit and poll again.");
  }

  function mint() {
    if (!message || !attestation) return;
    writeContract({
      chainId: arcTestnet.id,
      address: MESSAGE_TRANSMITTER,
      abi: messageTransmitterAbi,
      functionName: "receiveMessage",
      args: [message, attestation],
    });
    setStatus("Mint submitted on Arc. Then fund the pot with the landed USDC.");
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <h1 className="font-display text-4xl sm:text-5xl">Bring USDC to Arc</h1>
      <p className="mt-3 text-mute">
        Path A. USDC on Base Sepolia or Ethereum Sepolia becomes USDC on Arc. The steps stay on screen. One signature when the wallet batches.
      </p>

      <ol className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-2xl border px-3 py-2 text-sm ${
              i === step ? "border-laterite bg-laterite/10" : "border-ink/10 bg-panel text-mute"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-panel p-6">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={`h-12 rounded-2xl border ${source === "base" ? "border-laterite" : "border-ink/15"}`} onClick={() => setSource("base")}>
            Base Sepolia
          </button>
          <button type="button" className={`h-12 rounded-2xl border ${source === "eth" ? "border-laterite" : "border-ink/15"}`} onClick={() => setSource("eth")}>
            Eth Sepolia
          </button>
        </div>

        <p className="text-sm text-mute">Connected chain id {chainId}. Need {sourceChain.id} to burn, {arcTestnet.id} to mint.</p>
        <button type="button" className="btn-ghost w-full" onClick={() => switchChain({ chainId: sourceChain.id })}>
          Switch to {sourceChain.name}
        </button>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono outline-none focus:border-laterite"
        />
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Mint to (blank = you)"
          className="h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-sm outline-none focus:border-laterite"
        />

        {isConnected ? (
          <div className="grid gap-3">
            <button type="button" className="btn-primary w-full" disabled={isPending || batching} onClick={burn}>
              Approve and burn
            </button>
            <button type="button" className="btn-ghost w-full" disabled={isPending} onClick={burnOnly}>
              Burn only
            </button>
            <button type="button" className="btn-ghost w-full" onClick={poll}>
              Poll Circle attestation
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => switchChain({ chainId: arcTestnet.id })}>
              Switch to Arc Testnet
            </button>
            <button type="button" className="btn-primary w-full" disabled={!message || !attestation || isPending} onClick={mint}>
              Mint on Arc
            </button>
          </div>
        ) : (
          <ConnectButton className="w-full" />
        )}

        <p className="text-sm text-mute">{status}{burnMined ? " Burn mined." : ""}</p>
        {(error || batchError) && <p className="text-sm text-danger">{writeErrorText(error ?? batchError)}</p>}
        {pot && (
          <Link href={`/pot/${pot}`} className="inline-block text-sm text-laterite">
            Back to pot {pot} to fund after mint
          </Link>
        )}
      </div>
    </main>
  );
}
