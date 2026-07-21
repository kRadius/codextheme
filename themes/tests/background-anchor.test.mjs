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

test("curated artwork stays sharp behind the main Codex surface", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const mainSurface = declarationBlock(css, "html.codextheme-codex-skin main.main-surface");

  assert.match(mainSurface, /backdrop-filter:\s*blur\(0px\)/);
});

test("curated themes expose the approved B-strength interaction tokens", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const root = declarationBlock(css, ":root.codextheme-codex-skin");

  assert.match(root, /--codextheme-line-strong:\s*color-mix\(in srgb, var\(--codextheme-accent\) 48%, transparent\)/);
  assert.match(root, /--codextheme-hover:\s*color-mix\(in srgb, var\(--codextheme-accent\) 16%, transparent\)/);
  assert.match(root, /--codextheme-selected:\s*color-mix\(in srgb, var\(--codextheme-accent\) 21%, transparent\)/);
  assert.match(root, /--codextheme-glow:\s*color-mix\(in srgb, var\(--codextheme-accent\) 14%, transparent\)/);
  assert.match(root, /--color-token-list-hover-background:\s*var\(--codextheme-hover\)/);
  assert.match(root, /--vscode-list-hoverBackground:\s*var\(--codextheme-hover\)/);
});

test("curated interaction rules stay scoped to observed Codex surfaces", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const sidebarHover = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:hover',
  );
  const sidebarSelected = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel [role="button"][aria-current="page"]',
  );
  const homeHover = declarationBlock(
    css,
    'html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *):hover',
  );

  for (const block of [sidebarHover, sidebarSelected, homeHover]) {
    assert.match(block, /border-color:\s*var\(--codextheme-line-strong\)/);
    assert.match(block, /box-shadow:.*var\(--codextheme-glow\)/s);
  }
  assert.match(sidebarHover, /background:\s*var\(--codextheme-hover\)/);
  assert.match(sidebarSelected, /background:\s*var\(--codextheme-selected\)/);
  assert.doesNotMatch(css, /codextheme-codex-skin\s+:is\([^}]*\):hover/);
});
