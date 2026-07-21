# Curated Sidebar Brand and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Codex sidebar brand in each curated preset's accent color and synchronize primary-navigation text and icons with that accent on hover and selected states.

**Architecture:** Add narrowly scoped structural selectors to the existing curated-theme stylesheet, using the verified brand span and `text-token-foreground` navigation-content anchors rather than localized labels. Lock the behavior with a focused CSS contract test, regenerate all six bundled theme packages through the existing packer, then verify computed styles in the live Codex renderer.

**Tech Stack:** CSS, Node.js `node:test`, npm workspaces, CodexTheme package builder, local Codex CDP renderer.

---

## File Map

- Create `themes/tests/sidebar-brand-navigation.test.mjs`: focused contract tests for the brand, standard navigation rows, the grouped New task row, and forbidden broad selectors.
- Modify `themes/shared/codex.css`: shared curated-theme brand and primary-navigation color/filter states.
- Regenerate `packages/cli/themes/*.codextheme-theme`: six packaged theme artifacts produced from the shared CSS and per-theme accent tokens.

No runtime, CLI source, website component, preview generator, or theme image file changes.

### Task 1: Lock the DOM contract with failing tests

**Files:**
- Create: `themes/tests/sidebar-brand-navigation.test.mjs`
- Read: `themes/shared/codex.css`

- [ ] **Step 1: Write the focused CSS contract test**

Create `themes/tests/sidebar-brand-navigation.test.mjs` with:

```js
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
  const standardText = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > div.text-token-foreground',
  );
  const standardIcon = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > div.text-token-foreground svg',
  );
  const groupedText = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > button > div.text-token-foreground',
  );
  const groupedAction = declarationBlock(
    css,
    'html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > span > button > svg',
  );

  for (const block of [standardText, standardIcon, groupedText, groupedAction]) {
    assert.match(block, /color:\s*var\(--codextheme-accent\)\s*!important/);
  }
  for (const block of [standardIcon, groupedAction]) {
    assert.match(block, /filter:\s*drop-shadow\(0 0 7px var\(--codextheme-glow\)\)/);
  }
});

test("curated navigation selectors do not broadly recolor sidebar controls", async () => {
  const css = await fs.readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");

  assert.doesNotMatch(css, /aside\.app-shell-left-panel\s+svg\s*\{/);
  assert.doesNotMatch(css, /aside\.app-shell-left-panel\s+button:hover\s*\{/);
  assert.doesNotMatch(css, /aside\.app-shell-left-panel[^\n{]*\[aria-label/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
node --test themes/tests/sidebar-brand-navigation.test.mjs
```

Expected: the first two tests fail because the permanent brand and scoped primary-navigation rules do not exist; the broad-selector safety test passes.

- [ ] **Step 3: Commit the failing contract**

```bash
git add themes/tests/sidebar-brand-navigation.test.mjs
git commit -m "test(themes): define sidebar brand navigation contract"
```

### Task 2: Implement the shared curated-theme states

**Files:**
- Modify: `themes/shared/codex.css`
- Test: `themes/tests/sidebar-brand-navigation.test.mjs`

- [ ] **Step 1: Add permanent brand rules**

Add below the sidebar surface rule:

```css
html.codextheme-codex-skin aside.app-shell-left-panel button:has(> span.font-openai-sans.font-semibold) > span.font-openai-sans.font-semibold {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px var(--codextheme-glow));
  transition: color .16s ease, filter .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel button:has(> span.font-openai-sans.font-semibold) > svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px var(--codextheme-glow));
  transition: color .16s ease, filter .16s ease;
}
```

- [ ] **Step 2: Add standard-row hover and selected rules**

Add before the existing project/session row rules:

```css
html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground) > div.text-token-foreground,
html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground) > div.text-token-foreground svg {
  transition: color .16s ease, filter .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > div.text-token-foreground {
  color: var(--codextheme-accent) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel button:has(> div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > div.text-token-foreground svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px var(--codextheme-glow));
}
```

- [ ] **Step 3: Add grouped New task row rules**

Add:

