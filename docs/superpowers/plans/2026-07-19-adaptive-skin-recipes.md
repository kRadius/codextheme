# Adaptive Skin Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the private image uploader into a complete adaptive Codex skin generator with three locally previewed, server-validated visual recipes.

**Architecture:** A new pure profile module analyzes bounded RGB samples and converts the resulting image profile plus a closed recipe ID into semantic theme tokens. Browser preview and server package construction share those functions; the server still derives all authoritative values from the normalized image, while the existing CLI, storage, expiry, apply, reapply, and restore protocols remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, browser Canvas, Sharp, Node.js 22 test runner, existing `@codextheme/runtime`, npm workspaces, GA4.

**Status (2026-07-19):** Implementation and pre-merge verification complete. The production Codex apply and GA4 network smoke checks remain post-deploy gates because they require a live private-skin ID and production analytics endpoint.

---

## File Map

- Create `apps/site/app/lib/private-skin-profile.mjs`: pure pixel analysis, recommendation, recipe defaults, palette, and semantic-token derivation.
- Create `apps/site/tests/private-skin-profile.test.mjs`: deterministic image-profile and recipe tests.
- Modify `apps/site/app/lib/private-skin-schema.mjs`: add the closed `recipe` setting.
- Modify `apps/site/app/lib/private-skin-palette.mjs`: retain the compatibility wrapper while delegating color derivation to the profile module.
- Modify `apps/site/app/lib/browser-image.mjs`: analyze a local 32×32 pixel sample and return `profile` instead of a single-color palette.
- Modify `apps/site/app/lib/private-skin-service.mjs`: obtain a server-side raw sample and rebuild the authoritative profile.
- Modify `apps/site/app/api/private-skins/route.ts`: extend the closed settings allowlist to `recipe` and return a client error for malformed settings.
- Modify `apps/site/app/lib/private-skin-package.mjs`: build CSS from semantic tokens for Cinematic, Glass, and Focus.
- Modify `apps/site/app/components/CustomSkinStudio.tsx`: recipe selection, recommendation label, recipe-aware reset, and collapsed advanced controls.
- Modify `apps/site/app/components/CodexMockup.tsx`: consume the same semantic token object used by package construction.
- Modify `apps/site/app/globals.css`: recipe-card UI and token-driven preview chrome.
- Modify `apps/site/app/lib/analytics.mjs`: allow only a coarse recipe-selection event.
- Modify `apps/site/tests/private-skin-schema.test.mjs`: schema, form, and package assertions.
- Modify `apps/site/tests/private-skin-service.test.mjs`: server profile and selected-recipe coverage.
- Modify `apps/site/tests/analytics.test.mjs`: coarse recipe event and privacy rejection coverage.
- Create `apps/site/app/lib/studio-request-revision.mjs`: invalidate stale and overlapping create/image-processing results.
- Create `apps/site/tests/studio-request-revision.test.mjs`: request-revision regression coverage.
- Modify `apps/site/tests/rendered-html.test.mjs`: route-level form parsing and privacy coverage.
- Create `apps/site/tests/studio-source-contract.test.mjs`: recipe-image, URL-lifecycle, same-file selection, and preview parity wiring coverage.

No CLI, runtime, Blob contract, Vercel configuration, or npm package version changes are required. The existing API surface is unchanged; its settings parser is tightened to the new closed schema.

## Task 1: Define the Closed Recipe and Image-profile Contract

