# Adaptive Icon Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make native Codex icons visually belong to each generated image skin without replacing icon shapes or adding user steps.

**Architecture:** Extend the existing closed recipe token object with four icon-material values. Both the browser mockup and generated theme CSS consume those values; the final CSS stays scoped to stable Codex landmarks and styles existing SVGs without changing their dimensions, hit targets, or semantics.

**Tech Stack:** Next.js 16, React 19, CSS custom properties, Node.js 22 test runner, existing private-theme package builder and safety linter.

## Status

Implemented on 2026-07-19. Cinematic, Glass, and Focus now produce distinct icon surface, border, glyph, and glow treatments in both the browser preview and generated private-skin CSS while preserving Codex's native icon shapes and dimensions. Generated Home and composer icons receive a real background fill, and assistant-message icons inherit the same accent/glow treatment shown in Session preview.

Verification evidence:

- `npm test`: PASS — theme preview 2/2, CLI 42/42, runtime 42/42, site 70/70; the site suite also completed its Next.js production build.
- `npm run typecheck`: PASS.
- `npm run lint --workspace @codextheme/site`: PASS.
- Desktop browser: PASS — all three recipes produced distinct computed icon materials with unchanged 26×26 Home action icons and 25×25 composer icons; Home and Session switching remained stable.
- 390×844 browser viewport: PASS — `scrollWidth === clientWidth === 390`; the studio preview remained inside the viewport.
- Real Codex smoke gate: pending post-deploy. The current Codex renderer did not expose the local CDP endpoint on port 9335, and the app was not restarted solely for verification.

---

## File Map

- Modify `apps/site/app/lib/private-skin-profile.mjs`: add recipe-specific icon-material tokens.
- Modify `apps/site/app/lib/private-skin-package.mjs`: apply the tokens to native icons inside stable Codex regions.
- Modify `apps/site/app/components/CodexMockup.tsx`: expose icon-material tokens to the preview.
- Modify `apps/site/app/globals.css`: render matching icon materials without layout shifts.
- Modify `apps/site/tests/private-skin-profile.test.mjs`: lock the closed recipe-token contract.
- Modify `apps/site/tests/private-skin-schema.test.mjs`: validate scoped, safe generated icon CSS for all recipes.
- Modify `apps/site/tests/studio-source-contract.test.mjs`: verify preview/package parity wiring.

### Task 1: Lock the Icon-material Token Contract

**Files:**
- Modify: `apps/site/tests/private-skin-profile.test.mjs`
- Modify: `apps/site/app/lib/private-skin-profile.mjs`

- [x] **Step 1: Write the failing token assertions**

Extend the three-recipe test so the expected values are:

```js
assert.deepEqual(tokens.map((value) => ({
  recipe: value.recipe,
  iconSurfaceAlpha: value.iconSurfaceAlpha,
  iconBorderAlpha: value.iconBorderAlpha,
  iconGlowAlpha: value.iconGlowAlpha,
  iconGlyphOnAccent: value.iconGlyphOnAccent,
})), [
  { recipe: "cinematic", iconSurfaceAlpha: 92, iconBorderAlpha: 58, iconGlowAlpha: 42, iconGlyphOnAccent: true },
  { recipe: "glass", iconSurfaceAlpha: 24, iconBorderAlpha: 44, iconGlowAlpha: 24, iconGlyphOnAccent: false },
  { recipe: "focus", iconSurfaceAlpha: 12, iconBorderAlpha: 26, iconGlowAlpha: 0, iconGlyphOnAccent: false },
]);
```

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: FAIL because the four token properties are undefined.

- [x] **Step 3: Add recipe-specific values to `BASES` and `deriveSkinTokens`**

Add the four values shown above to each recipe base, then extend the returned token object with:

```js
iconSurfaceAlpha: base.iconSurfaceAlpha,
iconBorderAlpha: base.iconBorderAlpha,
iconGlowAlpha: base.iconGlowAlpha,
iconGlyphOnAccent: base.iconGlyphOnAccent,
```

Do not add them to public request settings; users cannot submit arbitrary icon CSS or values.

- [x] **Step 4: Run the focused test**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: PASS.

### Task 2: Style Native Icons in Generated Packages

**Files:**
- Modify: `apps/site/tests/private-skin-schema.test.mjs`
- Modify: `apps/site/app/lib/private-skin-package.mjs`

- [x] **Step 1: Write failing generated-CSS assertions**

For each recipe package, assert that:

