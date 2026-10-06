import { NextResponse } from "next/server";
import { circleHost, circleKey, circleReady } from "@/lib/circle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = circleKey(process.env);
  if (!circleReady(apiKey, "app")) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { userToken?: string };
  if (!body.userToken) {
    return NextResponse.json({ error: "Couldn't create the Arc wallet. Try again." }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-User-Token": body.userToken,
  };
  const existing = await fetch(`${circleHost(apiKey)}/v1/w3s/wallets`, { headers });
  const existingJson = await existing.json().catch(() => ({}));
  const address = existingJson.data?.wallets?.find((wallet: { blockchain?: string; address?: string }) => wallet.blockchain === "ARC-TESTNET")?.address;
  if (address) return NextResponse.json({ address });
  const created = await fetch(`${circleHost(apiKey)}/v1/w3s/user/wallets`, {
    method: "POST",
    headers,
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), blockchains: ["ARC-TESTNET"] }),
  });
  const createdJson = await created.json().catch(() => ({}));
  if (!created.ok) {
    return NextResponse.json({ error: "Couldn't create the Arc wallet. Try again." }, { status: 502 });
  }
  return NextResponse.json({ challengeId: createdJson.data?.challengeId });
}
