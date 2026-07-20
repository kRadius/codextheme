import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  THEME_EXTENSION,
  THEME_FORMAT,
  HISTORICAL_THEME_FORMAT,
  buildThemePackage,
  lintThemePackage,
  normalizeThemePackage,
  readThemePackage,
  resolveThemeTarget,
  validateThemePackage,
  writeThemePackage,
} from "../src/theme/package.mjs";

const exampleManifest = new URL("../examples/dream/theme.json", import.meta.url);

test("publishes the codextheme-owned artifact extension", () => {
  assert.equal(THEME_EXTENSION, ".codextheme-theme");
  assert.equal(THEME_FORMAT, "codextheme-theme");
});

test("builds one portable theme for multiple app targets", async () => {
  const { bundle, serialized } = await buildThemePackage(exampleManifest.pathname);
  assert.equal(bundle.format, THEME_FORMAT);
  assert.equal(bundle.theme.id, "dream");
  assert.deepEqual(Object.keys(bundle.targets), ["codex", "workbuddy"]);
  assert.match(bundle.targets.codex.css, /codedrobe-host-codex/);
  assert.match(bundle.targets.workbuddy.css, /codedrobe-host-workbuddy/);
  assert.equal(bundle.targets.workbuddy.verification.required[0].name, "chat-surface");
  assert.equal(bundle.targets.workbuddy.verification.recommended[0].name, "conversation-list");
  assert.equal(bundle.targets.codex.verification.contexts[0].name, "home");
  assert.ok(serialized.endsWith("\n"));
});

test("normalizes historical package input without mutating the source", () => {
  const legacyBundle = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    theme: { id: "legacy", displayName: "Legacy", version: "1.0.0" },
    targets: { codex: { css: ":root { color: red; }" } },
  };

  assert.equal(HISTORICAL_THEME_FORMAT, "codedrobe-theme");
  const normalized = normalizeThemePackage(legacyBundle);
  assert.equal(normalized.format, THEME_FORMAT);
  assert.notEqual(normalized, legacyBundle);
  assert.equal(legacyBundle.format, HISTORICAL_THEME_FORMAT);
  assert.equal(validateThemePackage(legacyBundle).format, THEME_FORMAT);
  assert.throws(
    () => normalizeThemePackage({ ...legacyBundle, format: "unknown-theme" }),
    /Unsupported theme format/,
  );
});

test("writes, reads, and resolves a .codextheme-theme package", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codedrobe-theme-"));
  const output = path.join(directory, `dream${THEME_EXTENSION}`);
  await writeThemePackage(exampleManifest.pathname, output);
  const bundle = await readThemePackage(output);
  const selected = resolveThemeTarget(bundle, "workbuddy");
  assert.equal(selected.theme.version, "1.0.0");
  assert.match(selected.css, /conversation-sidebar/);
  assert.equal(selected.verification.required[0].name, "chat-surface");
  await assert.rejects(() => writeThemePackage(exampleManifest.pathname, output), /already exists/);
});

test("accepts an explicit export timestamp for reproducible release artifacts", async () => {
  const exportedAt = "2026-07-18T00:00:00.000Z";
  const first = await buildThemePackage(exampleManifest.pathname, { exportedAt });
  const second = await buildThemePackage(exampleManifest.pathname, { exportedAt });
  assert.equal(first.bundle.exportedAt, exportedAt);
  assert.equal(first.serialized, second.serialized);
});

test("packs and resolves multiple named images with a backward-compatible hero alias", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "codedrobe-theme-images-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "theme.css"), ".hero { background: var(--codedrobe-image-hero); }", "utf8");
  await fs.writeFile(path.join(directory, "hero.png"), Buffer.from("hero"));
  await fs.writeFile(path.join(directory, "logo.webp"), Buffer.from("logo"));
  await fs.writeFile(path.join(directory, "theme.json"), JSON.stringify({
    schemaVersion: 1,
    id: "image-theme",
    displayName: "Image Theme",
    version: "1.0.0",
    images: { hero: "hero.png", logo: "logo.webp" },
    targets: { codex: { css: "theme.css" } },
  }), "utf8");

  const { bundle } = await buildThemePackage(path.join(directory, "theme.json"));
  assert.deepEqual(Object.keys(bundle.assets.images), ["hero", "logo"]);
  assert.equal(bundle.assets.images.logo.mimeType, "image/webp");
  assert.equal(bundle.assets.art, undefined);
  const resolved = resolveThemeTarget(bundle, "codex");
  assert.deepEqual(Object.keys(resolved.imageDataUrls), ["hero", "logo"]);
  assert.equal(resolved.artDataUrl, resolved.imageDataUrls.hero);
  assert.match(resolved.imageDataUrls.logo, /^data:image\/webp;base64,/);
});

