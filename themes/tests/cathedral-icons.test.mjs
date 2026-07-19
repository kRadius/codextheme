import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import test from "node:test";

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
