"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FAUCET } from "@/lib/chain";
import { ipinAddress } from "@/lib/contract";

export default function HomePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const deployed = Boolean(ipinAddress());

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-16">
      <section className="rise-in max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-laterite">Arc testnet</p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          A share is a share.
          <br />
          Paid once.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
          Ipin is a team pot in USDC or EURC. Pour it in. Cut the shares. The contract will not pay the same person twice in a round.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/create" className="btn-primary w-full sm:w-auto">
            Create a pot
          </Link>
          <Link href="/bridge" className="btn-ghost w-full sm:w-auto">
            Bridge USDC to Arc
          </Link>
          <a href={FAUCET} target="_blank" rel="noreferrer" className="btn-ghost w-full sm:w-auto">
            Faucet
          </a>
        </div>
        {!deployed && (
          <p className="mt-6 rounded-2xl border border-laterite/30 bg-panel px-4 py-3 text-sm text-mute">
            Redeploy Ipin with constructor <span className="font-mono text-ink">usdc_</span> and <span className="font-mono text-ink">eurc_</span>, then set NEXT_PUBLIC_IPIN_ADDRESS.
          </p>
        )}
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Pour", d: "Fund in one popup when the wallet batches. USDC or EURC, not mixed." },
          { t: "Cut", d: "Shares are integers. The pot does the maths." },
          { t: "Stamp", d: "Paid is paid. A second send in the same round reverts." },
        ].map((card) => (
          <article key={card.t} className="rounded-3xl border border-ink/10 bg-panel p-6">
            <h2 className="font-display text-2xl">{card.t}</h2>
            <p className="mt-2 text-mute">{card.d}</p>
          </article>
        ))}
      </section>

      <form
        className="mt-16 max-w-lg rounded-3xl border border-ink/10 bg-panel p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const n = id.trim();
          if (!n) return;
          router.push(`/pot/${n}`);
        }}
      >
        <label className="font-display text-xl">Open a pot</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          inputMode="numeric"
          placeholder="Pot number"
          className="mt-4 h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-ink outline-none focus:border-laterite"
        />
        <button type="submit" className="btn-primary mt-4 w-full">
          Open
        </button>
      </form>
    </main>
  );
}