**Files:**
- Create: `apps/site/app/lib/private-skin-profile.mjs`
- Create: `apps/site/tests/private-skin-profile.test.mjs`
- Modify: `apps/site/app/lib/private-skin-schema.mjs`
- Modify: `apps/site/app/lib/private-skin-palette.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Add failing schema and profile tests**

Create `apps/site/tests/private-skin-profile.test.mjs` with deterministic fixtures and direct threshold tests:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeImagePixels,
  deriveRecipeDefaults,
  deriveSkinTokens,
  recommendRecipe,
} from "../app/lib/private-skin-profile.mjs";

function solid(red, green, blue, width = 4, height = 4) {
  const data = new Uint8Array(width * height * 3);
  for (let index = 0; index < data.length; index += 3) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }
  return { data, width, height, channels: 3 };
}

test("pixel analysis is deterministic and bounded", () => {
  const first = analyzeImagePixels(solid(180, 52, 76));
  const second = analyzeImagePixels(solid(180, 52, 76));
  assert.deepEqual(first, second);
  assert.match(first.primary, /^#[0-9a-f]{6}$/);
  assert.match(first.secondary, /^#[0-9a-f]{6}$/);
  assert.match(first.highlight, /^#[0-9a-f]{6}$/);
  for (const key of ["luminance", "saturation", "contrast", "complexity"]) {
    assert.ok(first[key] >= 0 && first[key] <= 100);
  }
});

test("recommendation follows the three closed thresholds", () => {
  assert.equal(recommendRecipe({ complexity: 58, luminance: 40, contrast: 40 }), "focus");
  assert.equal(recommendRecipe({ complexity: 20, luminance: 40, contrast: 30 }), "glass");
  assert.equal(recommendRecipe({ complexity: 44, luminance: 40, contrast: 52 }), "cinematic");
});

test("recipes produce distinct complete surface systems", () => {
  const profile = analyzeImagePixels(solid(180, 52, 76));
  const tokens = ["cinematic", "glass", "focus"].map((recipe) => {
    const settings = deriveRecipeDefaults(profile, recipe, { positionX: 35, positionY: 65 });
    return deriveSkinTokens(profile, settings);
  });
  assert.deepEqual(tokens.map((value) => value.recipe), ["cinematic", "glass", "focus"]);
  assert.equal(new Set(tokens.map((value) => value.sidebarAlpha)).size, 3);
  assert.equal(new Set(tokens.map((value) => value.mainAlpha)).size, 3);
  assert.equal(new Set(tokens.map((value) => value.composerAlpha)).size, 3);
  assert.equal(tokens[2].positionX, 35);
  assert.equal(tokens[2].positionY, 65);
});
```

Extend `apps/site/tests/private-skin-schema.test.mjs` so normalization has an exact seven-field result:

```js
assert.deepEqual(normalizePrivateSkinSettings({ recipe: "glass", unknown: true }), {
  recipe: "glass",
  visibility: 72,
  overlay: 42,
  blur: 2,
  zoom: 110,
  positionX: 50,
  positionY: 50,
});
assert.equal(normalizePrivateSkinSettings({ recipe: "arbitrary-css" }).recipe, "cinematic");
```

Also add `recipe: "cinematic"` to the two existing expected default objects so the tests continue to assert the complete closed schema rather than a partial result.

- [ ] **Step 2: Run focused tests and verify the new module/field failures**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs apps/site/tests/private-skin-schema.test.mjs
```

Expected: FAIL because `private-skin-profile.mjs` and normalized `recipe` do not exist.

- [ ] **Step 3: Add the recipe field to the schema**

In `apps/site/app/lib/private-skin-schema.mjs`, add the closed IDs and make `recipe` the first normalized field:

```js
export const PRIVATE_SKIN_RECIPES = Object.freeze(["cinematic", "glass", "focus"]);

export function normalizePrivateSkinRecipe(value) {
  return PRIVATE_SKIN_RECIPES.includes(value) ? value : "cinematic";
}

export const DEFAULT_PRIVATE_SKIN_SETTINGS = Object.freeze({
  recipe: "cinematic",
  visibility: 72,
  overlay: 42,
  blur: 2,
  zoom: 110,
  positionX: 50,
  positionY: 50,
});
```

Return `recipe: normalizePrivateSkinRecipe(source.recipe)` before the six existing numeric keys. Do not accept any free-form token, CSS value, profile, or palette field.

- [ ] **Step 4: Implement the pure profile and recipe engine**

Create `apps/site/app/lib/private-skin-profile.mjs` with these exact public exports:

```js
import { normalizePrivateSkinRecipe, normalizePrivateSkinSettings } from "./private-skin-schema.mjs";

