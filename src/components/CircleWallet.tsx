"use client";

import { useState } from "react";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

export function CircleWallet() {
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setNote("Starting the Arc wallet.");
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    let sdk: W3SSdk;
    try {
      sdk = new W3SSdk(
        {
          appSettings: { appId },
          loginConfigs: {
            deviceToken: window.localStorage.getItem("ipin-circle-token") || "",
            deviceEncryptionKey: window.localStorage.getItem("ipin-circle-key") || "",
            google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin },
          },
        },
        async (error, result) => {
          if (error || !result || !("userToken" in result)) {
            setNote("Couldn't finish the Google prompt. Try again.");
            setBusy(false);
            return;
          }
          const created = await fetch("/api/circle/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userToken: result.userToken, encryptionKey: result.encryptionKey }),
          });
          const json = await created.json().catch(() => ({}));
          if (!created.ok) {
            setNote(json.error || "Couldn't create the Arc wallet. Try again.");
            setBusy(false);
            return;
          }
          if (json.address) {
            setAddress(json.address);
            setNote("Arc wallet ready.");
            setBusy(false);
            return;
          }
          if (!json.challengeId) {
            setNote("Couldn't create the Arc wallet. Try again.");
            setBusy(false);
            return;
          }
          sdk.setAuthentication({ userToken: result.userToken, encryptionKey: result.encryptionKey });
          sdk.execute(json.challengeId, async (challengeError) => {
            if (challengeError) {
              setNote("Couldn't create the Arc wallet. Try again.");
              setBusy(false);
              return;
            }
            const listed = await fetch("/api/circle/wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userToken: result.userToken, encryptionKey: result.encryptionKey }),
            });
            const listedJson = await listed.json().catch(() => ({}));
            setAddress(listedJson.address || "");
            setNote(listedJson.address ? "Arc wallet ready." : "Wallet created. Refresh if the address is not here yet.");
            setBusy(false);
          });
        },
      );
    } catch {
      setNote("This browser blocked the wallet start. Allow popups and try again.");
      setBusy(false);
      return;
    }
    let deviceId = "";
    try {
      deviceId = await sdk.getDeviceId();
    } catch {
      setNote("This browser blocked the wallet start. Allow popups and try again.");
      setBusy(false);
      return;
    }
    const session = await fetch("/api/circle/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, idempotencyKey: crypto.randomUUID() }),
    }).catch(() => null);
    if (!session) {
      setNote("Couldn't reach Circle. Try again.");
      setBusy(false);
      return;
    }
    const sessionJson = await session.json().catch(() => ({}));
    if (!session.ok) {
      setNote(sessionJson.error || "Couldn't reach Circle. Try again.");
      setBusy(false);
      return;
    }
    const deviceToken = sessionJson.deviceToken || "";
    const deviceEncryptionKey = sessionJson.deviceEncryptionKey || "";
    window.localStorage.setItem("ipin-circle-token", deviceToken);
    window.localStorage.setItem("ipin-circle-key", deviceEncryptionKey);
    sdk.updateConfigs({
      appSettings: { appId },
      loginConfigs: {
        deviceToken,
        deviceEncryptionKey,
        google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin },
      },
    });
    try {
      await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
      setNote("Confirm Google to create the Arc wallet.");
    } catch {
      setNote("Couldn't open Google. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
      <p className="text-sm text-mute">{note}</p>
      {address && <p className="mt-2 font-mono text-sm">{address}</p>}
      <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={start}>
        {busy ? "Starting" : "Start Arc wallet"}
      </button>
    </div>
  );
}
