# Private Skin Icon Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make newly generated private skins keep secondary Codex icons native at rest and reveal image-derived material only on hover, keyboard focus, open, or selected states.

**Architecture:** Keep image analysis and the private-skin API unchanged. Rename the four permanent icon-material tokens to hover-specific tokens in `private-skin-profile.mjs`, consume them through state-scoped selectors in `private-skin-package.mjs`, and mirror the same behavior in `CodexMockup.tsx` plus `globals.css`. Curated themes and already-stored private packages remain untouched.

**Tech Stack:** Next.js 16, React 19, Node.js ES modules, generated CSS inside `.codextheme-theme` JSON, Node's built-in test runner, project-owned Codex runtime/CDP snapshot tooling.

---

## File Structure

- Modify `apps/site/app/lib/private-skin-profile.mjs`: own recipe-specific hover token names and strengths.
- Modify `apps/site/tests/private-skin-profile.test.mjs`: lock the hover-specific semantic token contract.
- Modify `apps/site/app/lib/private-skin-package.mjs`: replace permanent SVG decoration with state-scoped button, row, and card material.
- Modify `apps/site/tests/private-skin-schema.test.mjs`: lock selector scope, primary-action exclusion, package safety, and recipe strengths.
- Modify `apps/site/app/components/CodexMockup.tsx`: expose hover-specific preview tokens and distinguish secondary from primary composer actions.
- Modify `apps/site/app/globals.css`: make the browser preview demonstrate idle, hover, selected, and primary-action hierarchy.
- Modify `apps/site/tests/studio-source-contract.test.mjs`: guarantee preview/package token parity and prohibit permanent preview badges.

Do not create a new user setting, API field, storage field, runtime package, curated-theme rule, or compatibility shim.

### Task 1: Replace Permanent Icon Tokens with Hover-Specific Recipe Tokens

**Files:**
- Modify: `apps/site/tests/private-skin-profile.test.mjs:195-242,347-380`
- Modify: `apps/site/app/lib/private-skin-profile.mjs:5-83,374-410`

- [ ] **Step 1: Write the failing token-contract assertions**

Replace the icon projection in `recipes produce distinct complete surface systems` with:

```js
assert.deepEqual(tokens.map((value) => ({
  recipe: value.recipe,
  iconHoverSurfaceAlpha: value.iconHoverSurfaceAlpha,
  iconHoverBorderAlpha: value.iconHoverBorderAlpha,
  iconHoverGlowAlpha: value.iconHoverGlowAlpha,
})), [
  {
    recipe: "cinematic",
    iconHoverSurfaceAlpha: 30,
    iconHoverBorderAlpha: 52,
    iconHoverGlowAlpha: 28,
  },
  {
    recipe: "glass",
    iconHoverSurfaceAlpha: 20,
    iconHoverBorderAlpha: 40,
    iconHoverGlowAlpha: 18,
  },
  {
    recipe: "focus",
    iconHoverSurfaceAlpha: 10,
    iconHoverBorderAlpha: 28,
    iconHoverGlowAlpha: 0,
  },
]);
```

In the full Glass token object, replace the four old fields with:

```js
iconHoverSurfaceAlpha: 20,
iconHoverBorderAlpha: 40,
iconHoverGlowAlpha: 18,
```

Add an explicit closed-contract assertion after the recipe projection:

```js
for (const token of tokens) {
  for (const removed of [
    "iconSurfaceAlpha",
    "iconBorderAlpha",
    "iconGlowAlpha",
    "iconGlyphOnAccent",
  ]) {
    assert.equal(removed in token, false, `${removed} must not survive the hover-token migration`);
  }
}
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: FAIL because `iconHoverSurfaceAlpha` and the other hover-specific alpha fields are not defined.

- [ ] **Step 3: Rename the recipe fields and set the approved strengths**

In each entry of `BASES`, replace the old icon fields with the following exact values:

```js
// cinematic
iconHoverSurfaceAlpha: 30,
iconHoverBorderAlpha: 52,
iconHoverGlowAlpha: 28,

// glass
iconHoverSurfaceAlpha: 20,
iconHoverBorderAlpha: 40,
iconHoverGlowAlpha: 18,