const BASES = Object.freeze({
  cinematic: { visibility: 84, overlay: 38, blur: 0, zoom: 108, sidebarAlpha: 78, mainAlpha: 32, headerAlpha: 60, composerAlpha: 94, codeAlpha: 92, selectionAlpha: 24, sidebarBlur: 20, mainBlur: 8, headerBlur: 18, composerBlur: 22, borderAlpha: 38, radius: 12, saturation: 104, imageContrast: 106, shadow: "0 22px 58px rgba(0,0,0,.42)" },
  glass: { visibility: 76, overlay: 44, blur: 1, zoom: 110, sidebarAlpha: 62, mainAlpha: 20, headerAlpha: 44, composerAlpha: 76, codeAlpha: 78, selectionAlpha: 16, sidebarBlur: 26, mainBlur: 14, headerBlur: 24, composerBlur: 28, borderAlpha: 30, radius: 16, saturation: 108, imageContrast: 102, shadow: "0 18px 42px rgba(0,0,0,.30)" },
  focus: { visibility: 48, overlay: 60, blur: 6, zoom: 112, sidebarAlpha: 94, mainAlpha: 82, headerAlpha: 92, composerAlpha: 98, codeAlpha: 98, selectionAlpha: 10, sidebarBlur: 10, mainBlur: 6, headerBlur: 10, composerBlur: 12, borderAlpha: 18, radius: 8, saturation: 92, imageContrast: 100, shadow: "0 12px 28px rgba(0,0,0,.24)" },
});

export function recommendRecipe(profile = {}) {
  if (profile.complexity >= 58 || profile.luminance >= 76 || profile.contrast >= 72) return "focus";
  if (profile.complexity <= 34 && profile.contrast <= 48) return "glass";
  return "cinematic";
}

export function deriveRecipeDefaults(profile, recipe, position = {}) {
  const id = normalizePrivateSkinRecipe(recipe);
  const base = BASES[id];
  const brightnessCorrection = Math.max(0, Math.min(14, Math.round(((profile?.luminance ?? 45) - 45) * 0.24)));
  return normalizePrivateSkinSettings({
    recipe: id,
    visibility: base.visibility,
    overlay: base.overlay + brightnessCorrection,
    blur: base.blur,
    zoom: base.zoom,
    positionX: position.positionX ?? 50,
    positionY: position.positionY ?? 50,
  });
}
```

Implement `analyzeImagePixels({ data, width, height, channels })` with these formulas:

- validate `channels` as 3 or 4 and require `data.length >= width * height * channels`;
- ignore pixels whose alpha is below 128;
- compute luminance as `(0.2126*r + 0.7152*g + 0.0722*b) / 255 * 100`;
- compute saturation as `(max(r,g,b) - min(r,g,b)) / 255 * 100`;
- select `primary` from saturation-weighted RGB means, using weight `max(8, saturation) / 100`;
- populate 12 hue buckets for pixels with saturation at least 12 and choose `secondary` from the highest `bucketWeight * hueDistanceFromPrimary`; fall back to the primary mixed 35% toward neutral blue-gray;
- derive `highlight` by mixing the more saturated of primary/secondary 38% toward white when its luminance is below 62, otherwise 18% toward RGB 24;
- compute `contrast` as the luminance standard deviation multiplied by 3.2 and clamped to 100;
- compute `complexity` from the mean RGB Euclidean distance to the left and upper opaque neighbor, divided by `441.67` and multiplied by 100;
- round metrics to integers, output lowercase six-digit hex colors, and set `recommendedRecipe` through `recommendRecipe`;
- use primary `#64748b`, secondary `#8b5cf6`, and highlight `#c4b5fd` when no opaque pixels exist.

Implement `deriveSkinTokens(profile, settings)` by normalizing settings, selecting `BASES[recipe]`, and returning exactly:

```js
{
  recipe,
  accent: profile.highlight,
  accentSoft: profile.secondary,
  surface: mixHex(profile.primary, "#06080d", recipe === "focus" ? 0.90 : 0.84),
  surfaceRaised: mixHex(profile.secondary, "#0b0d12", recipe === "glass" ? 0.78 : 0.86),
  ink: "#f4f1eb",
  mutedInk: "#b9bbc1",
  visibility: normalized.visibility,
  overlay: normalized.overlay,
  blur: normalized.blur,
  zoom: normalized.zoom,
  positionX: normalized.positionX,
  positionY: normalized.positionY,
  sidebarAlpha: base.sidebarAlpha,
  mainAlpha: base.mainAlpha,
  headerAlpha: base.headerAlpha,
  composerAlpha: base.composerAlpha,
  codeAlpha: base.codeAlpha,
  selectionAlpha: base.selectionAlpha,
  sidebarBlur: base.sidebarBlur,
  mainBlur: base.mainBlur,
  headerBlur: base.headerBlur,
  composerBlur: base.composerBlur,
  borderAlpha: base.borderAlpha,
  radius: base.radius,
  saturation: base.saturation,
  imageContrast: base.imageContrast,
  shadow: base.shadow,
}
```