```js
const navigationIcons = css.match(/aside\.app-shell-left-panel :is\(button, a, \[role="button"\]\) svg\s*\{([^}]*)\}/s);
const homeIcons = css.match(/\.dream-home :is\(button, \[role="button"\]\) svg\s*\{([^}]*)\}/s);
assert.ok(navigationIcons);
assert.ok(homeIcons);
assert.match(navigationIcons[1], /color: var\(--codextheme-accent\)/);
assert.match(homeIcons[1], /border-radius: 50%/);
assert.match(homeIcons[1], /box-shadow:/);
assert.doesNotMatch(homeIcons[1], /(?:width|height|padding|margin):/);
```

Also assert that each recipe embeds its expected icon alpha values and the existing owned-selector audit still passes.

- [x] **Step 2: Run the package test and verify failure**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
```

Expected: FAIL because the package has no icon-material rules.

- [x] **Step 3: Add scoped icon-material CSS**

Define closed CSS variables in the root token block:

```css
--codextheme-icon-surface-alpha: ${tokens.iconSurfaceAlpha}%;
--codextheme-icon-border-alpha: ${tokens.iconBorderAlpha}%;
--codextheme-icon-glow-alpha: ${tokens.iconGlowAlpha}%;
--codextheme-icon-glyph: ${tokens.iconGlyphOnAccent ? "var(--codextheme-surface)" : "var(--codextheme-accent)"};
```

Add one navigation rule under `aside.app-shell-left-panel` that changes only `color` and `filter`. Add Home action and composer-control rules that use `border-radius` and layered `box-shadow` to create the circular material without width, height, padding, margin, generated content, replacement assets, or pointer-event changes:

```css
html.codedrobe-codex-skin aside.app-shell-left-panel :is(button, a, [role="button"]) svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent));
}

html.codedrobe-codex-skin .dream-home :is(button, [role="button"]) svg,
html.codedrobe-codex-skin .composer-surface-chrome :is(button, [role="button"]) svg {
  color: var(--codextheme-icon-glyph) !important;
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent) !important;
  border-radius: 50% !important;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent),
    0 0 0 5px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent) !important;
}
```

Assistant-message SVGs receive only `color` and `filter`, matching the Session preview without adding a replacement asset or changing layout. Tests enforce a declaration allowlist for every native-icon rule.

- [x] **Step 4: Run package and runtime safety tests**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs packages/runtime/tests/theme-package.test.mjs
```

Expected: PASS with no unowned selector or remote-resource warning.

### Task 3: Keep Browser Preview in Parity

**Files:**
- Modify: `apps/site/tests/studio-source-contract.test.mjs`
- Modify: `apps/site/app/components/CodexMockup.tsx`
- Modify: `apps/site/app/globals.css`

- [x] **Step 1: Write failing preview wiring assertions**

Assert that `CodexMockup` exposes all four values as CSS custom properties and that the mockup sidebar, Home action icons, session agent icon, and composer submit icon consume the icon-material properties. Assert that the Home icon rule does not set width, height, padding, or margin beyond the existing mockup dimensions.

- [x] **Step 2: Run the source contract test and verify failure**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs
```

Expected: FAIL because icon-material custom properties are absent.

- [x] **Step 3: Wire tokens and preview CSS**

Expose the shared values from `CodexMockup`:

```tsx
"--studio-icon-surface-alpha": `${tokens.iconSurfaceAlpha}%`,
"--studio-icon-border-alpha": `${tokens.iconBorderAlpha}%`,
"--studio-icon-glow-alpha": `${tokens.iconGlowAlpha}%`,
"--studio-icon-glyph": tokens.iconGlyphOnAccent ? tokens.surface : tokens.accent,
```

Wrap only the existing mock sidebar glyph characters in `<i>` elements. Reuse the existing Home, session-agent, and composer icon elements and style their color, circular background/ring, and glow from those variables. Do not add new controls or change the upload flow.

- [x] **Step 4: Run the source contract and site tests**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs apps/site/tests/rendered-html.test.mjs
```

Expected: PASS.

### Task 4: Verify the Integrated Increment

**Files:**
- Verify only.

- [x] **Step 1: Run all repository tests**

Run:

```bash
npm test
```

Expected: all CLI, runtime, repository, and site tests pass.

- [x] **Step 2: Run the production build**

Run:

```bash
npm run build --workspace apps/site
```

Expected: Next.js production build completes successfully.

- [x] **Step 3: Inspect Home and Session at desktop and mobile widths**

Use the existing local site, upload or load the sample image, switch all three recipes and both preview modes, and confirm icon styling is visibly distinct but does not change layout or obscure glyphs.

- [x] **Step 4: Record the result**

Update the adaptive design and plan status with exact test/build evidence. Do not claim real-Codex icon compatibility without a live loopback DOM snapshot and production apply; if port 9335 is unavailable, record that as a post-deploy smoke gate.
