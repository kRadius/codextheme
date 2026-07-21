# Curated Theme Icon Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color the native icon in hovered and selected Codex sidebar project/session rows with each bundled theme's packaged accent and a restrained glow.

**Architecture:** Extend the existing narrowly scoped curated-theme sidebar state rules in `themes/shared/codex.css`. Keep native SVG geometry and text untouched, rebuild the six bundled packages, and verify both CSS contracts and computed styles in the live Codex renderer.

**Tech Stack:** CSS, Node.js test runner, CodexTheme package builder, Chrome DevTools Protocol.

---

### Task 1: Lock the scoped icon behavior with a failing test

**Files:**
- Modify: `themes/tests/background-anchor.test.mjs`

- [ ] **Step 1: Add the failing CSS contract assertions**

Extend `curated interaction rules stay scoped to observed Codex surfaces` to read the hover and selected icon blocks using these exact selectors:

```js
const sidebarHoverIcon = declarationBlock(
  css,
  'html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:hover svg',
);
const sidebarSelectedIcon = declarationBlock(
  css,
  'html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group[aria-current="page"] svg',
);
for (const block of [sidebarHoverIcon, sidebarSelectedIcon]) {
  assert.match(block, /color:\s*var\(--codextheme-accent\)/);
  assert.match(block, /filter:\s*drop-shadow\(0 0 7px var\(--codextheme-glow\)\)/);
}
assert.doesNotMatch(css, /codextheme-codex-skin\s+svg\s*\{/);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs
```

Expected: FAIL because the two scoped SVG rules do not exist.

### Task 2: Implement the B-strength icon treatment

**Files:**
- Modify: `themes/shared/codex.css`
- Test: `themes/tests/background-anchor.test.mjs`

- [ ] **Step 1: Add the smallest scoped CSS rules**

Add:

```css
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group svg {
  transition: color .16s ease, filter .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:hover svg,
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group[aria-current="page"] svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px var(--codextheme-glow));
}
```

If the existing test helper cannot read a comma-separated selector, split the two state rules while keeping the declarations identical.

- [ ] **Step 2: Run the focused tests and confirm GREEN**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs themes/tests/package-namespace.test.mjs
```

Expected: all tests pass.

- [ ] **Step 3: Rebuild bundled themes**

Run:

```bash
npm run themes:build
```

Expected: six theme packages generated and verified.

- [ ] **Step 4: Commit the behavior**

```bash
git add themes/shared/codex.css themes/tests/background-anchor.test.mjs packages/cli/themes
git commit -m "feat(themes): accent interactive sidebar icons"
```

### Task 3: Verify release and real Codex behavior

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete repository check**

Run:

```bash
npm run check
```

Expected: type checks, theme tests, CLI tests, runtime tests, site tests, builds, package checks, and namespace checks all pass.

- [ ] **Step 2: Reapply the current Cathedral theme**

Run:

```bash
node packages/cli/src/bin.mjs reapply
```

Expected: Cathedral Nocturne reapplies and verifies without restarting Codex.

- [ ] **Step 3: Inspect live computed styles**

Use CDP on `127.0.0.1:9335` to hover a safe sidebar project row and confirm:

```text
hover icon color = rgb(199, 164, 90)
selected icon color = rgb(199, 164, 90)
hover and selected icon filter include a restrained drop-shadow
idle icon does not receive the curated accent rule
```

- [ ] **Step 4: Capture a real Codex screenshot and stop before publishing**

Save the sidebar detail screenshot under `/private/tmp`, inspect it, and present it for user approval. Do not publish npm or merge until the user approves the real-app result.
