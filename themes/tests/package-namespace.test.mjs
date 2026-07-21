import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const packageRoot = path.resolve(import.meta.dirname, "..", "..", "packages", "cli", "themes");

test("bundled theme packages use only the CodexTheme product namespace", async () => {
  const filenames = (await fs.readdir(packageRoot))
    .filter((filename) => filename.endsWith(".codextheme-theme"))
    .sort();
  assert.equal(filenames.length, 6);

  for (const filename of filenames) {
    const serialized = await fs.readFile(path.join(packageRoot, filename), "utf8");
    const bundle = JSON.parse(serialized);
    assert.equal(bundle.format, "codextheme-theme", filename);
    assert.doesNotMatch(serialized, /codedrobe/iu, filename);
    assert.match(bundle.targets.codex.css, /html\.codextheme-codex-skin/u, filename);
    assert.match(bundle.targets.codex.css, /--codextheme-image-hero/u, filename);
    assert.match(
      bundle.targets.codex.css,
      new RegExp(`--codextheme-accent: ${bundle.targets.codex.options.baseTheme.accent};`, "u"),
      `${filename} must render with its packaged accent instead of Codex's global primary color`,
    );
  }
});
