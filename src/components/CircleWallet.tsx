"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CIRCLE_APP_ID } from "@/lib/circle";
import { supabaseBrowser } from "@/lib/supabase";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";

const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
const FAUCET = "https://faucet.circle.com";

type WalletState = { note: string; address: string; balance: string; busy: boolean };
const listeners = new Set<(state: WalletState) => void>();
let state: WalletState = {
  note: "An Arc wallet is separate from the connected wallet.",
  address: "",
  balance: "",
  busy: false,
};

function publish(next: Partial<WalletState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

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

function sdkError(error: unknown) {
  if (!error) return "Circle returned no login result.";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  const value = error as { message?: string; code?: string | number; error?: string };
  const message = value.message || value.error;
  if (message && value.code) return `${value.code}: ${message}`;
  if (message) return message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Circle returned an unreadable login error.";
  }
}

async function authHeaders() {
  const supabase = supabaseBrowser();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

async function saveCircle(address: string) {
  const supabase = supabaseBrowser();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return "Sign in before saving the wallet.";
  await supabase.from("wallets").update({ is_active: false }).eq("account_id", user.id);
  const saved = await supabase.from("wallets").upsert(
    { account_id: user.id, address: address.toLowerCase(), is_active: true, kind: "circle" },
    { onConflict: "account_id,address" },
  );
  if (saved.error) return "Couldn't save the Arc wallet. Run the new schema, then try again.";
  window.localStorage.setItem("ipin-circle-address", address);
  return "";
}

async function readBalance(address: string) {
  const res = await fetch("/api/arc/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? String(json.balance || "0.00") : "";
}

export function CircleHost() {
  const router = useRouter();
  const sdkRef = useRef<W3SSdk | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("ipin-circle-address") || "";
    if (saved) {
      publish({ address: saved });
      void readBalance(saved).then((balance) => publish({ balance }));
    }
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
          publish({ note: sdkError(error), busy: false });
          return;
        }
        router.replace("/account");
        publish({ note: "Google confirmed. Creating the Arc wallet.", busy: true });
        void createWallet(sdk, result.userToken, result.encryptionKey);
      },
    );
    sdkRef.current = sdk;
    window.localStorage.setItem("ipin-circle-ready", "1");
  }, [router]);

  async function listedAddress(headers: Record<string, string>, userToken: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const listed = await fetch("/api/circle/wallet", {
        method: "POST",
        headers,
        body: JSON.stringify({ userToken }),
      });
      const json = await listed.json().catch(() => ({}));
      if (json.address) return json.address as string;
      if (json.challengeId) return "";
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    return "";
  }

  async function finish(address: string) {
    const failed = await saveCircle(address);
    const balance = await readBalance(address);
    publish({ address, balance, note: failed || "Arc wallet ready.", busy: false });
    router.replace("/account");
  }

  async function createWallet(sdk: W3SSdk, userToken: string, encryptionKey: string) {
    const headers = await authHeaders();
    if (!headers) {
      publish({ note: "Sign in before creating a wallet.", busy: false });
      return;
    }
    const created = await fetch("/api/circle/wallet", {
      method: "POST",
      headers,
      body: JSON.stringify({ userToken }),
    });
    const json = await created.json().catch(() => ({}));
    if (json.address) {
      await finish(json.address);
      return;
    }
    if (!json.challengeId) {
      publish({ note: json.error || "Circle has not created the wallet yet.", busy: false });
      return;
    }
    sdk.setAuthentication({ userToken, encryptionKey });
    publish({ note: "Confirm the wallet prompt." });
    sdk.execute(json.challengeId, async (challengeError) => {
      if (challengeError) {
        publish({ note: sdkError(challengeError), busy: false });
        return;
      }
      const found = await listedAddress(headers, userToken);
      if (!found) {
        publish({ note: "Circle confirmed Google, but no Arc address exists yet.", busy: false });
        return;
      }
      await finish(found);
    });
  }

  useEffect(() => {
    const start = async () => {
      const sdk = sdkRef.current;
      if (!sdk) return;
      publish({ note: "Starting the Arc wallet.", busy: true });
      const headers = await authHeaders();
      if (!headers) {
        publish({ note: "Sign in before starting a wallet.", busy: false });
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
          publish({ note: sessionJson.error || "Couldn't reach Circle. Try again.", busy: false });
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
        publish({ note: "Choose the Google account. You will come back here." });
        await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
      } catch (error) {
        publish({ note: sdkError(error), busy: false });
      }
    };
    const onStart = () => void start();
    window.addEventListener("ipin-circle-start", onStart);
    return () => window.removeEventListener("ipin-circle-start", onStart);
  }, []);

  return null;
}

export function CircleCard() {
  const [local, setLocal] = useState(state);

  useEffect(() => {
    setLocal(state);
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);

  async function copy() {
    if (!local.address) return;
    await navigator.clipboard.writeText(local.address).catch(() => undefined);
    publish({ note: "Address copied." });
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-panel px-4 py-4">
      <p className="text-sm text-mute">{local.note}</p>
      {local.address && (
        <button type="button" className="mt-2 break-all text-left font-mono text-sm" onClick={copy}>
          {local.address}
        </button>
      )}
      {local.address && <p className="mt-2 text-sm">{local.balance ? `${local.balance} USDC` : "Reading balance."}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <a className="btn-ghost text-center" href={FAUCET} target="_blank" rel="noreferrer">Fund</a>
        <button type="button" className="btn-primary" disabled={local.busy} onClick={() => window.dispatchEvent(new Event("ipin-circle-start"))}>
          {local.busy ? "Starting" : "Start"}
        </button>
      </div>
    </div>
  );
}
