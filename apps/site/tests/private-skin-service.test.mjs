import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import {
  createPrivateSkinService,
  normalizeUploadedImage,
} from "../app/lib/private-skin-service.mjs";
import { createPrivateSkinId, privateSkinPathname } from "../app/lib/private-skin-schema.mjs";
import { analyzeImagePixels, deriveSkinTokens } from "../app/lib/private-skin-profile.mjs";

const now = new Date("2026-07-19T00:00:00.000Z");

const DEFAULT_SAMPLE = {
  data: new Uint8Array([
    230, 40, 80,
    30, 190, 210,
    60, 70, 220,
    240, 180, 30,
  ]),
  width: 2,
  height: 2,
  channels: 3,
};

function harness({ sample = DEFAULT_SAMPLE } = {}) {
  const blobs = new Map();
  const calls = [];
  const blob = {
    async put(pathname, body) {
      calls.push(["put", pathname]);
      blobs.set(pathname, String(body));
      return { pathname };
    },
    async get(pathname) {
      calls.push(["get", pathname]);
      const body = blobs.get(pathname);
      return body === undefined ? null : { body };
    },
    async list() {
      calls.push(["list"]);
      return {
        blobs: [...blobs].map(([pathname]) => ({ pathname, url: `memory://${pathname}` })),
        hasMore: false,
        cursor: undefined,
      };
    },
    async del(urls) {
      const values = Array.isArray(urls) ? urls : [urls];
      calls.push(["del", values]);
      for (const url of values) blobs.delete(url.replace("memory://", ""));
    },
  };
  const imageProcessor = async () => ({
    buffer: Buffer.from("normalized-webp"),
    width: 1600,
    height: 1000,
    sample,
  });
  const service = createPrivateSkinService({
    blob,
    imageProcessor,
    randomBytes: () => Buffer.alloc(24, 9),
  });
  return { blobs, calls, service };
}