Export a `derivePaletteFromProfile(profile)` compatibility helper returning `accent`, `surface`, `ink`, and a bounded contrast value. Change `private-skin-palette.mjs` so `derivePalette(rgb)` constructs a one-pixel profile through `analyzeImagePixels` and delegates to that helper; this keeps older imports stable during the migration.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs apps/site/tests/private-skin-schema.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add apps/site/app/lib/private-skin-schema.mjs apps/site/app/lib/private-skin-profile.mjs apps/site/app/lib/private-skin-palette.mjs apps/site/tests/private-skin-profile.test.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat: define adaptive skin recipes"
```

## Task 2: Generate Complete Recipe-driven Theme CSS

**Files:**
- Modify: `apps/site/app/lib/private-skin-package.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Replace the single-package assertion with a three-recipe failing test**

In `apps/site/tests/private-skin-schema.test.mjs`, build a deterministic profile once, then build all three packages:

```js
import { analyzeImagePixels, deriveRecipeDefaults } from "../app/lib/private-skin-profile.mjs";

const profile = analyzeImagePixels({
  data: new Uint8Array([180, 52, 76, 110, 48, 160, 220, 160, 70, 36, 44, 72]),
  width: 2,
  height: 2,
  channels: 3,
});

test("every adaptive recipe produces safe complete Codex CSS", () => {
  const cssByRecipe = new Map();
  for (const recipe of ["cinematic", "glass", "focus"]) {
    const serialized = buildPrivateSkinPackage({
      id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      exportedAt: "2026-07-19T00:00:00.000Z",
      image: Buffer.from("safe-image"),
      settings: deriveRecipeDefaults(profile, recipe),
      profile,
    });
    const bundle = validateThemePackage(JSON.parse(serialized));
    assert.deepEqual(lintThemePackage(bundle), []);
    const target = resolveThemeTarget(bundle, "codex");
    assert.doesNotMatch(target.css, /@import|url\(\s*["']?https?:/i);
    for (const selector of ["aside.app-shell-left-panel", "main.main-surface", "header.app-header-tint", ".composer-surface-chrome", "[aria-current=\"page\"]", ":is(pre, code, [data-language])"]) {
      assert.ok(target.css.includes(selector), `${recipe} must theme ${selector}`);
    }
    cssByRecipe.set(recipe, target.css);
  }
  assert.notEqual(cssByRecipe.get("cinematic"), cssByRecipe.get("glass"));
  assert.notEqual(cssByRecipe.get("glass"), cssByRecipe.get("focus"));
});
```

Keep the existing fixed Home/Session coordinate assertions.

- [ ] **Step 2: Run the package test and verify the old signature/selectors fail**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
```

Expected: FAIL because the package builder still accepts a single palette and lacks selected-state recipe CSS.

- [ ] **Step 3: Refactor the package builder around semantic tokens**

In `apps/site/app/lib/private-skin-package.mjs`:

- import `deriveSkinTokens` from `private-skin-profile.mjs`;
- replace the `palette` parameter with `profile`;
- call `deriveSkinTokens(profile, normalizedSettings)` once;
- keep the existing fixed `body::before` and Home image-selection strategy;
- emit token variables for accent, accent-soft, surface, raised surface, ink, muted ink, border alpha, and radius;
- use concrete token percentages in `color-mix()` rather than allowing client strings into CSS.

The `buildCss` template must interpolate the already-normalized tokens directly:

```js
return `html.codedrobe-codex-skin aside.app-shell-left-panel {
  background: color-mix(in srgb, var(--codextheme-surface) ${tokens.sidebarAlpha}%, transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  backdrop-filter: blur(${tokens.sidebarBlur}px) saturate(1.08) !important;
}

html.codedrobe-codex-skin main.main-surface {
  background: color-mix(in srgb, var(--codextheme-surface) ${tokens.mainAlpha}%, transparent) !important;
  backdrop-filter: blur(${tokens.mainBlur}px) saturate(1.03) !important;
}

html.codedrobe-codex-skin main.main-surface > header.app-header-tint {
  background: color-mix(in srgb, var(--codextheme-surface-raised) ${tokens.headerAlpha}%, transparent) !important;
}

html.codedrobe-codex-skin .composer-surface-chrome {
  background: color-mix(in srgb, var(--codextheme-surface-raised) ${tokens.composerAlpha}%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  border-radius: ${tokens.radius}px !important;
  box-shadow: ${tokens.shadow} !important;
  backdrop-filter: blur(${tokens.composerBlur}px) saturate(1.08) !important;
}

html.codedrobe-codex-skin aside.app-shell-left-panel :is([aria-current="page"], [aria-selected="true"], [data-state="active"]) {
  background: color-mix(in srgb, var(--codextheme-accent-soft) ${tokens.selectionAlpha}%, transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) 44%, transparent) !important;
  box-shadow: inset 3px 0 0 var(--codextheme-accent) !important;
}`;
```

Code surfaces use `codeAlpha`; the artwork filter uses token saturation and image contrast. Set base-theme accent, ink, surface, and contrast from the same tokens.

- [ ] **Step 4: Run package and safety tests**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
```

