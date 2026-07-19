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
const previewIconsUrl = new URL("../scripts/cathedral-preview-icons.mjs", import.meta.url);

test("Cathedral preview icons reuse the complete packaged PNG set deterministically", async () => {
  let helpers;
  await assert.doesNotReject(async () => {
    helpers = await import(previewIconsUrl);
  });

  const cathedral = catalog.find(({ slug }) => slug === "cathedral-nocturne");
  const manifest = JSON.parse(await readFile(path.join(repoRoot, cathedral.source), "utf8"));
  const icons = await helpers.loadCathedralPreviewIcons({
    themeRoot: path.join(repoRoot, "themes"),
    slug: cathedral.slug,
    manifest,
  });

  assert.equal(Object.keys(icons).length, 11);
  for (const dataUrl of Object.values(icons)) assert.match(dataUrl, /^data:image\/png;base64,/);
  const first = helpers.previewIconImage(icons, "icon-explore", { x: 100, y: 120, size: 32 });
  const second = helpers.previewIconImage(icons, "icon-explore", { x: 100, y: 120, size: 32 });
  assert.equal(first, second);
  assert.match(first, /<image /);
  assert.match(first, /preserveAspectRatio="xMidYMid meet"/);

  assert.deepEqual(await helpers.loadCathedralPreviewIcons({
    themeRoot: path.join(repoRoot, "themes"),
    slug: "silver-reliquary",
    manifest: {},
  }), {});
});

test("preview generator writes every catalog preview to the requested public root", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "codextheme-previews-"));

  try {
    await execFileAsync(process.execPath, ["themes/scripts/generate-previews.mjs"], {
      cwd: repoRoot,
      env: { ...process.env, CODEXTHEME_PREVIEW_ROOT: outputRoot },
    });

    const firstPass = new Map();
    for (const theme of catalog) {
      for (const previewPath of [theme.previewHome, theme.previewSession]) {
        const generated = path.join(outputRoot, previewPath);
        await access(generated);
        const metadata = await sharp(generated).metadata();
        assert.deepEqual([metadata.width, metadata.height], [1600, 1000]);
        firstPass.set(previewPath, await readFile(generated));
      }
    }

    await execFileAsync(process.execPath, ["themes/scripts/generate-previews.mjs"], {
      cwd: repoRoot,
      env: { ...process.env, CODEXTHEME_PREVIEW_ROOT: outputRoot },
    });
    for (const [previewPath, first] of firstPass) {
      assert.deepEqual(await readFile(path.join(outputRoot, previewPath)), first);
    }
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