test("create stores one private package and returns no blob url", async () => {
  const app = harness();
  const result = await app.service.create({
    image: Buffer.from("source"),
    settings: { recipe: "focus" },
    now,
  });
  assert.match(result.id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
  assert.deepEqual(Object.keys(result).sort(), ["command", "expiresAt", "id"]);
  assert.match(result.command, /^npx --yes @codextheme\/cli@0\.2\.6 apply-private /);
  assert.equal(app.blobs.size, 1);
  const stored = JSON.parse([...app.blobs.values()][0]);
  assert.equal(stored.format, "codextheme-theme");
  assert.doesNotMatch(JSON.stringify(stored), /codedrobe/iu);
  const target = stored.targets.codex;
  assert.match(target.css, /main\.main-surface\s*\{[^}]*backdrop-filter: blur\(0px\)/su);
  assert.match(target.css, /var\(--codextheme-surface\) 94%/u);
  assert.match(target.css, /var\(--codextheme-surface-raised\) 98%/u);
  assert.notEqual(target.options.baseTheme.accent, "#c4b5fd");
});

test("server-analyzed samples keep stored adaptive skins image-specific", async () => {
  const warmSample = {
    data: new Uint8Array([220, 35, 65, 210, 60, 80, 245, 160, 30, 180, 40, 55]),
    width: 2,
    height: 2,
    channels: 3,
  };
  const coolSample = {
    data: new Uint8Array([20, 80, 220, 45, 190, 210, 30, 50, 150, 75, 40, 210]),
    width: 2,
    height: 2,
    channels: 3,
  };
  const warm = harness({ sample: warmSample });
  const cool = harness({ sample: coolSample });
  await warm.service.create({ image: Buffer.from("warm"), settings: {}, now });
  await cool.service.create({ image: Buffer.from("cool"), settings: {}, now });

  const warmBundle = JSON.parse([...warm.blobs.values()][0]);
  const coolBundle = JSON.parse([...cool.blobs.values()][0]);
  const warmTheme = warmBundle.targets.codex;
  const coolTheme = coolBundle.targets.codex;
  assert.notEqual(warmTheme.options.baseTheme.accent, coolTheme.options.baseTheme.accent);
  assert.notEqual(warmTheme.options.baseTheme.surface, coolTheme.options.baseTheme.surface);
  assert.notEqual(warmTheme.css, coolTheme.css);
  const expectedWarm = deriveSkinTokens(analyzeImagePixels(warmSample), {});
  const expectedCool = deriveSkinTokens(analyzeImagePixels(coolSample), {});
  assert.equal(warmTheme.options.baseTheme.accent, expectedWarm.accent);
  assert.equal(warmTheme.options.baseTheme.surface, expectedWarm.surface);
  assert.equal(coolTheme.options.baseTheme.accent, expectedCool.accent);
  assert.equal(coolTheme.options.baseTheme.surface, expectedCool.surface);
  assert.match(warmTheme.css, new RegExp(`--codextheme-accent: ${warmTheme.options.baseTheme.accent}`));
  assert.match(warmTheme.css, new RegExp(`--codextheme-surface: ${warmTheme.options.baseTheme.surface}`));
});

test("normalization returns a bounded 32 by 32 RGB sample without dominant stats", async () => {
  const source = await sharp({
    create: {
      width: 800,
      height: 500,
      channels: 4,
      background: { r: 170, g: 55, b: 110, alpha: 0.55 },
    },
  }).png().toBuffer();

  const normalized = await normalizeUploadedImage(source);
  assert.ok(normalized.buffer.byteLength <= 900_000);
  assert.equal(normalized.sample.data instanceof Uint8Array, true);
  assert.deepEqual(normalized.sample, {
    data: normalized.sample.data,
    width: 32,
    height: 32,
    channels: 3,
  });
  assert.ok(normalized.sample.data.byteLength <= 4096);
  assert.deepEqual(Object.keys(normalized).sort(), ["buffer", "height", "sample", "width"]);
  assert.equal(Object.hasOwn(normalized, "dominant"), false);
});

test("normalization validates minimum dimensions after EXIF orientation", async () => {
  const orientedTooNarrow = await sharp({
    create: {
      width: 800,
      height: 500,
      channels: 3,
      background: { r: 35, g: 90, b: 180 },
    },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  await assert.rejects(
    () => normalizeUploadedImage(orientedTooNarrow),
    { code: "E_IMAGE_TOO_SMALL" },
  );

  const orientedValid = await sharp({
    create: {
      width: 500,
      height: 800,
      channels: 3,
      background: { r: 35, g: 90, b: 180 },
    },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const oriented = await normalizeUploadedImage(orientedValid);
  assert.equal(oriented.width, 800);
  assert.equal(oriented.height, 500);
  assert.deepEqual(
    { width: oriented.sample.width, height: oriented.sample.height, channels: oriented.sample.channels },
    { width: 32, height: 32, channels: 3 },
  );
});

test("create snapshots supported byte views from other realms and shared storage", async () => {
  const shared = new SharedArrayBuffer(3);
  new Uint8Array(shared).set([210, 70, 120]);
  const samples = [
    new Uint8ClampedArray([210, 70, 120]),
    Buffer.alloc(3, 120),
    runInNewContext("new Uint8Array([210, 70, 120])"),
    new Uint8Array(shared),
  ];
  for (const data of samples) {
    const app = harness({ sample: { data, width: 1, height: 1, channels: 3 } });
    await app.service.create({ image: Buffer.from("source"), settings: {}, now });
    assert.equal(app.blobs.size, 1);
  }
});

test("create rejects unsafe processed samples before storage", async () => {
  const backing = new ArrayBuffer(1_000_000);
  const tiny = new Uint8Array(backing, 0, 3);
  const disguisedFloat = new Float32Array([10, 20, 30]);
  Object.defineProperty(disguisedFloat, Symbol.toStringTag, { value: "Uint8Array" });
  const shadowedTiny = new Uint8Array(new ArrayBuffer(1_000_000), 0, 3);
  Object.defineProperties(shadowedTiny, {
    buffer: { value: new ArrayBuffer(3) },
    byteLength: { value: 3 },
  });
  const invalidSamples = [
    { data: [10, 20, 30], width: 1, height: 1, channels: 3 },
    { data: new Uint8Array(3), width: 1, height: 1, channels: 2 },
    { data: new Uint8Array(3), width: 0, height: 1, channels: 3 },
    { data: new Uint8Array(3), width: 1.5, height: 1, channels: 3 },
    { data: new Uint8Array(3), width: Number.MAX_SAFE_INTEGER, height: 2, channels: 3 },
    { data: new Uint8Array(65 * 65 * 3), width: 65, height: 65, channels: 3 },
    { data: new Uint8Array(11), width: 2, height: 2, channels: 3 },
    { data: new Uint8Array(1_000_000), width: 1, height: 1, channels: 3 },
    { data: tiny, width: 1, height: 1, channels: 3 },
    { data: new Float32Array([10, 20, 30]), width: 1, height: 1, channels: 3 },
    { data: new Uint16Array([10, 20, 30]), width: 1, height: 1, channels: 3 },
    { data: disguisedFloat, width: 1, height: 1, channels: 3 },
    { data: shadowedTiny, width: 1, height: 1, channels: 3 },
  ];
  for (const sample of invalidSamples) {
    const app = harness({ sample });
    await assert.rejects(
      () => app.service.create({ image: Buffer.from("source"), settings: {}, now }),
      { code: "E_INVALID_UPLOAD" },
    );
    assert.equal(app.blobs.size, 0);
  }
});

test("retrieval rejects expiry before reading storage", async () => {
  const app = harness();
  const id = createPrivateSkinId({ now, randomBytes: () => Buffer.alloc(24, 8) });
  await assert.rejects(
    () => app.service.retrieve(id, new Date("2026-07-20T00:00:00.001Z")),
    { code: "E_EXPIRED" },
  );
  assert.equal(app.calls.some(([name]) => name === "get"), false);
});

test("retrieval returns a stored unexpired package and hides storage location", async () => {
  const app = harness();
  const created = await app.service.create({ image: Buffer.from("source"), settings: {}, now });
  const result = await app.service.retrieve(created.id, new Date("2026-07-19T02:00:00Z"));
  assert.deepEqual(Object.keys(result).sort(), ["serialized", "sha256"]);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.parse(result.serialized).format, "codextheme-theme");
});

test("retrieval maps absent storage to a stable not-found error", async () => {
  const app = harness();
  const id = createPrivateSkinId({ now, randomBytes: () => Buffer.alloc(24, 6) });
  await assert.rejects(() => app.service.retrieve(id, now), { code: "E_NOT_FOUND" });
});

test("cleanup removes only expired private skin paths", async () => {
  const app = harness();
  const expired = createPrivateSkinId({
    now: new Date("2026-07-17T00:00:00Z"),
    randomBytes: () => Buffer.alloc(24, 3),
  });
  const active = createPrivateSkinId({ now, randomBytes: () => Buffer.alloc(24, 4) });
  app.blobs.set(privateSkinPathname(expired), "old");
  app.blobs.set(privateSkinPathname(active), "new");
  app.blobs.set("other/value", "untouched");

  assert.deepEqual(await app.service.cleanup(now), { scanned: 2, deleted: 1 });
  assert.equal(app.blobs.has(privateSkinPathname(expired)), false);
  assert.equal(app.blobs.has(privateSkinPathname(active)), true);
  assert.equal(app.blobs.has("other/value"), true);
});