Expected: PASS for all three packages, runtime lint, fixed coordinate assertions, and upload-form assertions.

- [ ] **Step 5: Commit the package generator**

```bash
git add apps/site/app/lib/private-skin-package.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat: generate complete adaptive skin css"
```

## Task 3: Share Image Analysis Between Browser and Server

**Files:**
- Modify: `apps/site/app/lib/browser-image.mjs`
- Modify: `apps/site/app/lib/private-skin-service.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`
- Modify: `apps/site/tests/private-skin-service.test.mjs`

- [ ] **Step 1: Add failing transport and service assertions**

Update the upload-form assertion to require the normalized recipe but no profile fields:

```js
const body = buildPrivateSkinForm({
  image: new Blob(["x"], { type: "image/webp" }),
  settings: { recipe: "glass", visibility: 90, profile: { primary: "#ffffff" } },
});
assert.deepEqual([...body.keys()], ["image", "settings"]);
assert.deepEqual(JSON.parse(String(body.get("settings"))), {
  recipe: "glass",
  visibility: 90,
  overlay: 42,
  blur: 2,
  zoom: 110,
  positionX: 50,
  positionY: 50,
});
```

In `apps/site/tests/private-skin-service.test.mjs`, replace the harness `dominant` result with a raw sample and verify selected CSS survives:

```js
sample: {
  data: new Uint8Array([100, 70, 160, 100, 70, 160, 160, 70, 90, 160, 70, 90]),
  width: 2,
  height: 2,
  channels: 3,
},
```

After creating with `{ recipe: "focus" }`, parse the stored package and assert its CSS contains Focus values such as `blur(6px)` and a 98% composer mix.

