import test from "node:test";
import assert from "node:assert/strict";
import { createPrivateSkinService } from "../app/lib/private-skin-service.mjs";
import { createPrivateSkinId, privateSkinPathname } from "../app/lib/private-skin-schema.mjs";

const now = new Date("2026-07-19T00:00:00.000Z");

function harness({ dominant = { red: 100, green: 70, blue: 160 } } = {}) {
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
    dominant,
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
  const result = await app.service.create({ image: Buffer.from("source"), settings: {}, now });
  assert.match(result.id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
  assert.deepEqual(Object.keys(result).sort(), ["command", "expiresAt", "id"]);
  assert.match(result.command, /^npx --yes @codextheme\/cli@0\.2\.3 apply-private /);
  assert.equal(app.blobs.size, 1);
  const stored = JSON.parse([...app.blobs.values()][0]);
  assert.equal(stored.format, "codedrobe-theme");
});

test("legacy service palettes keep stored adaptive skins image-specific", async () => {
  const warm = harness({ dominant: { red: 210, green: 70, blue: 120 } });
  const cool = harness({ dominant: { red: 10, green: 20, blue: 30 } });
  await warm.service.create({ image: Buffer.from("warm"), settings: {}, now });
  await cool.service.create({ image: Buffer.from("cool"), settings: {}, now });

  const warmBundle = JSON.parse([...warm.blobs.values()][0]);
  const coolBundle = JSON.parse([...cool.blobs.values()][0]);
  const warmTheme = warmBundle.targets.codex;
  const coolTheme = coolBundle.targets.codex;
  assert.notEqual(warmTheme.options.baseTheme.accent, coolTheme.options.baseTheme.accent);
  assert.notEqual(warmTheme.options.baseTheme.surface, coolTheme.options.baseTheme.surface);
  assert.notEqual(warmTheme.css, coolTheme.css);
  assert.match(warmTheme.css, new RegExp(`--codextheme-accent: ${warmTheme.options.baseTheme.accent}`));
  assert.match(warmTheme.css, new RegExp(`--codextheme-surface: ${warmTheme.options.baseTheme.surface}`));
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
  assert.equal(JSON.parse(result.serialized).format, "codedrobe-theme");
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
