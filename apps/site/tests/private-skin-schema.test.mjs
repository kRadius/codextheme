import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PROCESSED_IMAGE_BYTES,
  createPrivateSkinId,
  normalizePrivateSkinSettings,
  parsePrivateSkinId,
} from "../app/lib/private-skin-schema.mjs";
import { derivePalette } from "../app/lib/private-skin-palette.mjs";
import { buildPrivateSkinPackage } from "../app/lib/private-skin-package.mjs";
import {
  lintThemePackage,
  resolveThemeTarget,
  validateThemePackage,
} from "@codextheme/runtime";
import {
  buildPrivateSkinForm,
  validateSourceFile,
} from "../app/lib/browser-image.mjs";

test("settings clamp to the four editor controls", () => {
  assert.deepEqual(normalizePrivateSkinSettings({
    visibility: 200,
    overlay: -2,
    blur: 99,
    zoom: 120,
    positionX: 40,
    positionY: 65,
  }), {
    visibility: 100,
    overlay: 0,
    blur: 16,
    zoom: 120,
    positionX: 40,
    positionY: 65,
  });
  assert.equal(MAX_PROCESSED_IMAGE_BYTES, 1_200_000);
});

test("settings use safe defaults for missing and non-finite input", () => {
  assert.deepEqual(normalizePrivateSkinSettings({ visibility: Number.NaN, zoom: Infinity }), {
    visibility: 72,
    overlay: 42,
    blur: 2,
    zoom: 110,
    positionX: 50,
    positionY: 50,
  });
});

test("private ids expose expiry but retain 192 bits of randomness", () => {
  const id = createPrivateSkinId({
    now: new Date("2026-07-19T00:00:00Z"),
    randomBytes: () => Buffer.alloc(24, 7),
  });
  const parsed = parsePrivateSkinId(id);
  assert.equal(parsed.expiresAt.toISOString(), "2026-07-20T00:00:00.000Z");
  assert.match(id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
});

test("private ids reject malformed tokens before storage lookup", () => {
  for (const id of ["", "tomorrow.short", "abc!bad.value", "abc/def", "abc." + "a".repeat(31)]) {
    assert.throws(() => parsePrivateSkinId(id), { code: "E_INVALID_ID" });
  }
});

test("palette remains dark and readable", () => {
  const palette = derivePalette({ red: 210, green: 70, blue: 120 });
  assert.match(palette.accent, /^#[0-9a-f]{6}$/);
  assert.match(palette.surface, /^#[0-9a-f]{6}$/);
  assert.match(palette.ink, /^#[0-9a-f]{6}$/);
  assert.ok(palette.contrast >= 60);
});

test("generated packages contain only local images and safe Codex CSS", () => {
  const serialized = buildPrivateSkinPackage({
    id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: normalizePrivateSkinSettings({}),
    palette: derivePalette({ red: 120, green: 80, blue: 200 }),
  });
  const bundle = validateThemePackage(JSON.parse(serialized));
  assert.deepEqual(lintThemePackage(bundle), []);
  const target = resolveThemeTarget(bundle, "codex");
  assert.deepEqual(Object.keys(target.imageDataUrls).sort(), ["hero", "session-bg"]);
  assert.doesNotMatch(target.css, /@import|url\(\s*["']?https?:/i);
  assert.match(target.css, /background-position: 50% 50%/);
});

test("browser upload accepts only bounded raster sources", () => {
  assert.deepEqual(validateSourceFile({ type: "image/jpeg", size: 200_000 }), { ok: true });
  assert.deepEqual(validateSourceFile({ type: "image/svg+xml", size: 200_000 }), {
    ok: false,
    error: "Choose a JPEG, PNG, or WebP image.",
  });
  assert.deepEqual(validateSourceFile({ type: "image/png", size: 10_000_001 }), {
    ok: false,
    error: "Choose an image smaller than 10 MB.",
  });
});

test("upload request omits filename, palette, and source metadata", () => {
  const body = buildPrivateSkinForm({
    image: new Blob(["x"], { type: "image/webp" }),
    settings: { visibility: 90, unknown: "discard" },
  });
  assert.deepEqual([...body.keys()], ["image", "settings"]);
  assert.deepEqual(JSON.parse(String(body.get("settings"))), normalizePrivateSkinSettings({ visibility: 90 }));
});
