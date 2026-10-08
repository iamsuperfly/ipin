"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { supabaseBrowser } from "@/lib/supabase";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

function googleConfig() {
  return { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin, selectAccountPrompt: true };
}

async function authHeaders() {
  const supabase = supabaseBrowser();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export function CircleWallet() {
  const path = usePathname();
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const sdkRef = useRef<W3SSdk | null>(null);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    const sdk = new W3SSdk(
      {
        appSettings: { appId },
        loginConfigs: {
          deviceToken: window.localStorage.getItem("ipin-circle-token") || "",
          deviceEncryptionKey: window.localStorage.getItem("ipin-circle-key") || "",
          google: googleConfig(),
        },
      },
      (error, result) => {
        void finish(sdk, error, result);
      },
    );
    sdkRef.current = sdk;

    async function finish(current: W3SSdk, error: unknown, result: { userToken?: string; encryptionKey?: string } | undefined) {
      if (error || !result?.userToken || !result.encryptionKey) return;
      window.localStorage.removeItem("ipin-circle-pending");
      setBusy(true);
      setNote("Google confirmed. Creating the Arc wallet.");
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
        setAddress(listedJson.address || "");
        setNote(listedJson.address ? "Arc wallet ready." : "Wallet created. Refresh if the address is not here yet.");
        setBusy(false);
      });
    }
  }, []);

  async function start() {
    setBusy(true);
    setNote("Starting the Arc wallet.");
    const headers = await authHeaders();
    if (!headers || !sdkRef.current) {
      setNote("Sign in before starting a wallet.");
      setBusy(false);
      return;
    }
    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
    try {
      const deviceId = window.localStorage.getItem("ipin-circle-device") || (await sdkRef.current.getDeviceId());
      window.localStorage.setItem("ipin-circle-device", deviceId);
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
      window.localStorage.setItem("ipin-circle-pending", "1");
      sdkRef.current.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: sessionJson.deviceToken || "",
          deviceEncryptionKey: sessionJson.deviceEncryptionKey || "",
          google: googleConfig(),
        },
      });
      await sdkRef.current.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
      setNote("Choose the Google account. You will come back here.");
    } catch {
      window.localStorage.removeItem("ipin-circle-pending");
      setNote("Couldn't open Google. Try again.");
      setBusy(false);
    }
  }

  if (path !== "/account") return null;
  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <div className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
        <p className="text-sm text-mute">{note}</p>
        {address && <p className="mt-2 font-mono text-sm">{address}</p>}
        <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={start}>
          {busy ? "Starting" : "Start Arc wallet"}
        </button>
      </div>
    </div>
  );
}
