# Cathedral Sites Icon and List States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Cathedral Nocturne with a twelfth Sites glyph and theme-colored project/session hover and selected states.

**Architecture:** Extend the existing deterministic Cathedral Glyphs asset pipeline and the closed live-selector contract with one `icon-sites` entry. Keep interaction styling CSS-only by overriding Codex's semantic list tokens under the active Cathedral root, then add a narrowly scoped inset line for selected sidebar rows. The theme package and website preview consume the same generated PNG.

**Tech Stack:** Node.js ESM, `node:test`, Sharp, CSS custom properties, CodexTheme runtime packaging, Next.js preview assets.

---

## File Map

- Create `themes/cathedral-nocturne/icons-src/icon-sites.svg`: editable 24-unit rose-window master.
- Create `themes/cathedral-nocturne/assets/icons/icon-sites.png`: deterministic 96px generated package asset.
- Modify `themes/scripts/generate-cathedral-icons.mjs`: add the twelfth closed icon id.
- Modify `themes/cathedral-nocturne/theme.json`: declare and verify `icon-sites`.
- Modify `packages/cli/src/catalog-theme-policy.mjs`: register the exact Sites selector in the audited catalog policy.
- Modify `themes/fixtures/cathedral-icon-selectors.json`: record the exact Home/Session match contract.
- Modify `themes/shared/codex.css`: replace the Sites native SVG and define Cathedral list interaction tokens/states.
- Modify `themes/scripts/generate-previews.mjs`: render Sites and revised sidebar spacing from the shared PNG.
- Modify `themes/tests/cathedral-icons.test.mjs`: enforce the twelve-image asset contract.
- Modify `themes/tests/cathedral-icon-contract.test.mjs`: enforce the Sites selector, CSS replacement, and list-state CSS.
- Modify `themes/tests/generate-previews.test.mjs`: enforce twelve shared preview icons.
- Regenerate `packages/cli/themes/cathedral-nocturne.codextheme-theme`: ship the updated bundle.
- Regenerate `apps/site/public/themes/cathedral-nocturne/previews/home-v013.png` and `session-v013.png`: update local and production preview imagery without changing URLs.

### Task 1: Add the twelfth Cathedral glyph through TDD

**Files:**
- Create: `themes/cathedral-nocturne/icons-src/icon-sites.svg`
- Create: `themes/cathedral-nocturne/assets/icons/icon-sites.png`
- Modify: `themes/scripts/generate-cathedral-icons.mjs`
- Test: `themes/tests/cathedral-icons.test.mjs`

- [ ] **Step 1: Write the failing closed-set expectation**

Add `"icon-sites"` after `"icon-pull-requests"` in the test-local `ICON_IDS` array and assert the complete set contains twelve unique ids:

```js
const ICON_IDS = [
  "icon-new-chat",
  "icon-pull-requests",
  "icon-sites",
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

assert.equal(ICON_IDS.length, 12);
assert.equal(new Set(ICON_IDS).size, 12);
assert.deepEqual(CATHEDRAL_ICON_IDS, ICON_IDS);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test themes/tests/cathedral-icons.test.mjs
```

Expected: FAIL because `CATHEDRAL_ICON_IDS` does not contain `icon-sites` and no SVG master exists.

- [ ] **Step 3: Add the minimal master and generator entry**

Insert `"icon-sites"` after `"icon-pull-requests"` in `CATHEDRAL_ICON_IDS`. Create a safe local 24-unit SVG using the established gold gradient and a four-cell rose-window grid:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <defs>
    <linearGradient id="gold" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F1D58A"/>
      <stop offset="1" stop-color="#A77A2D"/>
    </linearGradient>
  </defs>
  <path d="M12 3.25A8.75 8.75 0 1 0 12 20.75 8.75 8.75 0 0 0 12 3.25Z" stroke="url(#gold)" stroke-width="1.6"/>
  <path d="M12 4.2V19.8M4.2 12H19.8" stroke="url(#gold)" stroke-width="1.45" stroke-linecap="round"/>
  <path d="M6.25 6.25 17.75 17.75M17.75 6.25 6.25 17.75" stroke="url(#gold)" stroke-width=".65" stroke-linecap="round" opacity=".72"/>
  <circle cx="12" cy="12" r="1.2" fill="#F3DE9A"/>
