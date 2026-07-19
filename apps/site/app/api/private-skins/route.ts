import { NextResponse } from "next/server";
import { privateSkinService } from "../../lib/private-skin-service.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_REQUEST_BYTES = 4_400_000;
const SETTINGS = new Set(["recipe", "visibility", "overlay", "blur", "zoom", "positionX", "positionY"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function invalidSettings() {
  return Object.assign(new Error("invalid settings"), { code: "E_INVALID_SETTINGS" });
}

function parseSettings(value: FormDataEntryValue | null) {
  if (typeof value !== "string") throw invalidSettings();
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw invalidSettings();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw invalidSettings();
  if (Object.keys(parsed).some((key) => !SETTINGS.has(key))) throw invalidSettings();
  return parsed;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonError("upload_too_large", 413);
  }

  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!image || typeof image === "string" || typeof image.arrayBuffer !== "function") {
      return jsonError("invalid_upload", 400);
    }
    const settings = parseSettings(form.get("settings"));
    const result = await privateSkinService.create({
      image: Buffer.from(await image.arrayBuffer()),
      settings,
    });
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "E_INVALID_SETTINGS") return jsonError("invalid_settings", 400);
    if (code === "E_UPLOAD_TOO_LARGE") return jsonError("upload_too_large", 413);
    if (code === "E_IMAGE_TOO_SMALL") return jsonError("image_too_small", 400);
    if (code === "E_INVALID_UPLOAD" || error instanceof SyntaxError || error instanceof TypeError) {
      return jsonError("invalid_upload", 400);
    }
    if (code === "E_PACKAGE_TOO_LARGE") return jsonError("processed_image_too_large", 413);
    return jsonError("service_unavailable", 503);
  }
}