test("reads legacy assets.art as images.hero and rejects unsafe named images", () => {
  const base = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    theme: { id: "images", displayName: "Images", version: "1.0.0" },
    targets: { codex: { css: ":root { color: red; }" } },
  };
  const legacy = {
    ...base,
    assets: { art: { filename: "hero.png", mimeType: "image/png", base64: "aGVsbG8=" } },
  };
  assert.match(resolveThemeTarget(legacy, "codex").imageDataUrls.hero, /^data:image\/png;base64,/);
  assert.throws(() => validateThemePackage({
    ...base,
    assets: { images: { "../logo": { filename: "logo.png", mimeType: "image/png", base64: "aGVsbG8=" } } },
  }), /invalid image id/);
  assert.throws(() => validateThemePackage({
    ...base,
    assets: { images: { logo: { filename: "logo.svg", mimeType: "image\/svg+xml", base64: "aGVsbG8=" } } },
  }), /not supported/);
  assert.throws(() => validateThemePackage({
    ...base,
    assets: {
      art: { filename: "old.png", mimeType: "image/png", base64: "aGVsbG8=" },
      images: { hero: { filename: "new.png", mimeType: "image/png", base64: "aGVsbG8=" } },
    },
  }), /cannot be combined/);
});

test("rejects external CSS resources and executable-looking package variants", () => {
  const base = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    theme: { id: "unsafe", displayName: "Unsafe", version: "1.0.0" },
    targets: { codex: { css: "@import url('https://example.com/theme.css');" } },
  };
  assert.throws(() => validateThemePackage(base), /external CSS resource/);
  assert.throws(() => validateThemePackage({ ...base, format: "codex-theme" }), /Unsupported theme format/);
});

test("rejects invalid theme-specific verification nodes", () => {
  const base = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    theme: { id: "invalid-probe", displayName: "Invalid Probe", version: "1.0.0" },
    targets: {
      workbuddy: {
        css: ":root { color: red; }",
        verification: { required: [{ name: "composer", any: [] }] },
      },
    },
  };
  assert.throws(() => validateThemePackage(base), /non-empty selector array/);
  assert.throws(() => validateThemePackage({
    ...base,
    targets: {
      workbuddy: {
        css: ":root { color: red; }",
        verification: {
          contexts: [{ name: "home", when: { any: [".home"] } }],
        },
      },
    },
  }), /must declare required or recommended checks/);
});

test("accepts recommended-only checks and reports brittle selector warnings", () => {
  const bundle = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    theme: { id: "lint-probe", displayName: "Lint Probe", version: "1.0.0" },
    targets: {
      codex: {
        css: ".shell > div > div > div:first-child { color: red; }",
        verification: {
          recommended: [{ name: "localized-button", any: ["button[aria-label='切换模式']"] }],
        },
      },
    },
  };
  assert.equal(validateThemePackage(bundle).format, THEME_FORMAT);
  const warnings = lintThemePackage(bundle);
  assert.deepEqual(new Set(warnings.map((warning) => warning.code)), new Set([
    "positional-selector",
    "deep-child-chain",
    "localized-attribute",
  ]));
  assert.ok(warnings.every((warning) => warning.appId === "codex"));
});

test("rejects a theme that does not support the selected app", async () => {
  const { bundle } = await buildThemePackage(exampleManifest.pathname);
  assert.throws(() => resolveThemeTarget(bundle, "unknown-ai"), /does not support app/);
});
