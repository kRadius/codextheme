import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "../..");
const catalog = JSON.parse(await readFile(path.join(repoRoot, "themes/catalog.json"), "utf8"));

test("preview generator writes every catalog preview to the requested public root", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "codextheme-previews-"));

  try {
    await execFileAsync(process.execPath, ["themes/scripts/generate-previews.mjs"], {
      cwd: repoRoot,
      env: { ...process.env, CODEXTHEME_PREVIEW_ROOT: outputRoot },
    });

    for (const theme of catalog) {
      for (const previewPath of [theme.previewHome, theme.previewSession]) {
        const generated = path.join(outputRoot, previewPath);
        await access(generated);
        const metadata = await sharp(generated).metadata();
        assert.deepEqual([metadata.width, metadata.height], [1600, 1000]);
      }
    }
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("preview generator uses the approved B-strength interaction hierarchy", async () => {
  const source = await readFile(path.join(repoRoot, "themes/scripts/generate-previews.mjs"), "utf8");

  assert.match(source, /const INTERACTION = Object\.freeze\(\{\s*line: "\.48",\s*hover: "\.16",\s*selected: "\.21",\s*glow: "\.14",\s*\}\);/s);
  assert.match(source, /fill-opacity="\$\{INTERACTION\.selected\}" stroke="\$\{accent\}" stroke-opacity="\$\{INTERACTION\.line\}"/);
  assert.match(source, /fill-opacity="\$\{INTERACTION\.hover\}" stroke="\$\{accent\}" stroke-opacity="\$\{INTERACTION\.line\}"/);
});
