"use client";

import { useEffect, useState } from "react";

function deviceId() {
  const key = "ipin-circle-device";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export function CircleWallet() {
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    const id = deviceId();
    fetch("/api/circle/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: id, idempotencyKey: crypto.randomUUID() }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setNote(json.error || "Couldn't start the wallet. Try again.");
          return;
        }
        window.localStorage.setItem("ipin-circle-token", json.deviceToken || "");
        setNote("Arc wallet session started.");
      })
      .catch(() => {
        if (!cancelled) setNote("Couldn't start the wallet. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!note) return null;
  return <p className="mt-3 text-sm text-mute">{note}</p>;
}
