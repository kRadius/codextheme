import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  lintThemePackage,
  THEME_FORMAT,
} from "../../packages/runtime/src/theme/package.mjs";

const themeRoot = path.resolve(import.meta.dirname, "..");

function declarationBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s"));
  assert.ok(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

test("curated themes keep the Codex brand and chevron in the packaged accent", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const brand = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> span.font-openai-sans.font-semibold) > span.font-openai-sans.font-semibold",
  );
  const chevron = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> span.font-openai-sans.font-semibold) > svg",
  );

  for (const block of [brand, chevron]) {
    assert.match(block, /color:\s*var\(--codextheme-accent\)\s*!important/);
    assert.match(block, /filter:\s*drop-shadow\(0 0 7px var\(--codextheme-glow\)\)/);
  }
});

test("curated primary navigation synchronizes text and icons on hover and selection", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const standardState = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground):is(:hover, [aria-current=page], [aria-selected=true], [data-state=active])",
  );
  const groupedState = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is(:hover, [aria-current=page], [aria-selected=true], [data-state=active])",
  );
  const standardText = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground) > .text-token-foreground",
  );
  const standardIcon = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground) > .text-token-foreground svg",
  );
  const groupedText = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground) .text-token-foreground",
  );
  const groupedAction = declarationBlock(
    css,
    "html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground) span button svg",
  );

  for (const block of [standardState, groupedState]) {
    assert.match(block, /--codextheme-sidebar-nav-color:\s*var\(--codextheme-accent\)/);
    assert.match(block, /--codextheme-sidebar-nav-icon-filter:\s*drop-shadow\(0 0 7px var\(--codextheme-glow\)\)/);
  }
  for (const block of [standardText, standardIcon, groupedText, groupedAction]) {
    assert.match(block, /color:\s*var\(--codextheme-sidebar-nav-color,/);
  }
  for (const block of [standardIcon, groupedAction]) {
    assert.match(block, /filter:\s*var\(--codextheme-sidebar-nav-icon-filter, none\)/);
  }
});

test("curated navigation selectors do not broadly recolor sidebar controls", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");

  assert.doesNotMatch(css, /aside\.app-shell-left-panel\s+svg\s*\{/);
  assert.doesNotMatch(css, /aside\.app-shell-left-panel\s+button:hover\s*\{/);
  assert.doesNotMatch(css, /aside\.app-shell-left-panel[^\n{]*\[aria-label/);
});

test("curated sidebar selectors pass the production package linter", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const warnings = lintThemePackage({
    format: THEME_FORMAT,
    schemaVersion: 1,
    theme: { id: "selector-contract", displayName: "Selector Contract", version: "1.0.0" },
    targets: { codex: { css } },
  });

  assert.deepEqual(warnings, []);
});
