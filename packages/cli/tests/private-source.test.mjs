import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createPrivateThemeSource } from "../src/private-source.mjs";

const id = "n0z6o000.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function privateBundle() {
  const image = Buffer.from("image").toString("base64");
  return {
    format: "codextheme-theme",
    schemaVersion: 1,
    exportedAt: "2026-07-19T00:00:00.000Z",
    theme: {
      id: "private-aaaaaaaaaaaaaaaaaaaa",
      displayName: "Private Custom Skin",
      version: "1.0.0",
      copy: {
        brandTitle: "PRIVATE SKIN",
        brandSubtitle: "codextheme.tech",
        signature: "CUSTOM / PRIVATE",
        tagline: "Your image. Your Codex.",
        projectPrefix: "WORKSPACE / ",
        projectLabel: "Select a project",
        ribbon: "◆",
      },
    },
    targets: {
      codex: {
        css: "html.codextheme-codex-skin body { background: #07080d !important; }",
        options: {
          rendererProfile: "codex-theme-v1",
          baseTheme: {
            mode: "dark",
            codeTheme: "codex",
            accent: "#d95764",
            contrast: 74,
            ink: "#f4f1eb",
            surface: "#170d10",
            opaqueWindows: true,
          },
        },
        verification: {
          recommended: [{ name: "session-surface", any: ["main.main-surface"] }],
        },
      },
    },
    assets: {
      images: {
        hero: { filename: "custom-skin.webp", mimeType: "image/webp", base64: image },
        "session-bg": { filename: "custom-skin.webp", mimeType: "image/webp", base64: image },
      },
    },
  };
}

function responseFor(bundle = privateBundle(), init = {}) {
  const serialized = `${JSON.stringify(bundle)}\n`;
  const sha256 = createHash("sha256").update(serialized).digest("hex");
  return new Response(serialized, {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/vnd.codextheme.theme+json",
      "x-codextheme-sha256": sha256,
      ...(init.headers ?? {}),
    },
  });
}

test("private source uses the fixed route and validates a bounded package", async () => {
  const calls = [];
  const source = createPrivateThemeSource({
    origin: "https://codextheme.test",
    fetchImpl: async (...args) => { calls.push(args); return responseFor(); },
  });
  const result = await source.download(id);
  assert.equal(result.sha256, createHash("sha256").update(result.serialized).digest("hex"));
  assert.equal(result.bundle.format, "codextheme-theme");
  assert.doesNotMatch(result.serialized, /codedrobe/iu);
  assert.equal(calls[0][0], `https://codextheme.test/api/private-skins/${id}`);
  assert.equal(calls[0][1].redirect, "error");
});

test("private source rejects malformed ids before fetch", async () => {
  let fetched = false;
  const source = createPrivateThemeSource({ fetchImpl: async () => { fetched = true; return responseFor(); } });
  await assert.rejects(() => source.download("../../secret"), { code: "E_PRIVATE_NOT_FOUND" });
  assert.equal(fetched, false);
});

test("private source maps expiry and absence without echoing the id", async () => {
  for (const [status, code] of [[404, "E_PRIVATE_NOT_FOUND"], [410, "E_PRIVATE_EXPIRED"]]) {
    const source = createPrivateThemeSource({ fetchImpl: async () => responseFor({}, { status }) });
    await assert.rejects(() => source.download(id), (error) => error.code === code && !error.message.includes(id));
  }
});

test("private source rejects wrong media, hash, size, schema, and unknown fields", async () => {
  const cases = [
    responseFor(undefined, { headers: { "content-type": "text/plain" } }),
    responseFor(undefined, { headers: { "x-codextheme-sha256": "0".repeat(64) } }),
    new Response("x".repeat(3_800_001), { headers: { "content-type": "application/vnd.codextheme.theme+json", "x-codextheme-sha256": "0".repeat(64) } }),
    responseFor({ ...privateBundle(), format: "unknown" }),
    responseFor({ ...privateBundle(), remoteUrl: "https://example.com" }),
  ];
  for (const response of cases) {
    const source = createPrivateThemeSource({ fetchImpl: async () => response.clone() });
    await assert.rejects(() => source.download(id), { code: "E_PRIVATE_INVALID" });
  }
});
