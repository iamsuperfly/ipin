"use client";

import { useState } from "react";

export function CircleWallet() {
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setNote("Starting the Arc wallet.");
    try {
      const res = await fetch("/api/circle/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(json.error || "Couldn't start the wallet. Try again.");
        return;
      }
      window.localStorage.setItem("ipin-circle-token", json.deviceToken || "");
      setNote("Arc wallet session started.");
    } catch {
      setNote("Couldn't start the wallet. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
      <p className="text-sm text-mute">{note}</p>
      <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={start}>
        {busy ? "Starting" : "Start Arc wallet"}
      </button>
    </div>
  );
}
