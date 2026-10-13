import { NextResponse } from "next/server";
import { circleFailure, circleHost, circleKey, circleReady } from "@/lib/circle";
import { signedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await signedIn(request))) {
    return NextResponse.json({ error: "Sign in before the Arc wallet can sign." }, { status: 401 });
  }
  const apiKey = circleKey(process.env);
  if (!circleReady(apiKey, "app")) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    userToken?: string;
    walletId?: string;
    kind?: "contract" | "transfer";
    contractAddress?: string;
    callData?: string;
    to?: string;
    amount?: string;
  };
  if (!body.userToken || !body.walletId) {
    return NextResponse.json({ error: "Open the Arc wallet once so it can sign." }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-User-Token": body.userToken,
  };
  const path = body.kind === "transfer" ? "transfer" : "contractExecution";
  const payload = body.kind === "transfer"
    ? {
        idempotencyKey: crypto.randomUUID(),
        walletId: body.walletId,
        destinationAddress: body.to,
        amounts: [body.amount || "0"],
        tokenAddress: "0x3600000000000000000000000000000000000000",
        blockchain: "ARC-TESTNET",
        feeLevel: "MEDIUM",
      }
    : {
        idempotencyKey: crypto.randomUUID(),
        walletId: body.walletId,
        contractAddress: body.contractAddress,
        callData: body.callData,
        feeLevel: "MEDIUM",
      };
  const created = await fetch(`${circleHost(apiKey)}/v1/w3s/user/transactions/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await created.json().catch(() => ({}));
  if (!created.ok || !json.data?.challengeId) {
    return NextResponse.json({ error: json.message || circleFailure(created.status) }, { status: 502 });
  }
  return NextResponse.json({ challengeId: json.data.challengeId });
}
