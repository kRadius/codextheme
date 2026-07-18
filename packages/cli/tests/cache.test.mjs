import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPrivateCache } from "../src/cache.mjs";

test("private cache writes content-addressed owner-only packages", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "codextheme-cache-"));
  try {
    const cache = createPrivateCache({ home });
    const first = await cache.write("private package\n");
    const second = await cache.write("private package\n");
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.equal(await cache.read(first), "private package\n");
    assert.equal((await fs.stat(cache.directory)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(cache.filename(first))).mode & 0o777, 0o600);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("private cache rejects invalid keys and detects changed bytes", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "codextheme-cache-"));
  try {
    const cache = createPrivateCache({ home });
    await assert.rejects(() => cache.read("../bad"), { code: "E_PRIVATE_CACHE" });
    const key = await cache.write("original");
    await fs.writeFile(cache.filename(key), "changed", "utf8");
    await assert.rejects(() => cache.read(key), { code: "E_PRIVATE_CACHE" });
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});
