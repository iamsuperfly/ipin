"use client";

import { useState } from "react";
import { CIRCLE_APP_ID } from "@/lib/circle";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

export function CircleWallet() {
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setNote("Starting the Arc wallet.");
    try {
      const sdkModule = await import("@circle-fin/w3s-pw-web-sdk");
      const sdk = new sdkModule.W3SSdk({
        appSettings: { appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID },
        loginConfigs: {
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin },
        },
      });
      const deviceId = await sdk.getDeviceId();
      const res = await fetch("/api/circle/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, idempotencyKey: crypto.randomUUID() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(json.error || "Couldn't start the wallet. Try again.");
        return;
      }
      window.localStorage.setItem("ipin-circle-token", json.deviceToken || "");
      window.localStorage.setItem("ipin-circle-key", json.deviceEncryptionKey || "");
      setNote("Arc wallet session started. Circle still has to finish the sign-in prompt.");
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