```css
html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground) > button > div.text-token-foreground,
html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground) > button > div.text-token-foreground svg,
html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground) > span > button > svg {
  transition: color .16s ease, filter .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > button > div.text-token-foreground {
  color: var(--codextheme-accent) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > button > div.text-token-foreground svg,
html.codextheme-codex-skin aside.app-shell-left-panel div.group:has(> button > div.text-token-foreground):is(:hover, [aria-current="page"], [aria-selected="true"], [data-state="active"]) > span > button > svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px var(--codextheme-glow));
}
```

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run:

```bash
node --test themes/tests/sidebar-brand-navigation.test.mjs themes/tests/background-anchor.test.mjs
```

Expected: all focused tests pass, including the existing project/session icon and scope assertions.

- [ ] **Step 5: Commit the shared CSS**

```bash
git add themes/shared/codex.css
git commit -m "feat(themes): accent sidebar brand navigation"
```

### Task 3: Regenerate and verify all curated packages

**Files:**
- Modify: `packages/cli/themes/aurora-glass.codextheme-theme`
- Modify: `packages/cli/themes/cathedral-nocturne.codextheme-theme`
- Modify: `packages/cli/themes/crimson-eclipse.codextheme-theme`
- Modify: `packages/cli/themes/crimson-procession.codextheme-theme`
- Modify: `packages/cli/themes/midnight-circuit.codextheme-theme`
- Modify: `packages/cli/themes/silver-reliquary.codextheme-theme`

- [ ] **Step 1: Rebuild the bundled themes**

Run:

```bash
npm run themes:build
```

Expected: `Packed and verified 6 Codex themes.` and the six package artifacts contain the new rules with their own locked accent values.

- [ ] **Step 2: Run the package and namespace checks**

Run:

```bash
node --test themes/tests/package-namespace.test.mjs packages/runtime/tests/theme-package.test.mjs
node scripts/check-packages.mjs
node scripts/check-product-namespace.mjs
```

Expected: every command exits 0; no `codedrobe` namespace appears in bundled output.

- [ ] **Step 3: Run the complete repository check**

Run:

```bash
npm run check
```

Expected: typecheck, all tests, theme build, site build, package check, and namespace check all pass.

- [ ] **Step 4: Commit regenerated packages**

```bash
git add packages/cli/themes/*.codextheme-theme
git commit -m "build(themes): repack sidebar brand accents"
```

### Task 4: Apply and verify in the real Codex renderer

**Files:**
- Inspect: live Codex renderer on `127.0.0.1:9335`
- Inspect: active Cathedral Nocturne package

- [ ] **Step 1: Hot-reapply Cathedral Nocturne through the first-party CodexTheme CLI**

Run in an interactive PTY:

```bash
node packages/cli/src/bin.mjs reapply
```

Expected: exit 0 and active Cathedral Nocturne CSS updates without a restart while the renderer endpoint is live. If the endpoint is absent, stop and ask before any restart.

- [ ] **Step 2: Verify computed styles and negative controls**

Using the existing runtime CDP session, inspect the real renderer and require:

```js
{
  brandText: { color: "rgb(199, 164, 90)", filterContainsDropShadow: true },
  brandChevron: { color: "rgb(199, 164, 90)", filterContainsDropShadow: true },
  idleNavigation: { colorIsAccent: false },
  hoveredNavigation: { color: "rgb(199, 164, 90)", iconColor: "rgb(199, 164, 90)" },
  groupedNewTask: { textColor: "rgb(199, 164, 90)", actionIconColor: "rgb(199, 164, 90)" },
  search: { colorIsAccent: false },
  projectsHeading: { colorIsAccent: false },
}
```

Expected: every condition is true. Dispatch synthetic mouse movement only for hover inspection; do not click navigation or alter task state.

- [ ] **Step 3: Run geometry checks at desktop and narrow widths**

Evaluate the sidebar at the current desktop viewport and a narrow viewport, requiring:

```js
{
  horizontalOverflow: 0,
  clippedInteractiveControls: 0,
  titleActionOverlaps: 0,
}
```

Expected: all values remain zero. Restore the original viewport after the narrow check.

- [ ] **Step 4: Capture a real screenshot and inspect it**

Capture the active Codex window with the permanent gold brand and one hovered navigation row visible. Confirm no search, section-heading, footer, or idle-row color leakage.

- [ ] **Step 5: Record final verification without publishing**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: only intentional commits exist and no uncommitted files remain. Report the focused-test results, full-check results, live computed-style results, and screenshot path. Do not publish CLI `0.2.6`, merge, push, or deploy in this task.