</svg>
```

Generate the PNG:

```bash
node themes/scripts/generate-cathedral-icons.mjs
```

Expected: `Generated 12 Cathedral Glyph PNG assets.`

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test themes/tests/cathedral-icons.test.mjs
```

Expected: PASS and Sharp reports the new PNG as 96×96 with alpha.

- [ ] **Step 5: Commit the asset slice**

```bash
git add themes/scripts/generate-cathedral-icons.mjs themes/tests/cathedral-icons.test.mjs themes/cathedral-nocturne/icons-src/icon-sites.svg themes/cathedral-nocturne/assets/icons/icon-sites.png
git commit -m "feat: add cathedral sites glyph"
```

### Task 2: Register and apply the Sites replacement through TDD

**Files:**
- Modify: `themes/cathedral-nocturne/theme.json`
- Modify: `packages/cli/src/catalog-theme-policy.mjs`
- Modify: `themes/fixtures/cathedral-icon-selectors.json`
- Modify: `themes/shared/codex.css`
- Test: `themes/tests/cathedral-icon-contract.test.mjs`
- Test: `themes/tests/cathedral-icons.test.mjs`

- [ ] **Step 1: Write failing selector and CSS contract expectations**

Change the anchor count expectations from 11 to 12 and require the second navigation button:

```js
assert.equal(CATHEDRAL_ICON_ANCHORS.length, 12);
assert.equal(new Set(CATHEDRAL_ICON_ANCHORS.map(({ id }) => id)).size, 12);
assert.match(byId["icon-sites"].selector, /button:nth-child\(2\) svg$/);
assert.doesNotMatch(byId["icon-pull-requests"].selector, /nth-child\(2\)/);
```

