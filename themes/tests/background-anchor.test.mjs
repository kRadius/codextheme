import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const themeRoot = path.resolve(import.meta.dirname, "..");

function declarationBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s"));
  assert.ok(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

test("curated Home and Session artwork share the fixed window coordinate system", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const homeWindow = declarationBlock(css, "html.codextheme-codex-skin body:has(.dream-home)::before");
  const homeSurface = declarationBlock(css, "html.codextheme-codex-skin .dream-home");

  assert.match(homeWindow, /var\(--codextheme-image-hero\)/);
  assert.doesNotMatch(homeSurface, /var\(--codextheme-image-hero\)/);
  assert.doesNotMatch(css, /codedrobe/iu);
});
