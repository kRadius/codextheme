import { NextResponse } from "next/server";
import { privateSkinService } from "../../../lib/private-skin-service.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await privateSkinService.retrieve(id);
    return new Response(result.serialized, {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "application/vnd.codextheme.theme+json",
        "X-Content-Type-Options": "nosniff",
        "X-CodexTheme-SHA256": result.sha256,
      },
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "E_EXPIRED") return NextResponse.json({ error: "expired" }, { status: 410, headers: NO_STORE });
    if (code === "E_INVALID_ID" || code === "E_NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