// focus
iconHoverSurfaceAlpha: 10,
iconHoverBorderAlpha: 28,
iconHoverGlowAlpha: 0,
```

Update `deriveSkinTokens()` so its return object contains:

```js
iconHoverSurfaceAlpha: base.iconHoverSurfaceAlpha,
iconHoverBorderAlpha: base.iconHoverBorderAlpha,
iconHoverGlowAlpha: base.iconHoverGlowAlpha,
```

Do not retain aliases for the four old names. Private skin packages are immutable, and all in-repository consumers will migrate in Tasks 2 and 3.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: all private-skin profile tests PASS.

- [ ] **Step 5: Commit the semantic token migration**

```bash
git add apps/site/app/lib/private-skin-profile.mjs apps/site/tests/private-skin-profile.test.mjs
git commit -m "refactor(site): scope private icon tokens to hover"
```

### Task 2: Generate State-Scoped Private Skin CSS

**Files:**
- Modify: `apps/site/tests/private-skin-schema.test.mjs:223-410`
- Modify: `apps/site/app/lib/private-skin-package.mjs:30-155`

- [ ] **Step 1: Update recipe expectations and root-variable assertions**

In `expectations`, replace the old icon values with:

```js
// cinematic
iconHoverSurfaceAlpha: 30,
iconHoverBorderAlpha: 52,
iconHoverGlowAlpha: 28,

// glass
iconHoverSurfaceAlpha: 20,
iconHoverBorderAlpha: 40,
iconHoverGlowAlpha: 18,

// focus
iconHoverSurfaceAlpha: 10,
iconHoverBorderAlpha: 28,
iconHoverGlowAlpha: 0,
```

Replace the four expected CSS variables with:

```js
"--codextheme-icon-hover-surface-alpha",
"--codextheme-icon-hover-border-alpha",
"--codextheme-icon-hover-glow-alpha",
```

- [ ] **Step 2: Replace the permanent-icon assertions with state-scope assertions**

Remove `navigationIcons`, `assistantIcons`, `homeIcons`, and `composerIcons`. Add the exact state selectors and one assertion for their shared material block:

```js
const stateSelectors = [
  'aside.app-shell-left-panel button:has(> .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"])',
  'aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"])',
  'aside.app-shell-left-panel [role="listitem"] [role="button"].group:is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"])',
  '.dream-home button:not(header *, .composer-surface-chrome *):is(:hover, :focus-visible)',
  '.composer-surface-chrome button.border-token-border:is(:hover, :focus-visible, [data-state="open"])',
];
for (const selector of stateSelectors) {
  assert.ok(css.includes(selector), `${recipe} CSS must include ${selector}`);
}
const stateMaterial = css.match(
  /button\.border-token-border:is\(:hover, :focus-visible, \[data-state="open"\]\)\s*\{([^}]*)\}/s,
);
```

Assert the material is on interactive roots and not on permanent SVG rules:

```js
assert.ok(stateMaterial, `${recipe} CSS must include the shared interaction material`);
assert.match(stateMaterial[1], /background(?:-color)?:\s*color-mix/);
assert.match(stateMaterial[1], /box-shadow:/);
assert.match(css, /transition: color \.16s ease, background-color \.16s ease/);

