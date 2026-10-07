"use client";

import { useEffect, useState } from "react";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

function returnUrl() {
  return `${window.location.origin}/account`;
}

function googleCameBack() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return ["code", "state", "error", "access_token"].some((key) => query.has(key) || hash.has(key));
}

export function CircleWallet() {
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pending = window.localStorage.getItem("ipin-circle-pending") === "1";
    const returned = googleCameBack();
    if (!pending && !returned) return;
    if (!returned) {
      window.localStorage.removeItem("ipin-circle-pending");
      setNote("Google did not finish. Try again.");
      return;
    }

    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    const deviceToken = window.localStorage.getItem("ipin-circle-token") || "";
    const deviceEncryptionKey = window.localStorage.getItem("ipin-circle-key") || "";
    let settled = false;
    setBusy(true);
    setNote("Finishing the Arc wallet.");
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.localStorage.removeItem("ipin-circle-pending");
      setNote("Google came back, but the wallet did not finish. Try again.");
      setBusy(false);
    }, 12000);

    const sdk = new W3SSdk(
      {
        appSettings: { appId },
        loginConfigs: {
          deviceToken,
          deviceEncryptionKey,
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: returnUrl() },
        },
      },
      (error, result) => {
        void finish(sdk, error, result);
      },
    );

    async function finish(current: W3SSdk, error: unknown, result: { userToken?: string; encryptionKey?: string } | undefined) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error || !result?.userToken || !result.encryptionKey) {
        window.localStorage.removeItem("ipin-circle-pending");
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
        window.localStorage.removeItem("ipin-circle-pending");
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
      current.setAuthentication({ userToken: result.userToken, encryptionKey: result.encryptionKey });
      current.execute(json.challengeId, async (challengeError) => {
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
        window.localStorage.removeItem("ipin-circle-pending");
        setAddress(listedJson.address || "");
        setNote(listedJson.address ? "Arc wallet ready." : "Wallet created. Refresh if the address is not here yet.");
        setBusy(false);
      });
    }

    return () => window.clearTimeout(timer);
  }, []);

  async function start() {
    setBusy(true);
    setNote("Starting the Arc wallet.");
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    let sdk: W3SSdk;
    try {
      sdk = new W3SSdk({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: window.localStorage.getItem("ipin-circle-token") || "",
          deviceEncryptionKey: window.localStorage.getItem("ipin-circle-key") || "",
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: returnUrl() },
        },
      });
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
    window.localStorage.setItem("ipin-circle-token", sessionJson.deviceToken || "");
    window.localStorage.setItem("ipin-circle-key", sessionJson.deviceEncryptionKey || "");
    window.localStorage.setItem("ipin-circle-pending", "1");
    sdk.updateConfigs({
      appSettings: { appId },
      loginConfigs: {
        deviceToken: sessionJson.deviceToken || "",
        deviceEncryptionKey: sessionJson.deviceEncryptionKey || "",
        google: { clientId: GOOGLE_CLIENT_ID, redirectUri: returnUrl() },
      },
    });
    try {
      await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
      setNote("Confirm Google. You will come back to this page.");
    } catch {
      window.localStorage.removeItem("ipin-circle-pending");
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
