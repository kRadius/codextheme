import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "themes", "catalog.json");

const launchSlugs = [
  "midnight-circuit",
  "crimson-eclipse",
  "aurora-glass",
  "ink-mountain",
  "pixel-terminal",
  "neon-tokyo",
  "obsidian-gold",
  "sakura-observatory",
  "abyss-station",
];

test("catalog contains the nine repository launch themes", async () => {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

  assert.deepEqual(catalog.map((theme) => theme.slug), launchSlugs);
  assert.equal(new Set(catalog.map((theme) => theme.name)).size, catalog.length);
  assert.equal(new Set(catalog.map((theme) => theme.nameZh)).size, catalog.length);
  assert.equal(catalog.filter((theme) => theme.status === "available").length, 3);
  assert.equal(catalog.filter((theme) => theme.status === "coming-soon").length, 6);

  for (const theme of catalog) {
    assert.match(theme.accent, /^#[0-9a-f]{6}$/i);
    assert.match(theme.surface, /^#[0-9a-f]{6}$/i);
    assert.equal(typeof theme.description, "string");
    assert.ok(theme.description.length >= 12);
    assert.equal(typeof theme.descriptionZh, "string");
    assert.ok(theme.descriptionZh.length >= 8);
    assert.equal(typeof theme.series, "string");
    assert.ok(theme.series.length >= 3);
    assert.ok(Array.isArray(theme.tags));
    assert.ok(theme.tags.length >= 2);
    assert.equal(theme.author, "CodexTheme Studio");
    assert.equal(theme.compatibility, "Codex Desktop / macOS");
    assert.match(theme.updatedAt, /^2026-\d{2}-\d{2}$/);
    assert.ok(theme.previewHome === null || theme.previewHome === `themes/${theme.slug}/previews/home.png`);
    assert.ok(theme.previewSession === null || theme.previewSession === `themes/${theme.slug}/previews/session.png`);
    if (theme.status === "available") {
      assert.equal(theme.source, `themes/${theme.slug}/theme.json`);
      assert.equal(theme.command, `npx --yes @codextheme/cli@0.1.0 apply ${theme.slug}`);
    } else {
      assert.equal(theme.source, null);
      assert.equal(theme.command, null);
    }
  }
});

test("available themes use owned artifact names and canonical timestamps", async () => {
  const artifactDirectory = path.join(root, "packages", "cli", "themes");
  const artifacts = (await fs.readdir(artifactDirectory)).sort();
  assert.deepEqual(artifacts, [
    "aurora-glass.codextheme-theme",
    "crimson-eclipse.codextheme-theme",
    "midnight-circuit.codextheme-theme",
  ]);
  for (const slug of ["midnight-circuit", "crimson-eclipse", "aurora-glass"]) {
    const bundle = JSON.parse(await fs.readFile(
      path.join(artifactDirectory, `${slug}.codextheme-theme`),
      "utf8",
    ));
    assert.equal(bundle.exportedAt, "2026-07-18T00:00:00.000Z");
  }
});
