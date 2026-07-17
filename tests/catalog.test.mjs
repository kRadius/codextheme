import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "themes", "catalog.json");

test("catalog contains only the three curated launch themes", async () => {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

  assert.deepEqual(catalog.map((theme) => theme.slug), [
    "midnight-circuit",
    "crimson-eclipse",
    "aurora-glass",
  ]);
  assert.equal(new Set(catalog.map((theme) => theme.name)).size, catalog.length);
  assert.equal(new Set(catalog.map((theme) => theme.nameZh)).size, catalog.length);

  for (const theme of catalog) {
    assert.match(theme.accent, /^#[0-9a-f]{6}$/i);
    assert.match(theme.surface, /^#[0-9a-f]{6}$/i);
    assert.equal(theme.source, `themes/${theme.slug}/theme.json`);
    assert.equal(theme.command, `npx --yes @codextheme/cli@0.1.0 apply ${theme.slug}`);
    assert.equal(typeof theme.description, "string");
    assert.ok(theme.description.length >= 12);
    assert.equal(typeof theme.descriptionZh, "string");
    assert.ok(theme.descriptionZh.length >= 8);
  }
});
