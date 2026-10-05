import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;
  if (!apiKey || !appId) {
    return NextResponse.json(
      { error: "Circle is not ready on this deploy yet." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    appId,
    ready: true,
  });
}
