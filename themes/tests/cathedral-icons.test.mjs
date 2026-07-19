import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildThemePackage, MAX_THEME_PACKAGE_BYTES } from "@codextheme/runtime";
import sharp from "sharp";
import test from "node:test";
import { CATHEDRAL_ICON_IDS } from "../scripts/generate-cathedral-icons.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "../..");
const themeRoot = path.join(repoRoot, "themes");

const ICON_IDS = [
  "icon-new-chat",
  "icon-pull-requests",
  "icon-scheduled",
  "icon-plugins",
  "icon-project-folder",
  "icon-explore",
  "icon-build",
  "icon-review",
  "icon-fix",
  "icon-add",
  "icon-send",
];

assert.deepEqual(CATHEDRAL_ICON_IDS, ICON_IDS);

test("Cathedral glyph masters render as the closed transparent PNG set", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "codextheme-cathedral-icons-"));

  try {
    await assert.doesNotReject(execFileAsync(process.execPath, [
      "themes/scripts/generate-cathedral-icons.mjs",
    ], {
      cwd: repoRoot,
      env: { ...process.env, CODEXTHEME_ICON_OUTPUT_ROOT: outputRoot },
    }));

    for (const id of ICON_IDS) {
      const metadata = await sharp(path.join(outputRoot, `${id}.png`)).metadata();
      assert.deepEqual(
        [metadata.width, metadata.height, metadata.hasAlpha],
        [96, 96, true],
        `${id} must be a transparent 96px PNG`,
      );

      const source = await readFile(
        path.join(themeRoot, "cathedral-nocturne", "icons-src", `${id}.svg`),
        "utf8",
      );
      assert.match(source, /viewBox="0 0 24 24"/);
      assert.doesNotMatch(
        source.replace("http://www.w3.org/2000/svg", ""),
        /https?:|<script|@import|url\(/i,
      );
    }
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("Cathedral packages exactly the base artwork and closed glyph set", async () => {
  const catalog = JSON.parse(await readFile(path.join(themeRoot, "catalog.json"), "utf8"));
  const baseImages = ["hero", "session-bg"];

  for (const entry of catalog.filter((theme) => theme.status === "available")) {
    const manifestPath = path.join(repoRoot, entry.source);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const { bundle, serialized } = await buildThemePackage(manifestPath, {
      exportedAt: "2026-07-19T00:00:00.000Z",
    });
    const actualIds = Object.keys(bundle.assets.images).sort();
    const expectedIds = entry.slug === "cathedral-nocturne"
      ? [...baseImages, ...CATHEDRAL_ICON_IDS].sort()
      : baseImages;

    assert.deepEqual(actualIds, expectedIds, `${entry.slug} image contract drifted`);
    assert.ok(Buffer.byteLength(serialized) <= MAX_THEME_PACKAGE_BYTES);
    if (entry.slug === "cathedral-nocturne") assert.equal(manifest.version, "1.1.0");
  }
});