The existing loop in `Cathedral CSS maps every anchor to its own image and preserves native boxes` must remain unchanged so it fails until the Sites CSS rule exists. The package test's expected ids must now include the new generated id through `CATHEDRAL_ICON_IDS`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test themes/tests/cathedral-icon-contract.test.mjs themes/tests/cathedral-icons.test.mjs
```

Expected: FAIL because `icon-sites` is absent from the selector policy, manifest, verification list, and CSS.

- [ ] **Step 3: Register the exact bounded anchor**

Add this policy entry after Pull requests:

```js
{ id: "icon-sites", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(2) svg`, expected: 1 },
```

Add the matching fixture row:

```json
{ "id": "icon-sites", "contexts": ["home", "session"], "expected": 1 }
```

Add the manifest image and verification entries:

```json
"icon-sites": "assets/icons/icon-sites.png"
```

```json
{ "name": "icon-sites", "any": ["aside.app-shell-left-panel [role='navigation'] .vertical-scroll-fade-mask > div:first-child > div > div > div > button:nth-child(2) svg"] }
```

- [ ] **Step 4: Add the guarded native-SVG replacement**

Insert between Pull requests and Scheduled in `themes/shared/codex.css`:

```css
html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"] aside.app-shell-left-panel [role="navigation"] .vertical-scroll-fade-mask > div:first-child > div > div > div > button:nth-child(2) svg {
  background-image: var(--codedrobe-image-icon-sites);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"] aside.app-shell-left-panel [role="navigation"] .vertical-scroll-fade-mask > div:first-child > div > div > div > button:nth-child(2) svg > * {
  opacity: 0 !important;
}
```

- [ ] **Step 5: Verify focused tests and live match count**

Run:

```bash
node --test themes/tests/cathedral-icon-contract.test.mjs themes/tests/cathedral-icons.test.mjs
node themes/scripts/probe-cathedral-icons.mjs session
```

Expected: both tests PASS; the live probe reports `icon-sites` count 1 and status `pass` without changing the meaning of buttons 1, 3, or 4.

- [ ] **Step 6: Commit selector and package wiring**

```bash
git add packages/cli/src/catalog-theme-policy.mjs themes/fixtures/cathedral-icon-selectors.json themes/cathedral-nocturne/theme.json themes/shared/codex.css themes/tests/cathedral-icon-contract.test.mjs themes/tests/cathedral-icons.test.mjs
git commit -m "feat: apply cathedral sites glyph"
```

### Task 3: Theme project and session interaction states through TDD

**Files:**
- Modify: `themes/shared/codex.css`
- Test: `themes/tests/cathedral-icon-contract.test.mjs`

- [ ] **Step 1: Write the failing Cathedral-scoped interaction test**

Add a test that extracts the active Cathedral root block and asserts the exact semantic token values and selected-row inset line:

```js
test("Cathedral list interactions use gold hover and selected surfaces", async () => {
  const css = await readFile(path.join(themeRoot, "shared", "codex.css"), "utf8");
  const root = ':root.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]';
  const rootStart = css.indexOf(`${root} {`);
  assert.notEqual(rootStart, -1);
  const rootBlock = css.slice(rootStart, css.indexOf("}", rootStart) + 1);
  assert.match(rootBlock, /--color-token-list-hover-background:\s*color-mix\(in srgb, var\(--codextheme-surface\) 84%, var\(--codextheme-accent\) 16%\)\s*!important/);
  assert.match(rootBlock, /--color-token-list-active-selection-background:\s*color-mix\(in srgb, var\(--codextheme-surface\) 76%, var\(--codextheme-accent\) 24%\)\s*!important/);

  const selectedSelector = `${root.replace(":root", "html")} aside.app-shell-left-panel :is([class~="bg-token-list-active-selection-background"], [class~="bg-token-list-hover-background"], [aria-current="page"])`;
  const selectedStart = css.indexOf(`${selectedSelector} {`);
  assert.notEqual(selectedStart, -1);
  const selectedBlock = css.slice(selectedStart, css.indexOf("}", selectedStart) + 1);
  assert.match(selectedBlock, /box-shadow:\s*inset 0 0 0 1px color-mix\(in srgb, var\(--codextheme-accent\) 42%, transparent\)\s*!important/);
  assert.doesNotMatch(selectedBlock, /(?:width|height|margin|padding|transform)\s*:/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test themes/tests/cathedral-icon-contract.test.mjs
```

Expected: FAIL because the Cathedral-specific semantic list tokens and selected-row line do not exist.

- [ ] **Step 3: Add the minimal scoped CSS**

Add after the shared root token block:

```css
:root.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"] {
  --color-token-list-hover-background: color-mix(in srgb, var(--codextheme-surface) 84%, var(--codextheme-accent) 16%) !important;
  --color-token-list-active-selection-background: color-mix(in srgb, var(--codextheme-surface) 76%, var(--codextheme-accent) 24%) !important;
}

html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"] aside.app-shell-left-panel :is([class~="bg-token-list-active-selection-background"], [class~="bg-token-list-hover-background"], [aria-current="page"]) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--codextheme-accent) 42%, transparent) !important;
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test themes/tests/cathedral-icon-contract.test.mjs
```

Expected: PASS. Verify the CSS block contains no geometry or transform properties.

- [ ] **Step 5: Commit the interaction slice**

```bash
git add themes/shared/codex.css themes/tests/cathedral-icon-contract.test.mjs
git commit -m "feat: theme cathedral list interactions"
```

### Task 4: Bring the website preview to twelve-icon parity

**Files:**
- Modify: `themes/scripts/generate-previews.mjs`
- Modify: `themes/tests/generate-previews.test.mjs`
- Regenerate: `apps/site/public/themes/cathedral-nocturne/previews/home-v013.png`
- Regenerate: `apps/site/public/themes/cathedral-nocturne/previews/session-v013.png`

- [ ] **Step 1: Write the failing preview count assertion**

Change:

```js
assert.equal(Object.keys(icons).length, 12);
assert.match(helpers.previewIconImage(icons, "icon-sites", { x: 100, y: 120, size: 32 }), /<image /);

const generatorSource = await readFile(path.join(repoRoot, "themes/scripts/generate-previews.mjs"), "utf8");
assert.match(generatorSource, /navIcon\(246, accent, "line", iconData, "icon-sites"\)/);
```

- [ ] **Step 2: Run the preview test and verify RED**

Run:

```bash
node --test themes/tests/generate-previews.test.mjs
```

Expected: FAIL on the `navIcon(246, ...)` assertion until the sidebar composition renders Sites, even though Task 1 has already extended the closed asset set.

- [ ] **Step 3: Insert Sites into the synthetic Codex sidebar**

Use the shared PNG and move later rows down one slot:

```js
${navIcon(160, accent, "line", iconData, "icon-new-chat")}<text x="70" y="160" fill="#eeeae2" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">New chat</text>
${navIcon(203, accent, "line", iconData, "icon-pull-requests")}<text x="70" y="203" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Pull requests</text>
${navIcon(246, accent, "line", iconData, "icon-sites")}<text x="70" y="246" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Sites</text>
${navIcon(289, accent, "dot", iconData, "icon-scheduled")}<text x="70" y="289" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Scheduled</text>
${navIcon(332, accent, "line", iconData, "icon-plugins")}<text x="70" y="332" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Plugins</text>
```

Move the Projects label from `y="350"` to `y="393"`, its card from `y="372"` to `y="415"`, its icon from `y: 380` to `y: 423`, and its title from `y="401"` to `y="444"`. Move the Chats label and two sample rows from `472/508/544` to `515/551/587`. Preserve the existing selected-card gold fill and line, which represents the newly themed selected state.

- [ ] **Step 4: Generate and verify deterministic previews**

Run:

```bash
node --test themes/tests/generate-previews.test.mjs
node themes/scripts/generate-previews.mjs
```

Expected: PASS; both Cathedral preview PNGs remain 1600×1000, contain the Sites glyph, and repeated generation is byte-identical.

- [ ] **Step 5: Commit preview parity**

```bash
git add themes/scripts/generate-previews.mjs themes/tests/generate-previews.test.mjs apps/site/public/themes/cathedral-nocturne/previews/home-v013.png apps/site/public/themes/cathedral-nocturne/previews/session-v013.png
git commit -m "feat: show cathedral sites in previews"
```

### Task 5: Repack and verify the complete release candidate

**Files:**
- Regenerate: `packages/cli/themes/cathedral-nocturne.codextheme-theme`

- [ ] **Step 1: Repack all available themes**

Run:

```bash
npm run themes:build
```

Expected: `Generated 12 Cathedral Glyph PNG assets.` and `Packed and verified 3 available Codex themes.`

- [ ] **Step 2: Run the full repository gate**

Run:

```bash
npm_config_cache=/tmp/codextheme-npm-cache npm run check
```

Expected: theme tests, CLI tests, runtime tests, site tests, Next.js production build, and package-release checks all pass with zero failures.

- [ ] **Step 3: Verify the real Codex Session and Home contexts**

Run the read-only count probe in Session:

```bash
node themes/scripts/probe-cathedral-icons.mjs session
```

Expected: all shared anchors pass, including `icon-sites: 1`.

Apply the local Cathedral bundle through the CodexTheme workflow without forcing a restart:

```bash
node packages/cli/src/bin.mjs apply cathedral-nocturne
```

Expected: the renderer applies and verifies the local bundle. If the command reports `E_RESTART_REQUIRED`, do not add a restart flag and do not close Codex; record the safe guard result and continue with the already-running renderer hot-preview workflow used by this branch. Inspect both Session and Home. Acceptance evidence:

- Sites shows the gold rose-window glyph.
- Pull requests, Scheduled, and Plugins retain their correct meanings.
- Project and session hover surfaces use the 16% gold blend.
- The selected project/session uses the 24% gold blend and 42% inset line.
- Focus-visible remains a two-pixel gold ring.
- No row dimensions, labels, click areas, or background anchoring change.

- [ ] **Step 4: Confirm the branch is clean and commit the packed artifact**

```bash
git add packages/cli/themes/cathedral-nocturne.codextheme-theme
git commit -m "chore: repack cathedral sites theme"
git status --short
```

Expected: the commit succeeds and `git status --short` prints no output.