assert.doesNotMatch(
  css,
  /(?:\.dream-home|\.composer-surface-chrome) :is\(button, \[role="button"\]\) svg\s*\{/,
);
assert.doesNotMatch(
  css,
  /aside\.app-shell-left-panel :is\(button, a, \[role="button"\]\) svg\s*\{/,
);
assert.doesNotMatch(css, /\[data-message-author-role="assistant"\] svg\s*\{/);
assert.doesNotMatch(css, /\.composer-surface-chrome \.size-token-button-composer/);
```

For each recipe, assert the renamed variables use the expected values:

```js
assert.match(css, new RegExp(
  `--codextheme-icon-hover-surface-alpha: ${expected.iconHoverSurfaceAlpha}%`,
));
assert.match(css, new RegExp(
  `--codextheme-icon-hover-border-alpha: ${expected.iconHoverBorderAlpha}%`,
));
assert.match(css, new RegExp(
  `--codextheme-icon-hover-glow-alpha: ${expected.iconHoverGlowAlpha}%`,
));
```

- [ ] **Step 3: Run the package test and verify it fails**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
```

Expected: FAIL because generated CSS still defines the old permanent icon variables and broad SVG rules.

- [ ] **Step 4: Rename the generated CSS variables**

In the generated root block, use:

```css
--codextheme-icon-hover-surface-alpha: ${tokens.iconHoverSurfaceAlpha}%;
--codextheme-icon-hover-border-alpha: ${tokens.iconHoverBorderAlpha}%;
--codextheme-icon-hover-glow-alpha: ${tokens.iconHoverGlowAlpha}%;
```

- [ ] **Step 5: Replace permanent decoration with scoped interaction rules**

Delete the four permanent rules that target all sidebar SVGs, assistant SVGs, Home SVGs, and composer SVGs. Add the following state model after the selected-sidebar rule:

```css
html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground),
html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground),
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group,
html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *),
html.codextheme-codex-skin .composer-surface-chrome button.border-token-border {
  transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease, filter .16s ease;
}

html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]),
html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]),
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]),
html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *):is(:hover, :focus-visible),
html.codextheme-codex-skin .composer-surface-chrome button.border-token-border:is(:hover, :focus-visible, [data-state="open"]) {
  color: var(--codextheme-accent) !important;
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-surface-alpha), transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent) !important;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]) :is(.text-token-foreground, svg),
html.codextheme-codex-skin aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]) :is(.text-token-foreground, svg),
html.codextheme-codex-skin aside.app-shell-left-panel [role="listitem"] [role="button"].group:is(:hover, :focus-visible, [aria-current="page"], [aria-selected="true"], [data-state="active"]) svg,
html.codextheme-codex-skin .dream-home button:not(header *, .composer-surface-chrome *):is(:hover, :focus-visible) svg,
html.codextheme-codex-skin .composer-surface-chrome button.border-token-border:is(:hover, :focus-visible, [data-state="open"]) svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent));
}
```

The composer selector deliberately requires `.border-token-border`. The privacy-trimmed DOM snapshot for the current verified Codex build shows every secondary composer control carrying that class, while the persistent Send button carries `.size-token-button-composer` and does not carry `.border-token-border`. Do not add a positional, text, or generic SVG fallback.

- [ ] **Step 6: Run package tests and the CSS linter**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
node scripts/check-packages.mjs
```

Expected: both commands PASS; generated private CSS has no unowned selector or executable resource.

- [ ] **Step 7: Commit the generated CSS state model**

```bash
git add apps/site/app/lib/private-skin-package.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "fix(site): reveal private icon material on interaction"
```

### Task 3: Make the Browser Preview Match Generated Skins

**Files:**
- Modify: `apps/site/tests/studio-source-contract.test.mjs:31-55`
- Modify: `apps/site/app/components/CodexMockup.tsx:43-125`
- Modify: `apps/site/app/globals.css:132-160`

- [ ] **Step 1: Replace the preview source contract**

Replace `preview uses the same closed icon-material tokens as generated skins` with:

```js
test("preview mirrors private icon interaction states", () => {
  for (const property of [
    "--studio-icon-hover-surface-alpha",
    "--studio-icon-hover-border-alpha",
    "--studio-icon-hover-glow-alpha",
  ]) {
    assert.ok(mockup.includes(`"${property}"`), `mockup must expose ${property}`);
  }

  for (const removed of [
    "--studio-icon-surface-alpha",
    "--studio-icon-border-alpha",
    "--studio-icon-glow-alpha",
  ]) {
    assert.equal(mockup.includes(`"${removed}"`), false, `${removed} must be removed`);
  }

  assert.doesNotMatch(mockup, /iconHoverGlyphOnAccent/);
  assert.match(mockup, /className="mockup-composer-actions"/);
  assert.match(mockup, /<i>⌁<\/i><b>↑<\/b>/);
  assert.match(
    css,
    /\.mockup-sidebar nav span:hover,\s*\.mockup-prompts > span:hover,\s*\.mockup-composer-actions i:hover\s*\{[^}]*background:/s,
  );
  assert.match(css, /\.mockup-composer-actions b \{[^}]*background: var\(--studio-ink\)/s);
  assert.doesNotMatch(css, /\.mockup-prompts i \{[^}]*background:/s);
  assert.doesNotMatch(css, /\.mockup-agent > i \{[^}]*drop-shadow/s);
});
```

- [ ] **Step 2: Run the source-contract test and verify it fails**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs
```

Expected: FAIL because the preview still exposes old permanent icon tokens and markup.

- [ ] **Step 3: Rename the inline preview tokens**

In `CodexMockup`, replace the four icon entries with:

```tsx
"--studio-icon-hover-surface-alpha": `${tokens.iconHoverSurfaceAlpha}%`,
"--studio-icon-hover-border-alpha": `${tokens.iconHoverBorderAlpha}%`,
"--studio-icon-hover-glow-alpha": `${tokens.iconHoverGlowAlpha}%`,
```

Replace the composer markup with:

```tsx
<div className="mockup-composer">
  <span>Ask Codex anything</span>
  <span className="mockup-composer-actions"><i>⌁</i><b>↑</b></span>
</div>
```

- [ ] **Step 4: Replace permanent preview badges with interaction states**

Keep existing shell, artwork, selected-project, and composer-surface rules. Replace icon-material declarations with these rules:

```css
.mockup-sidebar nav span,
.mockup-prompts > span,
.mockup-composer-actions i {
  transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
}
.mockup-sidebar nav i,
.mockup-prompts i,
.mockup-sigil,
.mockup-agent > i {
  color: color-mix(in srgb, var(--studio-muted-ink) 82%, transparent);
  filter: none;
  font-style: normal;
}
.mockup-sidebar nav span:hover,
.mockup-prompts > span:hover,
.mockup-composer-actions i:hover {
  color: var(--studio-accent);
  background: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-surface-alpha), transparent);
  border-color: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-border-alpha), transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-glow-alpha), transparent);
}
.mockup-sidebar nav span:hover i,
.mockup-prompts > span:hover i {
  color: var(--studio-accent);
}
.mockup-sigil {
  display: block;
  margin-bottom: 10px;
}
.mockup-prompts i {
  margin: 0 auto 17px;
  text-align: center;
}
.mockup-composer-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.mockup-composer-actions i,
.mockup-composer-actions b {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  font-style: normal;
}
.mockup-composer-actions b {
  color: var(--studio-surface);
  background: var(--studio-ink);
  border-color: color-mix(in srgb, var(--studio-ink) 82%, white);
}
```

Preserve the existing dimensions and layout for the sidebar, suggestion cards, and composer. Do not add a static `is-hovered` class; the website preview should respond to the user's actual pointer.

- [ ] **Step 5: Run preview tests and build**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs
npm run typecheck -w @codextheme/site
npm run build -w @codextheme/site
```

Expected: all commands PASS, and Next.js lists `/`, `/help`, `/security`, and three flagship theme routes.

- [ ] **Step 6: Commit preview parity**

```bash
git add apps/site/app/components/CodexMockup.tsx apps/site/app/globals.css apps/site/tests/studio-source-contract.test.mjs
git commit -m "feat(site): preview private icon hover hierarchy"
```

### Task 4: Run Full Regression and Visual Preview Checks

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Run every focused private-skin test together**

Run:

```bash
node --test \
  apps/site/tests/private-skin-profile.test.mjs \
  apps/site/tests/private-skin-schema.test.mjs \
  apps/site/tests/studio-source-contract.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run the complete release check outside restricted loopback sandboxing**

Run:

```bash
npm run check
```

Expected: theme, CLI, runtime, and site tests all PASS; both Next.js builds succeed; six curated themes still pack; package and product namespace checks pass.

- [ ] **Step 3: Start the local website and inspect the upload preview**

Run:

```bash
npm run dev -w @codextheme/site
```

Open the printed local URL at `/#create`. Upload `themes/cathedral-nocturne/assets/hero.jpg`, then inspect Cinematic, Glass, and Focus in both Home and Session preview modes.

Expected for each recipe:

- idle secondary controls have no circular material;
- pointer hover decorates only the target row, card, or composer secondary icon;
- the selected project remains persistently themed;
- Send remains the strongest toolbar control;
- the background, surface opacity, focal position, and recipe selector still work.

- [ ] **Step 4: Inspect narrow layout without changing application geometry**

At a 980 px wide browser viewport, repeat Home and Session preview checks.

Expected: no horizontal overflow, clipped controls, icon/text overlap, or shifted composer geometry.

### Task 5: Apply a Locally Generated Private Skin and Verify the Real Codex App

**Files:**
- Verify only; write screenshots to `/private/tmp`, not the repository.

- [ ] **Step 1: Ask for explicit permission to hot-apply the local QA skin**

Do not apply or restart Codex until the user approves. Prefer the already-running `127.0.0.1:9335` endpoint; do not restart if it is available.

- [ ] **Step 2: Apply a locally generated Cinematic private skin without publishing it**

Run from the worktree:

```bash
node --input-type=module -e '
import sharp from "sharp";
import codex from "./packages/runtime/src/adapters/codex.mjs";
import { applyTheme } from "./packages/runtime/src/index.mjs";
import { resolveThemeTarget, validateThemePackage } from "./packages/runtime/src/theme/index.mjs";
import { buildPrivateSkinPackage } from "./apps/site/app/lib/private-skin-package.mjs";
import { analyzeImagePixels, deriveRecipeDefaults } from "./apps/site/app/lib/private-skin-profile.mjs";
const source = "themes/cathedral-nocturne/assets/hero.jpg";
const image = await sharp(source).resize({ width: 1600, height: 1000, fit: "inside" }).webp({ quality: 82 }).toBuffer();
const sample = await sharp(source).resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const profile = analyzeImagePixels({ data: new Uint8Array(sample.data), width: sample.info.width, height: sample.info.height, channels: sample.info.channels });
const settings = deriveRecipeDefaults(profile, "cinematic");
const bundle = validateThemePackage(JSON.parse(buildPrivateSkinPackage({
  id: "mqa12345.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  exportedAt: "2026-07-22T00:00:00.000Z",
  image,
  settings,
  profile,
})));
const targetTheme = resolveThemeTarget(bundle, "codex");
console.log(JSON.stringify(await applyTheme({ adapter: codex, targetTheme, port: 9335 }), null, 2));
'
```

Expected: every matching Codex renderer reports a passing verification result for theme id `private-aaaaaaaaaaaaaaaaaaaa`.

- [ ] **Step 3: Verify idle and interaction states in Home and Session**

Use the real app at desktop width and a narrow width around 980 px. Check:

- sidebar primary navigation idle, hover, selected, and row-action visibility;
- project row idle, hover, selected, long label, and trailing action;
- Home suggestion card idle and hover;
- composer secondary icon idle, hover, keyboard focus, and open menu;
- Send idle and hover without an extra private-skin ring;
- message, output, file, and status icons remain native;
- no clipping, overflow, duplicate borders, or hit-target change.

After navigating the real app to Home, capture it with:

```bash
node --input-type=module -e '
import codex from "./packages/runtime/src/adapters/codex.mjs";
import { captureScreenshot } from "./packages/runtime/src/index.mjs";
console.log(await captureScreenshot({ adapter: codex, port: 9335, output: "/private/tmp/private-skin-icon-hover-home.png" }));
'
```

Navigate to a populated Session and capture it with:

```bash
node --input-type=module -e '
import codex from "./packages/runtime/src/adapters/codex.mjs";
import { captureScreenshot } from "./packages/runtime/src/index.mjs";
console.log(await captureScreenshot({ adapter: codex, port: 9335, output: "/private/tmp/private-skin-icon-hover-session.png" }));
'
```

Expected: both PNG files exist, show the complete Codex window, and contain no private input text added solely for QA.

- [ ] **Step 4: Run contrast and package safety checks after real-app QA**

Run:

```bash
npm run check
git status --short
```

Expected: the complete check passes and `git status --short` is empty.

- [ ] **Step 5: Prepare the branch for integration**

Run:

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
```

Expected: one token-contract commit, one generated-CSS commit, and one preview-parity commit; the diff is limited to the seven files listed in this plan plus this plan document.
