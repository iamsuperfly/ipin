"use client";

import { useEffect, useRef, useState } from "react";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { circleErrorMessage, circleReturn } from "@/lib/circleReturn";
import { supabaseBrowser } from "@/lib/supabase";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

function returnUrl() {
  return `${window.location.origin}/account`;
}

function googleConfig() {
  return { clientId: GOOGLE_CLIENT_ID, redirectUri: returnUrl(), selectAccountPrompt: true };
}

async function authHeaders() {
  const supabase = supabaseBrowser();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export function CircleWallet() {
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function openGoogle() {
    const headers = await authHeaders();
    if (!headers) {
      setNote("Sign in before starting a wallet.");
      setBusy(false);
      return;
    }
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    const sdk = new W3SSdk({
      appSettings: { appId },
      loginConfigs: {
        deviceToken: window.localStorage.getItem("ipin-circle-token") || "",
        deviceEncryptionKey: window.localStorage.getItem("ipin-circle-key") || "",
        google: googleConfig(),
      },
    });
    const deviceId = window.localStorage.getItem("ipin-circle-device") || (await sdk.getDeviceId());
    window.localStorage.setItem("ipin-circle-device", deviceId);
    if (!window.localStorage.getItem("ipin-circle-token")) {
      const session = await fetch("/api/circle/session", {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceId, idempotencyKey: crypto.randomUUID() }),
      });
      const sessionJson = await session.json().catch(() => ({}));
      if (!session.ok) {
        setNote(sessionJson.error || "Couldn't reach Circle. Try again.");
        setBusy(false);
        return;
      }
      window.localStorage.setItem("ipin-circle-token", sessionJson.deviceToken || "");
      window.localStorage.setItem("ipin-circle-key", sessionJson.deviceEncryptionKey || "");
      sdk.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: sessionJson.deviceToken || "",
          deviceEncryptionKey: sessionJson.deviceEncryptionKey || "",
          google: googleConfig(),
        },
      });
    }
    window.localStorage.setItem("ipin-circle-pending", "1");
    await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
    setNote("Choose the Google account. You will come back here.");
  }

  useEffect(() => {
    if (started.current) return;
    const pending = window.localStorage.getItem("ipin-circle-pending") === "1";
    const returned = circleReturn(window.location.search, window.location.hash);
    if (!pending || !returned) {
      if (pending) window.localStorage.removeItem("ipin-circle-pending");
      return;
    }
    started.current = true;
    if (returned === "error") {
      const reason = circleErrorMessage(window.location.search, window.location.hash);
      window.history.replaceState({}, "", "/account");
      if (reason.includes("account picker") && window.localStorage.getItem("ipin-circle-retry") !== "1") {
        window.localStorage.setItem("ipin-circle-retry", "1");
        setBusy(true);
        setNote("Opening the Google account picker.");
        void openGoogle().catch(() => {
          window.localStorage.removeItem("ipin-circle-pending");
          setNote("Couldn't open Google. Try again.");
          setBusy(false);
        });
        return;
      }
      window.localStorage.removeItem("ipin-circle-pending");
      window.localStorage.removeItem("ipin-circle-retry");
      setNote(reason);
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
    }, 20000);
    const sdk = new W3SSdk(
      {
        appSettings: { appId },
        loginConfigs: { deviceToken, deviceEncryptionKey, google: googleConfig() },
      },
      (error, result) => {
        void finish(sdk, error, result);
      },
    );

    async function finish(current: W3SSdk, error: unknown, result: { userToken?: string; encryptionKey?: string } | undefined) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.history.replaceState({}, "", "/account");
      if (error || !result?.userToken || !result.encryptionKey) {
        window.localStorage.removeItem("ipin-circle-pending");
        setNote("Couldn't finish the Google prompt. Try again.");
        setBusy(false);
        return;
      }
      const headers = await authHeaders();
      if (!headers) {
        setNote("Sign in before creating a wallet.");
        setBusy(false);
        return;
      }
      const created = await fetch("/api/circle/wallet", {
        method: "POST",
        headers,
        body: JSON.stringify({ userToken: result.userToken }),
      });
      const json = await created.json().catch(() => ({}));
      if (!created.ok) {
        setNote(json.error || "Couldn't create the Arc wallet. Try again.");
        setBusy(false);
        return;
      }
      if (json.address) {
        window.localStorage.removeItem("ipin-circle-pending");
        window.localStorage.removeItem("ipin-circle-retry");
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
          headers,
          body: JSON.stringify({ userToken: result.userToken }),
        });
        const listedJson = await listed.json().catch(() => ({}));
        window.localStorage.removeItem("ipin-circle-pending");
        window.localStorage.removeItem("ipin-circle-retry");
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
    window.localStorage.removeItem("ipin-circle-token");
    window.localStorage.removeItem("ipin-circle-key");
    window.localStorage.removeItem("ipin-circle-retry");
    try {
      await openGoogle();
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
