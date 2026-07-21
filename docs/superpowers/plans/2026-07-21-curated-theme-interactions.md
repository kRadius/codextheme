# Curated Theme Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every bundled CodexTheme preset the approved B-strength theme-colored borders, hover states, and selected states while keeping uploaded private skins unchanged.

**Architecture:** Extend the shared curated-theme stylesheet with four accent-derived interaction tokens and narrowly scoped Codex state rules. Keep the website previews honest by using the same opacity constants in the SVG preview generator, then rebuild the six bundled theme packages and release them through a CLI patch version.

**Tech Stack:** CSS custom properties and `color-mix()`, Node.js ESM, Node test runner, Sharp SVG-to-PNG generation, CodexTheme runtime/CLI, CDP live verification.

---

## File Map

- `themes/shared/codex.css` — owns shared installed-theme interaction tokens and scoped Codex state styling.
- `themes/tests/background-anchor.test.mjs` — enforces the curated CSS interaction contract and prevents broad unscoped selectors.
- `themes/scripts/generate-previews.mjs` — renders the same selected, hovered, structural-border, and composer-border hierarchy into catalog screenshots.
- `themes/tests/generate-previews.test.mjs` — locks the B-strength preview constants and continues to validate every generated image.
- `packages/cli/themes/*.codextheme-theme` — generated portable bundles containing the updated shared CSS.
- `packages/cli/package.json`, `packages/cli/src/main.mjs`, `packages/cli/README.md`, `packages/cli/tests/main.test.mjs` — prepare CLI `0.2.6` and its pinned self-service commands.
- `themes/catalog.json`, `apps/site/app/lib/private-skin-service.mjs`, `apps/site/app/help/page.tsx`, `apps/site/app/security/page.tsx`, `apps/site/app/themes/[slug]/page.tsx`, `apps/site/tests/install-copy.test.mjs`, `scripts/check-packages.mjs` — keep the website and release checks pinned to CLI `0.2.6`.

### Task 1: Add the B-strength installed-theme interaction system

**Files:**
- Modify: `themes/tests/background-anchor.test.mjs`
- Modify: `themes/shared/codex.css`

- [ ] **Step 1: Write the failing CSS contract tests**

