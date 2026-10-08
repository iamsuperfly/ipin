"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { supabaseBrowser } from "@/lib/supabase";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=600; samesite=lax`;
}

function getCookie(name: string) {
  const hit = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

function googleConfig() {
  return {
    clientId: getCookie("google.clientId") || GOOGLE_CLIENT_ID,
    redirectUri: window.location.origin,
    selectAccountPrompt: true,
  };
}

async function authHeaders() {
  const supabase = supabaseBrowser();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export function CircleWallet() {
  const path = usePathname();
  const sdkRef = useRef<W3SSdk | null>(null);
  const [note, setNote] = useState("An Arc wallet is separate from the connected wallet.");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<{ userToken: string; encryptionKey: string } | null>(null);

  useEffect(() => {
    const sdk = new W3SSdk(
      {
        appSettings: { appId: getCookie("appId") || APP_ID },
        loginConfigs: {
          deviceToken: getCookie("deviceToken"),
          deviceEncryptionKey: getCookie("deviceEncryptionKey"),
          google: googleConfig(),
        },
      },
      (error, result) => {
        if (error || !result || !("userToken" in result) || !result.encryptionKey) {
          setNote("Google did not finish. Try again.");
          setBusy(false);
          return;
        }
        setLogin({ userToken: result.userToken, encryptionKey: result.encryptionKey });
        setNote("Google confirmed. Creating the Arc wallet.");
        void createWallet(sdk, result.userToken, result.encryptionKey);
      },
    );
    sdkRef.current = sdk;
  }, []);

  async function createWallet(sdk: W3SSdk, userToken: string, encryptionKey: string) {
    const headers = await authHeaders();
    if (!headers) {
      setNote("Sign in before creating a wallet.");
      setBusy(false);
      return;
    }
    const created = await fetch("/api/circle/wallet", {
      method: "POST",
      headers,
      body: JSON.stringify({ userToken }),
    });
    const json = await created.json().catch(() => ({}));
    if (json.address) {
      setAddress(json.address);
      setNote("Arc wallet ready.");
      setBusy(false);
      return;
    }
    if (!json.challengeId) {
      setNote(json.error || "Couldn't create the Arc wallet. Try again.");
      setBusy(false);
      return;
    }
    sdk.setAuthentication({ userToken, encryptionKey });
    sdk.execute(json.challengeId, async (challengeError) => {
      if (challengeError) {
        setNote("Couldn't create the Arc wallet. Try again.");
        setBusy(false);
        return;
      }
      const listed = await fetch("/api/circle/wallet", {
        method: "POST",
        headers,
        body: JSON.stringify({ userToken }),
      });
      const listedJson = await listed.json().catch(() => ({}));
      setAddress(listedJson.address || "");
      setNote(listedJson.address ? "Arc wallet ready." : "Wallet created. Refresh if the address is not here yet.");
      setBusy(false);
    });
  }

  async function start() {
    const sdk = sdkRef.current;
    if (!sdk) {
      setNote("Couldn't start the wallet. Refresh and try again.");
      return;
    }
    setBusy(true);
    setNote("Starting the Arc wallet.");
    const headers = await authHeaders();
    if (!headers) {
      setNote("Sign in before starting a wallet.");
      setBusy(false);
      return;
    }
    try {
      const deviceId = window.localStorage.getItem("deviceId") || (await sdk.getDeviceId());
      window.localStorage.setItem("deviceId", deviceId);
      const session = await fetch("/api/circle/session", {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceId, idempotencyKey: crypto.randomUUID() }),
      });
      const sessionJson = await session.json().catch(() => ({}));
      if (!session.ok || !sessionJson.deviceToken || !sessionJson.deviceEncryptionKey) {
        setNote(sessionJson.error || "Couldn't reach Circle. Try again.");
        setBusy(false);
        return;
      }
      setCookie("appId", APP_ID);
      setCookie("google.clientId", GOOGLE_CLIENT_ID);
      setCookie("deviceToken", sessionJson.deviceToken);
      setCookie("deviceEncryptionKey", sessionJson.deviceEncryptionKey);
      sdk.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken: sessionJson.deviceToken,
          deviceEncryptionKey: sessionJson.deviceEncryptionKey,
          google: googleConfig(),
        },
      });
      setNote("Choose the Google account. You will come back here.");
      await sdk.performLogin("GOOGLE" as Parameters<W3SSdk["performLogin"]>[0]);
    } catch {
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
        {login && !address && <p className="mt-2 text-sm text-mute">Google is confirmed.</p>}
        <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={start}>
          {busy ? "Starting" : "Start Arc wallet"}
        </button>
      </div>
    </div>
  );
}