- [ ] **Step 2: Run focused tests and verify service/profile failures**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs
```

Expected: FAIL because the service still derives a palette from `dominant` and the package call uses the old signature.

- [ ] **Step 3: Return an image profile from browser processing**

In `apps/site/app/lib/browser-image.mjs`, replace `sampledColor` with:

```js
function sampledPixels(canvas) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot analyze the image.");
  context.drawImage(canvas, 0, 0, 32, 32);
  return { data: context.getImageData(0, 0, 32, 32).data, width: 32, height: 32, channels: 4 };
}
```

Import `analyzeImagePixels`, return `profile: analyzeImagePixels(sampledPixels(canvas))`, and stop returning `palette`.

- [ ] **Step 4: Return a raw sample from server normalization**

In `normalizeUploadedImage`, replace `sharp(...).stats()` with a raw 32×32 sample:

```js
const sampled = await sharp(source, { animated: false })
  .rotate()
  .resize({ width: 32, height: 32, fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
```

Return:

```js
sample: {
  data: new Uint8Array(sampled.data),
  width: sampled.info.width,
  height: sampled.info.height,
  channels: sampled.info.channels,
},
```

Import `analyzeImagePixels` in the service, compute `profile` from `processed.sample`, and call `buildPrivateSkinPackage({ ..., settings: normalized, profile })`. Validate that the sample exists, has channels 3 or 4, and remains bounded to at most 4096 bytes before analysis.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit shared analysis**

```bash
git add apps/site/app/lib/browser-image.mjs apps/site/app/lib/private-skin-service.mjs apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs
git commit -m "feat: analyze private skin images on both sides"
```

## Task 4: Add Recipe Selection and Token-parity Preview

**Files:**
- Modify: `apps/site/app/components/CustomSkinStudio.tsx`
- Modify: `apps/site/app/components/CodexMockup.tsx`
- Modify: `apps/site/app/globals.css`
- Modify: `apps/site/app/lib/analytics.mjs`
- Modify: `apps/site/tests/analytics.test.mjs`

- [ ] **Step 1: Add a failing privacy-safe analytics test**

Extend `apps/site/tests/analytics.test.mjs`:

```js
test("recipe tracking exposes only the closed style and recommendation flag", async () => {
  const analytics = await loadAnalytics();
  const calls = [];
  const target = { gtag: (...args) => calls.push(args) };
  assert.equal(analytics.trackRecipeSelect("glass", true, target), true);
  assert.equal(analytics.trackRecipeSelect("custom-css", false, target), false);
  assert.deepEqual(calls, [["event", "custom_recipe_select", { recipe: "glass", recommended: "yes" }]]);
});
```

- [ ] **Step 2: Run the analytics test and verify the missing export**

Run:

```bash
node --test apps/site/tests/analytics.test.mjs
```

Expected: FAIL because `trackRecipeSelect` does not exist.

- [ ] **Step 3: Implement the closed recipe event**

In `apps/site/app/lib/analytics.mjs`, add:

```js
const RECIPE_IDS = new Set(["cinematic", "glass", "focus"]);

export function trackRecipeSelect(recipe, recommended, target = globalThis) {
  if (!RECIPE_IDS.has(recipe) || typeof recommended !== "boolean") return false;
  return sendEvent(target, "custom_recipe_select", {
    recipe,
    recommended: recommended ? "yes" : "no",
  });
}
```

`sendEvent` catches a missing or throwing `gtag` and returns `false`. Do not route filenames, palette values, settings, IDs, or generic objects through this function.

- [ ] **Step 4: Make the mockup consume shared tokens**

In `CodexMockup.tsx`:

- replace the `Palette` prop with the image-profile shape;
- import `deriveSkinTokens`;
- call it once from `profile` and `settings`;
- expose CSS variables for all semantic roles.

The CSS variable object must include:

```tsx
const tokens = deriveSkinTokens(profile, settings);
const style = {
  "--studio-accent": tokens.accent,
  "--studio-accent-soft": tokens.accentSoft,
  "--studio-surface": tokens.surface,
  "--studio-surface-raised": tokens.surfaceRaised,
  "--studio-ink": tokens.ink,
  "--studio-muted-ink": tokens.mutedInk,
  "--studio-visibility": tokens.visibility / 100,
  "--studio-overlay": tokens.overlay / 100,
  "--studio-blur": `${tokens.blur}px`,
  "--studio-zoom": tokens.zoom / 100,
  "--studio-position": `${tokens.positionX}% ${tokens.positionY}%`,
  "--studio-sidebar-alpha": `${tokens.sidebarAlpha}%`,
  "--studio-main-alpha": `${tokens.mainAlpha}%`,
  "--studio-header-alpha": `${tokens.headerAlpha}%`,
  "--studio-composer-alpha": `${tokens.composerAlpha}%`,
  "--studio-code-alpha": `${tokens.codeAlpha}%`,
  "--studio-selection-alpha": `${tokens.selectionAlpha}%`,
  "--studio-sidebar-blur": `${tokens.sidebarBlur}px`,
  "--studio-main-blur": `${tokens.mainBlur}px`,
  "--studio-header-blur": `${tokens.headerBlur}px`,
  "--studio-composer-blur": `${tokens.composerBlur}px`,
  "--studio-border-alpha": `${tokens.borderAlpha}%`,
  "--studio-radius": `${tokens.radius}px`,
  "--studio-shadow": tokens.shadow,
} as CSSProperties;
```

Add a small current-recipe label to `figcaption` so visual QA can confirm which treatment is rendered.

- [ ] **Step 5: Add the style cards and recipe-aware reset**

In `CustomSkinStudio.tsx`:

- define typed IDs `cinematic | glass | focus` and three English labels/descriptions;
- replace `image.palette` with `image.profile`;
- use a fixed sample profile whose recommendation is Cinematic;
- initialize sample settings with `deriveRecipeDefaults(SAMPLE_PROFILE, "cinematic")` so the first preview displays the real Cinematic recipe rather than the old generic defaults;
- after image processing, set settings with `deriveRecipeDefaults(processed.profile, processed.profile.recommendedRecipe)`;
- on recipe selection, preserve `positionX` and `positionY`, replace other automatic values through `deriveRecipeDefaults`, clear the old result, and call `trackRecipeSelect`;
- pass the current local `imageUrl` into every recipe card and use it with the recipe's focal position, zoom, filters, artwork opacity, and material surfaces;
- invalidate overlapping image/create work and revoke stale or unmounted Blob URLs without side effects inside state updaters;
- reset the file input so the same image can be selected again;
- pass `profile` to `CodexMockup`;
- update the hero lead to `Upload an image, choose a complete visual system, and apply the finished Codex skin with one command.`

Render the style group before the slider controls:

```tsx
<fieldset className="studio-recipes">
  <legend>Skin style</legend>
  <div className="recipe-grid">
    {RECIPES.map((recipe) => {
      const recommended = recipe.id === profile.recommendedRecipe;
      return (
        <button
          key={recipe.id}
          type="button"
          className="recipe-card"
          aria-pressed={settings.recipe === recipe.id}
          onClick={() => selectRecipe(recipe.id)}
        >
          <span className="recipe-swatch" aria-hidden="true" style={recipeMaterialStyle}>
            <i className="recipe-art" />
            <i className="recipe-backdrop" />
            <i className="recipe-material-sidebar" />
            <i className="recipe-material-main" />
            <i className="recipe-material-composer" />
          </span>
          <span><b>{recipe.label}</b><small>{recipe.description}</small></span>
          {recommended && <em>Recommended for this image</em>}
        </button>
      );
    })}
  </div>
</fieldset>
```

Wrap the existing `.studio-controls` in `<details className="studio-advanced"><summary>Advanced adjustments</summary>…</details>`. Reset must call `deriveRecipeDefaults(profile, settings.recipe, settings)` so focal position survives.

- [ ] **Step 6: Drive all preview chrome from semantic variables**

In `globals.css`, replace hard-coded mockup surface percentages and blur/radius/shadow values with the new variables:

```css
.mockup-sidebar { background: color-mix(in srgb, var(--studio-surface) var(--studio-sidebar-alpha), transparent); border-color: color-mix(in srgb, var(--studio-accent) var(--studio-border-alpha), transparent); backdrop-filter: blur(var(--studio-sidebar-blur)) saturate(1.08); }
.mockup-main { background: color-mix(in srgb, var(--studio-surface) var(--studio-main-alpha), transparent); backdrop-filter: blur(var(--studio-main-blur)); }
.mockup-composer { background: color-mix(in srgb, var(--studio-surface-raised) var(--studio-composer-alpha), transparent); border-color: color-mix(in srgb, var(--studio-accent) var(--studio-border-alpha), transparent); border-radius: var(--studio-radius); box-shadow: var(--studio-shadow); backdrop-filter: blur(var(--studio-composer-blur)); }
.mockup-session { background: transparent; }
.mockup-session > header { background: color-mix(in srgb, var(--studio-surface-raised) var(--studio-header-alpha), transparent); backdrop-filter: blur(var(--studio-header-blur)); }
.mockup-thread pre { background: color-mix(in srgb, var(--studio-surface) var(--studio-code-alpha), transparent); }
.mockup-sidebar > b { background: color-mix(in srgb, var(--studio-accent-soft) var(--studio-selection-alpha), transparent); border-color: color-mix(in srgb, var(--studio-accent) var(--studio-border-alpha), transparent); border-radius: var(--studio-radius); }
```

Add accessible recipe styles with 44 px minimum targets, a high-contrast selected state, compact recommendation text, and a mobile stack:

```css
.studio-recipes { margin: 17px 0 0; padding: 0; border: 0; }
.studio-recipes legend { margin-bottom: 8px; font: 800 8px/1 Menlo, Consolas, monospace; text-transform: uppercase; }
.recipe-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.recipe-card { min-height: 92px; display: grid; grid-template-columns: 18px 1fr; gap: 8px; align-content: start; padding: 9px; border: 1px solid #b8bdc2; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.recipe-card[aria-pressed="true"] { border-color: var(--ink); background: var(--proof); box-shadow: inset 3px 0 0 var(--blue); }
.recipe-card > i { width: 18px; height: 44px; border: 1px solid var(--ink); }
.recipe-card span { display: grid; gap: 4px; }.recipe-card b { font-size: 9px; }.recipe-card small, .recipe-card em { color: var(--muted); font: 650 7px/1.35 Menlo, Consolas, monospace; font-style: normal; }
.recipe-card em { grid-column: 1 / -1; color: var(--blue); }
.studio-advanced { margin-top: 12px; border-top: 1px solid var(--ink); }.studio-advanced summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font: 800 8px/1 Menlo, Consolas, monospace; }
```

At `max-width: 720px`, set `.recipe-grid { grid-template-columns: 1fr; }`. Preserve reduced-motion rules and visible focus outlines.

- [ ] **Step 7: Run focused tests and production build**

Run:

```bash
node --test apps/site/tests/analytics.test.mjs apps/site/tests/private-skin-profile.test.mjs apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs
npm run typecheck -w @codextheme/site
npm run build -w @codextheme/site
```

Expected: all tests PASS; Next.js produces `/`, private API routes, help, security, sitemap, and three theme routes without TypeScript or CSS errors.

- [ ] **Step 8: Commit the studio and preview**

```bash
git add apps/site/app/components/CustomSkinStudio.tsx apps/site/app/components/CodexMockup.tsx apps/site/app/globals.css apps/site/app/lib/analytics.mjs apps/site/tests/analytics.test.mjs
git commit -m "feat: add adaptive skin recipe studio"
```

## Task 5: Verify the Complete Product Path

**Files:**
- Modify only if verification exposes a defect in files already listed above.

- [x] **Step 1: Run the full repository gate outside restricted port sandboxing**

Run:

```bash
npm run check
```

Expected: theme tests PASS, 42 CLI tests PASS, 42 runtime tests PASS, all site tests including the new profile tests PASS, the monorepo build succeeds, and package checks succeed.

- [x] **Step 2: Start the local site and perform visual QA**

Run:

```bash
npm run dev -w @codextheme/site
```

Open the reported localhost URL and verify:

1. The sample state shows Cinematic and the preview looks materially different from official Codex beyond the wallpaper.
2. Uploading a disposable warm image recommends exactly one recipe.
3. Cinematic, Glass, and Focus visibly change sidebar, main area, header, composer, selected project, code block, border, shadow, and background together.
4. Home/Session switching keeps the artwork anchored.
5. Advanced adjustments remain collapsed initially and reset preserves X/Y.
6. Mobile width shows usable recipe targets without horizontal page overflow.
7. No upload request occurs before **Create private skin**.

- [x] **Step 3: Create one local private package and inspect it through the service harness**

Use the local studio with configured development Blob credentials or invoke the tested service harness. Confirm the stored package:

- contains the chosen recipe's generated CSS;
- contains only the local `hero` and `session-bg` images;
- contains no profile, filename, remote URL, JavaScript, or arbitrary CSS input;
- passes `validateThemePackage` and `lintThemePackage`.

- [ ] **Step 4: Apply one disposable generated skin to real Codex**

Use the production-equivalent command returned by the local/preview deployment. Verify the real app matches the preview hierarchy in Home and Session, applies without an unnecessary restart when live injection is available, preserves fixed background anchoring, reapplies from local cache offline, and restores idempotently twice.

- [ ] **Step 5: Review analytics in the browser network/debug view**

Select a recipe and confirm the only new payload is:

```json
{
  "event": "custom_recipe_select",
  "recipe": "cinematic|glass|focus",
  "recommended": "yes|no"
}
```

Confirm no image profile, palette, filename, ID, dimensions, slider values, or temporary URL is present.

- [ ] **Step 6: Commit any verification-only fixes and leave the branch clean**

If no fixes were required, do not create an empty commit. Otherwise:

```bash
git add apps/site/app apps/site/tests
git commit -m "fix: align adaptive skin preview and output"
```

Run `git status --short` and expect no output.

### Pre-merge verification record — 2026-07-19

- `npm run check`: exit 0.
- Theme tests: 2/2; CLI tests: 42/42; runtime tests: 42/42; site tests: 69/69.
- Production build: 12 routes generated; three catalog themes packed and verified; package release checks passed.
- Browser upload: one local image produced exactly three recipe cards and one Glass recommendation.
- Shared preview tokens differed materially: Cinematic used sidebar/main/header/composer alpha `78/32/60/94`; Focus used `94/82/92/98`.
- Home and Session retained identical artwork document coordinates, dimensions, background position, and cover sizing.
- Mobile viewport: one 362 px recipe column inside a 390 px viewport, all cards at least 76 px high, and no horizontal overflow.
- Browser console: no warnings or errors.
- Post-deploy gates still open: apply one live private skin to Codex, then inspect the production GA4 recipe payload.
