import { NextResponse } from "next/server";
import { CIRCLE_APP_ID, circleReady, socialTokenBody } from "@/lib/circle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.CIRCLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || CIRCLE_APP_ID;
  if (!circleReady(apiKey, appId)) {
    return NextResponse.json({ error: "Circle is not ready on this deploy yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { deviceId?: string; idempotencyKey?: string };
  if (!body.deviceId || !body.idempotencyKey) {
    return NextResponse.json({ error: "Couldn't start the wallet. Try again." }, { status: 400 });
  }
  const res = await fetch("https://api.circle.com/v1/w3s/users/social/token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(socialTokenBody(body.deviceId, body.idempotencyKey)),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: "Couldn't start the wallet. Try again." }, { status: 502 });
  }
  return NextResponse.json({ appId, deviceToken: json.data?.deviceToken, deviceEncryptionKey: json.data?.deviceEncryptionKey });
}
