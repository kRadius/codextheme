import { NextResponse } from "next/server";
import { privateSkinService } from "../../../lib/private-skin-service.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await privateSkinService.cleanup();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "cleanup_failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
