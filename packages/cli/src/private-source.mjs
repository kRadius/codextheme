import { createHash } from "node:crypto";
import { lintThemePackage, validateThemePackage } from "@codextheme/runtime";

const PRODUCTION_ORIGIN = "https://codextheme.tech";
const SAFE_ID = /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/;
const SAFE_HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 3_800_000;
const MEDIA_TYPE = "application/vnd.codextheme.theme+json";

function sourceError(code, message) {
  return Object.assign(new Error(message), { code });
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
}

function assertPrivateShape(bundle) {
  if (!exactKeys(bundle, ["format", "schemaVersion", "exportedAt", "theme", "targets", "assets"])) throw new Error("root");
  if (!exactKeys(bundle.theme, ["id", "displayName", "version", "copy"])) throw new Error("theme");
  if (!exactKeys(bundle.theme.copy, ["brandTitle", "brandSubtitle", "signature", "tagline", "projectPrefix", "projectLabel", "ribbon"])) throw new Error("copy");
  if (!exactKeys(bundle.targets, ["codex"])) throw new Error("targets");
  const target = bundle.targets.codex;
  if (!exactKeys(target, ["css", "options", "verification"])) throw new Error("target");
  if (!exactKeys(target.options, ["rendererProfile", "baseTheme"])) throw new Error("options");
  if (!exactKeys(target.options.baseTheme, ["mode", "codeTheme", "accent", "contrast", "ink", "surface", "opaqueWindows"])) throw new Error("base theme");
  if (!exactKeys(target.verification, ["recommended"]) || !Array.isArray(target.verification.recommended)) throw new Error("verification");
  for (const requirement of target.verification.recommended) {
    if (!exactKeys(requirement, ["name", "any"])) throw new Error("requirement");
  }
  if (!exactKeys(bundle.assets, ["images"]) || !exactKeys(bundle.assets.images, ["hero", "session-bg"])) throw new Error("images");
  for (const image of Object.values(bundle.assets.images)) {
    if (!exactKeys(image, ["filename", "mimeType", "base64"]) || image.mimeType !== "image/webp" || image.filename !== "custom-skin.webp") {
      throw new Error("image");
    }
  }
}

async function readBounded(response) {
  if (!response.body) throw sourceError("E_PRIVATE_INVALID", "下载的私有主题无效。");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      void reader.cancel().catch(() => {});
      throw sourceError("E_PRIVATE_INVALID", "下载的私有主题超过安全大小限制。");
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

export function createPrivateThemeSource({ origin = PRODUCTION_ORIGIN, fetchImpl = globalThis.fetch } = {}) {
  return {
    async download(id) {
      if (typeof id !== "string" || !SAFE_ID.test(id)) {
        throw sourceError("E_PRIVATE_NOT_FOUND", "没有找到该私有主题。");
      }
      let response;
      try {
        response = await fetchImpl(`${origin}/api/private-skins/${id}`, {
          method: "GET",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: { Accept: MEDIA_TYPE },
        });
      } catch {
        throw sourceError("E_PRIVATE_DOWNLOAD", "暂时无法下载私有主题。");
      }
      if (response.status === 404) throw sourceError("E_PRIVATE_NOT_FOUND", "没有找到该私有主题。");
      if (response.status === 410) throw sourceError("E_PRIVATE_EXPIRED", "该私有主题链接已过期。");
      if (!response.ok) throw sourceError("E_PRIVATE_DOWNLOAD", "暂时无法下载私有主题。");
      if (response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== MEDIA_TYPE) {
        throw sourceError("E_PRIVATE_INVALID", "下载的私有主题类型无效。");
      }

      let serialized;
      try {
        serialized = await readBounded(response);
      } catch (error) {
        if (error?.code === "E_PRIVATE_INVALID") throw error;
        throw sourceError("E_PRIVATE_INVALID", "下载的私有主题编码无效。");
      }
      const sha256 = createHash("sha256").update(serialized).digest("hex");
      const expectedHash = response.headers.get("x-codextheme-sha256") ?? "";
      if (!SAFE_HASH.test(expectedHash) || expectedHash !== sha256) {
        throw sourceError("E_PRIVATE_INVALID", "私有主题完整性验证失败。");
      }

      let bundle;
      try {
        bundle = JSON.parse(serialized);
        assertPrivateShape(bundle);
        validateThemePackage(bundle);
        if (lintThemePackage(bundle).length) throw new Error("lint");
      } catch {
        throw sourceError("E_PRIVATE_INVALID", "私有主题安全验证失败。");
      }
      return { serialized, sha256, bundle };
    },
  };
}

export const privateThemeSource = createPrivateThemeSource();
