import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "themes", "catalog.json");

const launchSlugs = [
  "cathedral-nocturne",
  "crimson-procession",
  "silver-reliquary",
];

test("catalog contains only the three finished gothic flagship themes", async () => {
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

  assert.deepEqual(catalog.map((theme) => theme.slug), launchSlugs);
  assert.equal(new Set(catalog.map((theme) => theme.name)).size, catalog.length);
  assert.equal(new Set(catalog.map((theme) => theme.nameZh)).size, catalog.length);
  assert.equal(catalog.every((theme) => theme.status === "available"), true);

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
    assert.equal(theme.previewHome, `themes/${theme.slug}/previews/home-v012.png`);
    assert.equal(theme.previewSession, `themes/${theme.slug}/previews/session-v012.png`);
    assert.equal(theme.source, `themes/${theme.slug}/theme.json`);
    assert.equal(theme.command, `npx --yes @codextheme/cli@0.2.5 apply ${theme.slug}`);
  }
});

test("new themes ship alongside legacy CLI artifacts", async () => {
  const artifactDirectory = path.join(root, "packages", "cli", "themes");
  const artifacts = (await fs.readdir(artifactDirectory)).sort();
  assert.deepEqual(artifacts, [
    "aurora-glass.codextheme-theme",
    "cathedral-nocturne.codextheme-theme",
    "crimson-eclipse.codextheme-theme",
    "crimson-procession.codextheme-theme",
    "midnight-circuit.codextheme-theme",
    "silver-reliquary.codextheme-theme",
  ]);
  for (const slug of launchSlugs) {
    const bundle = JSON.parse(await fs.readFile(
      path.join(artifactDirectory, `${slug}.codextheme-theme`),
      "utf8",
    ));
    assert.equal(bundle.exportedAt, "2026-07-18T00:00:00.000Z");
  }
});