Append tests that require the four exact derived tokens, the native Codex hover token bridge, structural strong borders, scoped sidebar row states, a scoped home-card hover, and the absence of an unscoped global hover rule:

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs
```

Expected: FAIL because the four interaction tokens and scoped state rules do not exist.

- [ ] **Step 3: Add the exact interaction tokens and scoped state rules**

Extend `:root.codextheme-codex-skin`:

```css
--codextheme-line-strong: color-mix(in srgb, var(--codextheme-accent) 48%, transparent);
--codextheme-hover: color-mix(in srgb, var(--codextheme-accent) 16%, transparent);
--codextheme-selected: color-mix(in srgb, var(--codextheme-accent) 21%, transparent);
--codextheme-glow: color-mix(in srgb, var(--codextheme-accent) 14%, transparent);
--color-token-list-hover-background: var(--codextheme-hover);
--vscode-list-hoverBackground: var(--codextheme-hover);
```

Use `var(--codextheme-line-strong)` for the sidebar boundary, main boundary, header boundary, composer border, and `.dream-home::after` border. Add these scoped interaction rules after the focus-visible rule:

```css
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group,
html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *) {
  border: 1px solid transparent !important;
  transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:hover {
  background: var(--codextheme-hover) !important;
  border-color: var(--codextheme-line-strong) !important;
  box-shadow: inset 3px 0 0 var(--codextheme-accent), 0 0 18px var(--codextheme-glow) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel [role="button"][aria-current="page"] {
  background: var(--codextheme-selected) !important;
  border: 1px solid var(--codextheme-line-strong) !important;
  box-shadow: inset 3px 0 0 var(--codextheme-accent), 0 0 22px var(--codextheme-glow) !important;
}

html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *):hover {
  background: var(--codextheme-hover) !important;
  border-color: var(--codextheme-line-strong) !important;
  box-shadow: 0 0 22px var(--codextheme-glow), 0 12px 28px rgba(0, 0, 0, .28) !important;
  transform: translateY(-1px);
}
```

Do not add a global `button:hover`, `a:hover`, or generic `[role="button"]:hover` selector outside the observed sidebar and `.dream-home` scopes.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the installed-theme interaction system**

```bash
git add themes/shared/codex.css themes/tests/background-anchor.test.mjs
git commit -m "feat(themes): strengthen curated interaction states"
```

### Task 2: Bring generated catalog previews to visual parity

**Files:**
- Modify: `themes/tests/generate-previews.test.mjs`
- Modify: `themes/scripts/generate-previews.mjs`
- Modify: `apps/site/public/themes/*/previews/home-v012.png`
- Modify: `apps/site/public/themes/*/previews/session-v012.png`

- [ ] **Step 1: Add a failing source contract for preview strength**

Add a second test that reads the generator source and requires one centralized constant object with the approved B values:

```js
test("preview generator uses the approved B-strength interaction hierarchy", async () => {
  const source = await readFile(path.join(repoRoot, "themes/scripts/generate-previews.mjs"), "utf8");

  assert.match(source, /const INTERACTION = Object\.freeze\(\{\s*line: "\.48",\s*hover: "\.16",\s*selected: "\.21",\s*glow: "\.14",\s*\}\);/s);
  assert.match(source, /fill-opacity="\$\{INTERACTION\.selected\}" stroke="\$\{accent\}" stroke-opacity="\$\{INTERACTION\.line\}"/);
  assert.match(source, /fill-opacity="\$\{INTERACTION\.hover\}" stroke="\$\{accent\}" stroke-opacity="\$\{INTERACTION\.line\}"/);
});
```

- [ ] **Step 2: Run the preview test and verify RED**

Run:

```bash
node --test themes/tests/generate-previews.test.mjs
```

Expected: the existing image-generation test passes and the new interaction-hierarchy test fails.

- [ ] **Step 3: Centralize and use the exact preview interaction values**

Add near the preview dimensions:

```js
const INTERACTION = Object.freeze({
  line: ".48",
  hover: ".16",
  selected: ".21",
  glow: ".14",
});
```

Update the outer window border and composer borders to `INTERACTION.line`. Render the project row as selected with `INTERACTION.selected` plus `INTERACTION.line`. Render the first home action card as the demonstration hover with `INTERACTION.hover` plus `INTERACTION.line`; keep the remaining cards at a quieter `.30` stroke so the hierarchy is visible. Add one `feDropShadow` using the accent at `INTERACTION.glow` to the selected row and hovered card only.

The generated SVG fragments for the two state examples must contain these exact templates:

```js
fill="${accent}" fill-opacity="${INTERACTION.selected}" stroke="${accent}" stroke-opacity="${INTERACTION.line}"
```

```js
fill="${accent}" fill-opacity="${INTERACTION.hover}" stroke="${accent}" stroke-opacity="${INTERACTION.line}"
```

- [ ] **Step 4: Regenerate previews and verify GREEN**

Run:

```bash
node themes/scripts/generate-previews.mjs
node --test themes/tests/generate-previews.test.mjs
```

Expected: 6 privacy-safe previews are generated and both preview tests PASS.

- [ ] **Step 5: Visually inspect Cathedral, Crimson, and Silver home previews**

Open these three images and verify that the same B hierarchy works for gold, red, and silver-blue accents:

```text
apps/site/public/themes/cathedral-nocturne/previews/home-v012.png
apps/site/public/themes/crimson-procession/previews/home-v012.png
apps/site/public/themes/silver-reliquary/previews/home-v012.png
```

Expected: selected project row and first action card are clearly colored; borders are visible; artwork remains the visual subject; glow is not neon.

- [ ] **Step 6: Commit preview parity**

```bash
git add themes/scripts/generate-previews.mjs themes/tests/generate-previews.test.mjs apps/site/public/themes/*/previews/*.png
git commit -m "feat(site): strengthen curated theme previews"
```

### Task 3: Rebuild bundles and prepare CLI 0.2.6

**Files:**
- Modify: `packages/cli/themes/*.codextheme-theme`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/main.mjs`
- Modify: `packages/cli/README.md`
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `themes/catalog.json`
- Modify: `apps/site/app/lib/private-skin-service.mjs`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/security/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/tests/install-copy.test.mjs`
- Modify: `scripts/check-packages.mjs`

- [ ] **Step 1: Change version expectations first**

Update the CLI version assertion in `packages/cli/tests/main.test.mjs` to `0.2.6`. Update the accepted commands and rejected previous command in `apps/site/tests/install-copy.test.mjs` so `0.2.6` is current and `0.2.5` is rejected:

```js
assert.equal(app.stdout.text(), "0.2.6\n");
```

```js
const catalogCommand = "npx --yes @codextheme/cli@0.2.6 apply cathedral-nocturne";
const privateCommand = "npx --yes @codextheme/cli@0.2.6 apply-private mrsm16zh.UsX3wZp4MRN7Y54nKXfLKH5dwSyWLzSi";
```

- [ ] **Step 2: Run the affected tests and verify RED**

Run:

```bash
node --test packages/cli/tests/main.test.mjs
node --test apps/site/tests/install-copy.test.mjs
```

Expected: failures show that implementation and catalog commands still report `0.2.5`.

- [ ] **Step 3: Bump every shipped and displayed CLI reference to 0.2.6**

Replace current-release references from `0.2.5` to `0.2.6` in the files listed above. Keep `0.2.5` only in the install-copy rejection list as the immediately previous release. Set:

```json
"version": "0.2.6"
```

in `packages/cli/package.json`, and:

```js
export const VERSION = "0.2.6";
const REAPPLY = "npx --yes @codextheme/cli@0.2.6 reapply";
const RESTORE = "npx --yes @codextheme/cli@0.2.6 restore";
```

in `packages/cli/src/main.mjs`.

- [ ] **Step 4: Rebuild portable theme bundles**

Run:

```bash
npm run themes:build
```

Expected: `Generated 6 original raster assets.` and `Packed and verified 6 Codex themes.`; all six files in `packages/cli/themes/` contain the new shared interaction CSS.

- [ ] **Step 5: Run the affected tests and verify GREEN**

Run:

```bash
node --test packages/cli/tests/main.test.mjs
node --test apps/site/tests/install-copy.test.mjs
node scripts/check-packages.mjs
```

Expected: all commands exit 0 and package checks report CLI `0.2.6`.

- [ ] **Step 6: Commit the patch release preparation**

```bash
git add packages/cli themes/catalog.json apps/site/app apps/site/tests/install-copy.test.mjs scripts/check-packages.mjs
git commit -m "chore: prepare cli 0.2.6"
```

### Task 4: Verify in real Codex and release after visual approval

**Files:**
- Verify only: repository and live Codex renderer

- [ ] **Step 1: Run the full repository check**

Run:

```bash
npm run check
```

Expected: typechecks, theme tests, 42 CLI tests or more, 45 runtime tests or more, 70 site tests or more, production builds, package checks, and namespace checks all pass.

- [ ] **Step 2: Reapply the local Cathedral bundle**

Run:

```bash
node packages/cli/src/bin.mjs reapply
```

Expected: Cathedral Nocturne is reapplied and verified without a required restart when the live CDP renderer remains available.

- [ ] **Step 3: Verify computed default and selected styles through CDP**

Use the runtime CDP session against port `9335` and inspect:

```js
const root = getComputedStyle(document.documentElement);
const selected = document.querySelector('aside.app-shell-left-panel [role="button"][aria-current="page"]');
return {
  lineStrong: root.getPropertyValue("--codextheme-line-strong").trim(),
  hover: root.getPropertyValue("--color-token-list-hover-background").trim(),
  selectedBackground: selected ? getComputedStyle(selected).backgroundColor : null,
  selectedBorder: selected ? getComputedStyle(selected).borderColor : null,
  selectedShadow: selected ? getComputedStyle(selected).boxShadow : null,
};
```

Expected: the theme-derived tokens are present; the selected row uses a nontransparent background, theme-colored border, inset accent edge, and restrained glow.

- [ ] **Step 4: Capture one real Codex screenshot for user approval**

Capture the live renderer after placing the pointer over a sidebar row. Present the screenshot before any npm or GitHub publication.

Expected: user confirms the real app matches B · Noticeable and the background remains sharp.

- [ ] **Step 5: Publish and verify CLI 0.2.6**

After user approval, run:

```bash
npm publish -w @codextheme/cli --access public
npm view @codextheme/cli@0.2.6 version
```

Expected: npm prints `+ @codextheme/cli@0.2.6`, then registry lookup returns `0.2.6`. Complete npm Security Key authorization in the user's regular browser if npm requests WebAuthn.

- [ ] **Step 6: Integrate through the user-selected branch completion workflow**

Run the `superpowers:finishing-a-development-branch` workflow, re-verify after merge or PR creation, and push only the branch/ref selected by the user.

Expected: the published source commit is reachable on GitHub and the Vercel deployment uses `0.2.6` commands.
