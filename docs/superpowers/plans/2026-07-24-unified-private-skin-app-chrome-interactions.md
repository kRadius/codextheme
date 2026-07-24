# Unified Private-Skin App-Chrome Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every verified Codex application-chrome control in newly generated private skins use one visible, image-derived hover/focus/open system while preserving selected, primary, dangerous, disabled, and content semantics.

**Architecture:** Add a deterministic chroma-correction stage to private-skin token derivation, then move verified interaction-family selectors into a focused CSS generator consumed by the private package builder. Extend the browser mockup with the same semantic interaction tokens and representative chrome controls, and verify the result with selector-contract tests plus a real Codex CDP matrix.

**Tech Stack:** Node.js ESM, Next.js 16, React 19, generated CSS, Node test runner, CodexTheme runtime CDP.

---

## File Map

- Modify `apps/site/app/lib/private-skin-profile.mjs` — derive the contrast-safe, minimum-chroma interaction accent.
- Modify `apps/site/tests/private-skin-profile.test.mjs` — lock chroma floor, fallback hue, vivid-color preservation, and contrast.
- Create `apps/site/app/lib/private-skin-interactions.mjs` — own the six verified app-chrome selector families and render their state CSS.
- Modify `apps/site/app/lib/private-skin-package.mjs` — compose the interaction CSS into newly generated private packages.
- Modify `apps/site/tests/private-skin-schema.test.mjs` — enforce selector ownership, exclusions, state precedence, and generated CSS.
- Modify `apps/site/app/components/CodexMockup.tsx` — render representative sidebar, header, summary, menu, home, and composer controls.
- Modify `apps/site/app/globals.css` — mirror the generated interaction material in the browser preview.
- Modify `apps/site/tests/studio-source-contract.test.mjs` — enforce preview/package parity and Send exclusions.
- Create `scripts/qa-private-skin-app-chrome.mjs` — apply a deterministic low-chroma package and audit verified hover roots through loopback CDP.
- Create `docs/qa/2026-07-24-private-skin-app-chrome.md` — record real-app Home/Session and desktop/narrow results.

### Task 1: Correct Low-Chroma Image Accents

**Files:**
- Modify: `apps/site/tests/private-skin-profile.test.mjs`
- Modify: `apps/site/app/lib/private-skin-profile.mjs`

- [ ] **Step 1: Add failing accent-contract tests**

Add this helper beside `contrastRatio` in `apps/site/tests/private-skin-profile.test.mjs`:

```js
function hsl(color) {
  const [red, green, blue] = color.slice(1).match(/../gu)
    .map((value) => Number.parseInt(value, 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (range === 0) return { hue: 0, saturation: 0, lightness: lightness * 100 };
  const saturation = range / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (maximum === red) hue = ((green - blue) / range) % 6;
  else if (maximum === green) hue = (blue - red) / range + 2;
  else hue = (red - green) / range + 4;
  return {
    hue: (hue * 60 + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function hueDistance(first, second) {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
}
```

Add these tests:

```js
test("skin interaction accent raises low chroma without losing the image hue", () => {
  const tokens = deriveSkinTokens({
    primary: "#3e372f",
    secondary: "#8d6a45",
    highlight: "#948475",
    luminance: 38,
    saturation: 12,
    contrast: 24,
    complexity: 18,
  }, { recipe: "cinematic" });
  const corrected = hsl(tokens.accent);
  assert.ok(corrected.saturation >= 41.5, `expected >= 42% saturation, received ${corrected.saturation}`);
  assert.ok(hueDistance(corrected.hue, hsl("#948475").hue) <= 2);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("skin interaction accent preserves already vivid image highlights", () => {
  const tokens = deriveSkinTokens({
    primary: "#08253b",
    secondary: "#0a8fb4",
    highlight: "#27c7ee",
    luminance: 35,
    saturation: 78,
    contrast: 52,
    complexity: 24,
  }, { recipe: "glass" });
  assert.equal(tokens.accent, "#27c7ee");
});

test("achromatic highlights borrow a usable image hue before safe fallback", () => {
  const borrowed = deriveSkinTokens({
    primary: "#303030",
    secondary: "#7350a8",
    highlight: "#9a9a9a",
    luminance: 35,
    saturation: 3,
    contrast: 20,
    complexity: 10,
  }, { recipe: "focus" });
  assert.ok(hueDistance(hsl(borrowed.accent).hue, hsl("#7350a8").hue) <= 2);
  assert.ok(hsl(borrowed.accent).saturation >= 41.5);

  const fallback = deriveSkinTokens({
    primary: "#303030",
    secondary: "#777777",
    highlight: "#9a9a9a",
  }, { recipe: "focus" });
  assert.ok(hsl(fallback.accent).saturation >= 41.5);
  assert.ok(contrastRatio(fallback.accent, fallback.surface) >= 4.5);
});
```

- [ ] **Step 2: Run the tests and confirm the low-chroma cases fail**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: the new low-chroma and achromatic tests fail because `deriveSkinTokens` still passes `safe.highlight` directly to `readableAccent`.

- [ ] **Step 3: Implement HSL chroma correction**

Add below `readableAccent` in `apps/site/app/lib/private-skin-profile.mjs`:

```js
const INTERACTION_SATURATION_FLOOR = 42;
const ACHROMATIC_SATURATION_THRESHOLD = 4;

function rgbToHsl(color) {
  const [red, green, blue] = parseHex(color, FALLBACK_COLORS.highlight)
    .map((value) => value / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (range === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = range / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (maximum === red) hue = ((green - blue) / range) % 6;
  else if (maximum === green) hue = (blue - red) / range + 2;
  else hue = (red - green) / range + 4;
  return { hue: (hue * 60 + 360) % 360, saturation: saturation * 100, lightness };
}

function hslToHex({ hue, saturation, lightness }) {
  const safeSaturation = clamp(saturation, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * safeSaturation;
  const sector = ((hue % 360) + 360) % 360 / 60;
  const intermediate = chroma * (1 - Math.abs(sector % 2 - 1));
  const [red, green, blue] = (
    sector < 1 ? [chroma, intermediate, 0]
      : sector < 2 ? [intermediate, chroma, 0]
        : sector < 3 ? [0, chroma, intermediate]
          : sector < 4 ? [0, intermediate, chroma]
            : sector < 5 ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate]
  );
  const match = lightness - chroma / 2;
  return hex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

function readableInteractionAccent(source, surface) {
  const saturation = Math.max(source.saturation, INTERACTION_SATURATION_FLOOR);
  for (let step = 0; step <= 100; step += 1) {
    const candidate = hslToHex({
      hue: source.hue,
      saturation,
      lightness: clamp(source.lightness + step / 100, 0, 1),
    });
    if (contrastRatio(candidate, surface) >= 4.5) return candidate;
  }
  return FALLBACK_COLORS.highlight;
}

function interactionAccent(safe, surface) {
  const highlight = rgbToHsl(safe.highlight);
  const alternatives = [safe.secondary, safe.primary]
    .map((color) => ({ color, hsl: rgbToHsl(color) }))
    .sort((first, second) => second.hsl.saturation - first.hsl.saturation);
  const source = highlight.saturation >= ACHROMATIC_SATURATION_THRESHOLD
    ? highlight
    : alternatives[0]?.hsl.saturation >= ACHROMATIC_SATURATION_THRESHOLD
      ? alternatives[0].hsl
      : rgbToHsl(FALLBACK_COLORS.highlight);
  return readableInteractionAccent(source, surface);
}
```

Replace:

```js
accent: readableAccent(safe.highlight, surface),
```

with:

```js
accent: interactionAccent(safe, surface),
```

- [ ] **Step 4: Run the profile tests**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: all profile tests pass, including the existing exact fallback normalization assertion and the new saturation/contrast assertions.

- [ ] **Step 5: Commit the token change**

```bash
git add apps/site/app/lib/private-skin-profile.mjs apps/site/tests/private-skin-profile.test.mjs
git commit -m "feat(site): strengthen private skin interaction accent"
```

### Task 2: Generate One Interaction System for Six App-Chrome Families

**Files:**
- Create: `apps/site/app/lib/private-skin-interactions.mjs`
- Modify: `apps/site/app/lib/private-skin-package.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Add failing selector-family and state tests**

Import the new module at the top of `apps/site/tests/private-skin-schema.test.mjs`:

```js
import {
  PRIVATE_SKIN_INTERACTION_FAMILIES,
  buildPrivateSkinInteractionCss,
} from "../app/lib/private-skin-interactions.mjs";
```

Add:

```js
test("private skin interactions cover the six verified app-chrome families", () => {
  assert.deepEqual(
    PRIVATE_SKIN_INTERACTION_FAMILIES.map(({ id, paintTarget }) => ({ id, paintTarget })),
    [
      { id: "sidebar-chrome", paintTarget: "self" },
      { id: "header-chrome", paintTarget: "self" },
      { id: "summary-chrome", paintTarget: "before" },
      { id: "menu-chrome", paintTarget: "self" },
      { id: "home-chrome", paintTarget: "self" },
      { id: "composer-secondary", paintTarget: "self" },
    ],
  );
  const css = buildPrivateSkinInteractionCss();
  for (const selector of [
    "aside.app-shell-left-panel",
    "header.app-header-tint",
    "[class~=\"group/summary-panel-item\"]",
    "[role=\"menu\"] [role=\"menuitem\"]",
    ".dream-home",
    ".composer-surface-chrome",
  ]) {
    assert.ok(css.includes(selector), `missing verified family: ${selector}`);
  }
  assert.match(css, /\[class~="group\/summary-panel-item"\][^,{]*::before\s*\{[^}]*background-color:\s*transparent\s*!important;/s);
  assert.match(css, /\[class~="group\/summary-panel-item"\][^,{]*:is\(:hover, :focus-visible, \[data-state="open"\]\)::before/s);
  assert.doesNotMatch(css, /html\.codextheme-codex-skin\s+(?:button|a):hover/u);
  assert.doesNotMatch(css, /html\.codextheme-codex-skin\s+svg\s*\{/u);
  assert.doesNotMatch(css, /\.size-token-button-composer/u);
});

test("private skin interaction selectors fail closed for excluded controls", () => {
  const css = buildPrivateSkinInteractionCss();
  assert.match(css, /:not\(:disabled, \[aria-disabled="true"\]\)/u);
  assert.match(css, /:not\(\[data-variant="destructive"\]\)/u);
  assert.match(css, /:not\(\[class\*="text-token-danger"\]\)/u);
  assert.match(css, /:not\(\[class\*="text-token-error"\]\)/u);
  assert.match(css, /:not\(:has\(\[class\*="text-token-danger"\], \[class\*="text-token-error"\]\)\)/u);
  assert.match(css, /\[role="menu"\] \[role="menuitem"\]/u);
  assert.doesNotMatch(css, /\[data-message-author-role/u);
  assert.doesNotMatch(css, /\b(?:pre|code)\b|\[data-language/u);
});
```

Extend the package recipe loop to assert:

```js
for (const marker of [
  "/* codextheme-interaction:sidebar-chrome */",
  "/* codextheme-interaction:header-chrome */",
  "/* codextheme-interaction:summary-chrome */",
  "/* codextheme-interaction:menu-chrome */",
  "/* codextheme-interaction:home-chrome */",
  "/* codextheme-interaction:composer-secondary */",
]) {
  assert.ok(css.includes(marker), `${recipe} must emit ${marker}`);
}
```

- [ ] **Step 2: Run the schema test and confirm the module is missing**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `private-skin-interactions.mjs`.

- [ ] **Step 3: Create the interaction-family module**

Create `apps/site/app/lib/private-skin-interactions.mjs`:

```js
const ENABLED = ':not(:disabled, [aria-disabled="true"])';
const SAFE_ACTION = ':not([data-variant="destructive"]):not([class*="text-token-danger"]):not([class*="text-token-error"]):not(:has([class*="text-token-danger"], [class*="text-token-error"]))';
const TRANSIENT_STATE = ':is(:hover, :focus-visible, [data-state="open"])';

export const PRIVATE_SKIN_INTERACTION_FAMILIES = Object.freeze([
  Object.freeze({
    id: "sidebar-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "aside.app-shell-left-panel button:not(:where(.group > button))",
      "aside.app-shell-left-panel [class~=\"group/section-toggle\"]",
      "aside.app-shell-left-panel .group:has(> button > .text-token-foreground)",
      "aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group",
    ]),
  }),
  Object.freeze({
    id: "header-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "main.main-surface header.app-header-tint button",
    ]),
  }),
  Object.freeze({
    id: "summary-chrome",
    paintTarget: "before",
    roots: Object.freeze([
      "button[class~=\"group/summary-panel-item\"]",
    ]),
  }),
  Object.freeze({
    id: "menu-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      "[role=\"menu\"] [role=\"menuitem\"]",
      "[role=\"listbox\"] [role=\"option\"]",
    ]),
  }),
  Object.freeze({
    id: "home-chrome",
    paintTarget: "self",
    roots: Object.freeze([
      ".dream-home button:not(header *, .composer-surface-chrome *)",
    ]),
  }),
  Object.freeze({
    id: "composer-secondary",
    paintTarget: "self",
    roots: Object.freeze([
      ".composer-surface-chrome button.border-token-border",
    ]),
  }),
]);

function owned(selector) {
  return `html.codextheme-codex-skin ${selector}`;
}

function eligible(selector) {
  return `${selector}${ENABLED}${SAFE_ACTION}`;
}

function stateful(selector) {
  return `${eligible(selector)}${TRANSIENT_STATE}`;
}

function selectorList(family, transform = (selector) => selector) {
  return family.roots.map((selector) => owned(transform(selector))).join(",\n");
}

function glyphSelector(selector) {
  return `${selector} :is(.text-token-foreground, svg)`;
}

function familyCss(family) {
  const base = selectorList(family, eligible);
  const state = selectorList(family, stateful);
  const glyphs = selectorList(family, (selector) => glyphSelector(eligible(selector)));
  const stateGlyphs = selectorList(family, (selector) => glyphSelector(stateful(selector)));
  const paint = selectorList(
    family,
    (selector) => `${stateful(selector)}${family.paintTarget === "before" ? "::before" : ""}`,
  );
  const pseudoReset = family.paintTarget === "before"
    ? `${selectorList(family, (selector) => `${eligible(selector)}::before`)} {
  background-color: transparent !important;
  box-shadow: none !important;
}\n\n`
    : "";
  const border = family.paintTarget === "before"
    ? ""
    : "  border-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent) !important;\n";
  return `/* codextheme-interaction:${family.id} */
${base} {
  transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
}

${glyphs} {
  transition: color .16s ease, filter .16s ease;
}

${state} {
  color: var(--codextheme-accent) !important;
}

${pseudoReset}${paint} {
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-surface-alpha), transparent) !important;
${border}  border-radius: var(--codextheme-radius) !important;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent) !important;
}

${stateGlyphs} {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-hover-glow-alpha), transparent));
}`;
}

export function buildPrivateSkinInteractionCss() {
  return PRIVATE_SKIN_INTERACTION_FAMILIES.map(familyCss).join("\n\n");
}
```

- [ ] **Step 4: Compose the generated interaction CSS**

Import the renderer in `apps/site/app/lib/private-skin-package.mjs`:

```js
import { buildPrivateSkinInteractionCss } from "./private-skin-interactions.mjs";
```

Inside `buildCss`, add:

```js
  const interactionCss = buildPrivateSkinInteractionCss();
```

Replace the existing transition, transient interaction-material, and transient glyph blocks with:

```js
${interactionCss}
```

Keep the existing selected-surface and persistent selected-glyph blocks after `${interactionCss}` so selected state appears later in the cascade and outranks hover.

- [ ] **Step 5: Update the selector audit to consume the six families**

In `apps/site/tests/private-skin-schema.test.mjs`, replace the hand-maintained base/transient family arrays with:

```js
const TEST_ENABLED = ':not(:disabled, [aria-disabled="true"])';
const TEST_SAFE_ACTION = ':not([data-variant="destructive"]):not([class*="text-token-danger"]):not([class*="text-token-error"]):not(:has([class*="text-token-danger"], [class*="text-token-error"]))';
const TEST_STATE = ':is(:hover, :focus-visible, [data-state="open"])';

function testedEligible(selector) {
  return `${selector}${TEST_ENABLED}${TEST_SAFE_ACTION}`;
}

function testedStateful(selector) {
  return `${testedEligible(selector)}${TEST_STATE}`;
}

const PRIVATE_SKIN_BASE_ICON_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .flatMap((family) => family.roots.map(testedEligible));

const PRIVATE_SKIN_BASE_GLYPH_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .flatMap((family) => family.roots.map((selector) => (
    `${testedEligible(selector)} :is(.text-token-foreground, svg)`
  )));

const PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .flatMap((family) => family.roots.map(testedStateful));

const PRIVATE_SKIN_TRANSIENT_PAINT_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .flatMap((family) => family.roots.map((selector) => (
    `${testedStateful(selector)}${family.paintTarget === "before" ? "::before" : ""}`
  )));

const PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .flatMap((family) => family.roots.map((selector) => (
    `${testedStateful(selector)} :is(.text-token-foreground, svg)`
  )));

const PRIVATE_SKIN_SUMMARY_RESET_SELECTORS = PRIVATE_SKIN_INTERACTION_FAMILIES
  .filter((family) => family.paintTarget === "before")
  .flatMap((family) => family.roots.map((selector) => `${testedEligible(selector)}::before`));
```

Preserve the explicit selected-surface and selected-glyph arrays.

For `paintTarget: "before"`, accept only these declarations on the transient pseudo-element:

```js
["background-color", "border-radius", "box-shadow"]
```

Accept `["color"]` for the state-color block. When a self-painted selector appears in both the transient-root and paint sets, also accept exactly `["background-color", "border-color", "border-radius", "box-shadow"]` for its separate material block. Accept transition declarations on the two base arrays, `["color", "filter"]` on transient glyph selectors, and `["background-color", "box-shadow"]` on summary reset selectors. Continue failing any other SVG selector or any interaction alpha outside the approved selector sets.

For the summary root itself, accept transition-only and glyph-color rules. Continue failing any other SVG selector or any interaction alpha outside an approved family.

- [ ] **Step 6: Run schema and package tests**

Run:

```bash
node --test apps/site/tests/private-skin-schema.test.mjs
node --test apps/site/tests/private-skin-service.test.mjs
```

Expected: both commands pass; every recipe emits the six markers; existing namespace, schema, size, and security assertions remain green.

- [ ] **Step 7: Commit the interaction generator**

```bash
git add apps/site/app/lib/private-skin-interactions.mjs apps/site/app/lib/private-skin-package.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat(site): unify private skin app chrome interactions"
```

### Task 3: Bring the Browser Preview to Contract Parity

**Files:**
- Modify: `apps/site/app/components/CodexMockup.tsx`
- Modify: `apps/site/app/globals.css`
- Modify: `apps/site/tests/studio-source-contract.test.mjs`

- [ ] **Step 1: Add failing preview-contract tests**

Add to `apps/site/tests/studio-source-contract.test.mjs`:

```js
test("preview demonstrates every unified app-chrome interaction family", () => {
  for (const marker of [
    "mockup-sidebar-control",
    "mockup-header-control",
    "mockup-summary-control",
    "mockup-menu-control",
    "mockup-prompt-control",
    "mockup-composer-secondary",
  ]) {
    assert.ok(mockup.includes(marker), `preview must render ${marker}`);
    assert.ok(css.includes(`.${marker}`), `preview CSS must style ${marker}`);
  }
  assert.match(mockup, /className="mockup-summary-control is-hover-preview"/u);
  assert.match(mockup, /className="mockup-selected"/u);
  assert.match(mockup, /className="mockup-composer-primary"/u);
  assert.doesNotMatch(css, /\.mockup-composer-primary(?:\s|,|:is\([^)]*:hover)/u);
});

test("preview shares one material rule across chrome families", () => {
  assert.match(
    css,
    /\.mockup-sidebar-control:is\(:hover, :focus-visible, \.is-hover-preview\),[\s\S]*\.mockup-composer-secondary:is\(:hover, :focus-visible, \.is-hover-preview\)\s*\{[^}]*var\(--studio-icon-hover-surface-alpha\)[^}]*var\(--studio-icon-hover-border-alpha\)[^}]*var\(--studio-icon-hover-glow-alpha\)/u,
  );
});
```

- [ ] **Step 2: Run the preview contract test and confirm it fails**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs
```

Expected: FAIL because the representative classes and summary/menu preview do not exist.

- [ ] **Step 3: Add representative controls to `CodexMockup`**

Update the sidebar and main markup in `apps/site/app/components/CodexMockup.tsx` to use explicit semantic preview classes:

```tsx
<strong className="mockup-sidebar-control">Codex <small>⌄</small></strong>
<nav>
  <span className="mockup-sidebar-control"><i>＋</i> New chat</span>
  <span className="mockup-sidebar-control"><i>⌘</i> Commands</span>
  <span className="mockup-sidebar-control"><i>◴</i> Scheduled</span>
  <span className="mockup-sidebar-control"><i>◇</i> Plugins</span>
</nav>
<p>Projects</p>
<b className="mockup-selected"><i>□</i> codextheme</b>
```

Use `mockup-prompt-control` on each home prompt. In Session, replace the header controls and add a compact summary panel and visible menu sample:

```tsx
<header>
  <b>Private skin studio</b>
  <span className="mockup-header-control">•••</span>
</header>
<aside className="mockup-summary">
  <strong>Environment</strong>
  <span className="mockup-summary-control"><i>▣</i> Changes</span>
  <span className="mockup-summary-control is-hover-preview"><i>⌘</i> Local</span>
  <strong>Sources</strong>
  <span className="mockup-summary-control"><i>▧</i> image.png</span>
</aside>
<div className="mockup-menu">
  <span className="mockup-menu-control"><i>◇</i> Open options</span>
</div>
```

Update the composer:

```tsx
<span className="mockup-composer-actions">
  <i className="mockup-composer-secondary">⌁</i>
  <b className="mockup-composer-primary">↑</b>
</span>
```

- [ ] **Step 4: Replace separate hover rules with one preview material rule**

In `apps/site/app/globals.css`, create one shared rule:

```css
.mockup-sidebar-control,
.mockup-header-control,
.mockup-summary-control,
.mockup-menu-control,
.mockup-prompt-control,
.mockup-composer-secondary {
  border: 1px solid transparent;
  transition: color .16s ease, background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.mockup-sidebar-control:is(:hover, :focus-visible, .is-hover-preview),
.mockup-header-control:is(:hover, :focus-visible, .is-hover-preview),
.mockup-summary-control:is(:hover, :focus-visible, .is-hover-preview),
.mockup-menu-control:is(:hover, :focus-visible, .is-hover-preview),
.mockup-prompt-control:is(:hover, :focus-visible, .is-hover-preview),
.mockup-composer-secondary:is(:hover, :focus-visible, .is-hover-preview) {
  color: var(--studio-accent);
  background: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-surface-alpha), transparent);
  border-color: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-border-alpha), transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-glow-alpha), transparent);
}

.mockup-sidebar-control:is(:hover, :focus-visible, .is-hover-preview) i,
.mockup-header-control:is(:hover, :focus-visible, .is-hover-preview) i,
.mockup-summary-control:is(:hover, :focus-visible, .is-hover-preview) i,
.mockup-menu-control:is(:hover, :focus-visible, .is-hover-preview) i,
.mockup-prompt-control:is(:hover, :focus-visible, .is-hover-preview) i,
.mockup-composer-secondary:is(:hover, :focus-visible, .is-hover-preview) {
  color: var(--studio-accent);
}

.mockup-header-control {
  display: inline-grid;
  min-width: 24px;
  min-height: 22px;
  place-items: center;
  border-radius: 7px;
}

.mockup-session .mockup-thread {
  max-width: 58%;
  margin-left: 5%;
  margin-right: auto;
}

.mockup-summary {
  position: absolute;
  right: 2.5%;
  top: 16%;
  width: 26%;
  display: grid;
  gap: 3px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--studio-accent) var(--studio-border-alpha), transparent);
  border-radius: var(--studio-radius);
  background: color-mix(in srgb, var(--studio-surface-raised) var(--studio-header-alpha), transparent);
  backdrop-filter: blur(var(--studio-header-blur));
}

.mockup-summary strong {
  margin: 4px 5px 2px;
  color: color-mix(in srgb, var(--studio-muted-ink) 72%, transparent);
  font-size: .86em;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.mockup-summary-control,
.mockup-menu-control {
  min-height: 25px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 7px;
  border-radius: calc(var(--studio-radius) * .65);
  color: color-mix(in srgb, var(--studio-muted-ink) 88%, transparent);
}

.mockup-summary-control i,
.mockup-menu-control i {
  min-width: 13px;
  color: inherit;
  font-style: normal;
  text-align: center;
}

.mockup-menu {
  position: absolute;
  right: 3%;
  top: 61%;
  width: 23%;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--studio-accent) var(--studio-border-alpha), transparent);
  border-radius: calc(var(--studio-radius) * .75);
  background: color-mix(in srgb, var(--studio-surface) 92%, transparent);
  box-shadow: var(--studio-shadow);
}
```

Keep `.mockup-composer-primary` on the existing persistent native light surface and do not include it in the shared interaction selector.

- [ ] **Step 5: Run the site contract, lint, and typecheck**

Run:

```bash
node --test apps/site/tests/studio-source-contract.test.mjs
npm run lint -w @codextheme/site
npm run typecheck -w @codextheme/site
```

Expected: all commands pass.

- [ ] **Step 6: Commit preview parity**

```bash
git add apps/site/app/components/CodexMockup.tsx apps/site/app/globals.css apps/site/tests/studio-source-contract.test.mjs
git commit -m "feat(site): preview unified private skin interactions"
```

### Task 4: Run Full Regression Verification

**Files:**
- None.

- [ ] **Step 1: Run the focused private-skin suite**

```bash
node --test \
  apps/site/tests/private-skin-profile.test.mjs \
  apps/site/tests/private-skin-schema.test.mjs \
  apps/site/tests/private-skin-service.test.mjs \
  apps/site/tests/studio-source-contract.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the complete repository check**

```bash
npm run check
```

Expected: typecheck, all workspace tests, theme build, site build, package checks, and product-namespace checks pass.

- [ ] **Step 3: Confirm the diff contains no forbidden namespace or broad selector**

```bash
git diff --check
rg -n "codedrobe|html\\.codextheme-codex-skin (button|a):hover|html\\.codextheme-codex-skin svg" \
  apps/site/app/lib/private-skin-interactions.mjs \
  apps/site/app/lib/private-skin-package.mjs \
  apps/site/app/components/CodexMockup.tsx \
  apps/site/app/globals.css
```

Expected: `git diff --check` is silent. The namespace/selector search returns no matches.

### Task 5: Verify the Generated Skin in Real Codex

**Files:**
- Create: `scripts/qa-private-skin-app-chrome.mjs`
- Create: `docs/qa/2026-07-24-private-skin-app-chrome.md`

- [ ] **Step 1: Create the deterministic real-app audit**

Create `scripts/qa-private-skin-app-chrome.mjs`:

```js
import { Buffer } from "node:buffer";
import { buildPrivateSkinPackage } from "../apps/site/app/lib/private-skin-package.mjs";
import { PRIVATE_SKIN_INTERACTION_FAMILIES } from "../apps/site/app/lib/private-skin-interactions.mjs";
import {
  CdpSession,
  applyTheme,
  getAdapter,
  listCdpTargets,
  resolveThemeTarget,
} from "@codextheme/runtime";

const adapter = getAdapter("codex");
const port = 9335;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const profile = {
  primary: "#3e372f",
  secondary: "#8d6a45",
  highlight: "#948475",
  luminance: 38,
  saturation: 12,
  contrast: 24,
  complexity: 18,
};
const bundle = JSON.parse(buildPrivateSkinPackage({
  id: "mqa20260724.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  exportedAt: "2026-07-24T00:00:00.000Z",
  image: png,
  settings: {
    recipe: "cinematic",
    visibility: 92,
    overlay: 28,
    blur: 0,
    zoom: 108,
    positionX: 50,
    positionY: 50,
  },
  profile,
}));
const targetTheme = resolveThemeTarget(bundle, adapter.id);
const applied = await applyTheme({ adapter, targetTheme, port, timeoutMs: 12000 });
if (!applied.every((entry) => entry.result?.pass === true)) {
  throw new Error("The deterministic private package did not pass runtime verification.");
}

const [target] = (await listCdpTargets(port, 2500)).filter((entry) => adapter.matchTarget(entry));
if (!target) throw new Error("No Codex renderer target is available.");
const session = await new CdpSession(target, 12000).open();
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function cssString(value) {
  return JSON.stringify(value);
}

try {
  const rootState = await session.evaluate(`(() => {
    const root = document.documentElement;
    return {
      active: root.classList.contains("codextheme-codex-skin"),
      accent: getComputedStyle(root).getPropertyValue("--codextheme-accent").trim(),
      view: document.querySelector(".dream-home") ? "home" : "session",
      width: innerWidth,
    };
  })()`);
  const rows = [];
  for (const family of PRIVATE_SKIN_INTERACTION_FAMILIES) {
    for (const selector of family.roots) {
      const controls = await session.evaluate(`(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width >= 12 && rect.height >= 12
            && style.display !== "none" && style.visibility !== "hidden"
            && rect.bottom > 0 && rect.right > 0
            && rect.top < innerHeight && rect.left < innerWidth;
        };
        return [...document.querySelectorAll(${cssString(selector)})]
          .filter(visible)
          .filter((element) => !element.matches(":disabled, [aria-disabled=\\"true\\"]"))
          .filter((element) => !element.matches("[aria-current=\\"page\\"], [aria-selected=\\"true\\"], [data-state=\\"active\\"]"))
          .filter((element) => !element.querySelector("[aria-current=\\"page\\"], [aria-selected=\\"true\\"], [data-state=\\"active\\"]"))
          .slice(0, 8)
          .map((element, index) => {
            const id = ${cssString(family.id)} + "-" + index + "-" + Math.random().toString(36).slice(2);
            element.dataset.codexthemeQaId = id;
            const rect = element.getBoundingClientRect();
            return {
              id,
              text: (element.getAttribute("aria-label") || element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
              x: Math.max(1, Math.min(innerWidth - 2, rect.left + rect.width / 2)),
              y: Math.max(1, Math.min(innerHeight - 2, rect.top + rect.height / 2)),
            };
          });
      })()`);
      for (const control of controls) {
        const styleExpression = `(() => {
          const element = document.querySelector('[data-codextheme-qa-id=${cssString(control.id)}]');
          if (!element) return null;
          const root = getComputedStyle(element);
          const before = getComputedStyle(element, "::before");
          return {
            color: root.color,
            background: root.backgroundColor,
            shadow: root.boxShadow,
            beforeBackground: before.backgroundColor,
            beforeShadow: before.boxShadow,
          };
        })()`;
        const idle = await session.evaluate(styleExpression);
        await session.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: control.x,
          y: control.y,
        });
        await sleep(180);
        const hover = await session.evaluate(styleExpression);
        const ownerChanged = family.paintTarget === "before"
          ? idle?.beforeBackground !== hover?.beforeBackground || idle?.beforeShadow !== hover?.beforeShadow
          : idle?.background !== hover?.background || idle?.shadow !== hover?.shadow;
        rows.push({
          family: family.id,
          selector,
          text: control.text,
          owner: family.paintTarget,
          ownerChanged,
          colorChanged: idle?.color !== hover?.color,
          idle,
          hover,
        });
      }
    }
  }
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
  await session.evaluate(`document.querySelectorAll("[data-codextheme-qa-id]")
    .forEach((element) => delete element.dataset.codexthemeQaId)`);
  console.log(JSON.stringify({ rootState, rows }, null, 2));
  if (!rootState.active || rows.some((row) => !row.ownerChanged || !row.colorChanged)) process.exitCode = 1;
} finally {
  session.close();
}
```

- [ ] **Step 2: Run the real-app audit on Home and Session**

Open Codex Home and run:

```bash
node scripts/qa-private-skin-app-chrome.mjs
```

Open a populated Session with the right summary panel visible, open one non-destructive menu, and run the same command again.

Expected: both runs exit `0`; the active root is `html.codextheme-codex-skin`; `--codextheme-accent` is the corrected low-chroma fixture accent; every reported row has `ownerChanged: true` and `colorChanged: true`. Application occurs through the repository runtime on loopback port `9335`, without an installed third-party theme skill or a CodeDrobe namespace.

- [ ] **Step 3: Inspect exclusions and persistent states**

For each view, use the audit output and direct keyboard/pointer inspection to record:

```text
family | control | idle | hover | focus/open/selected | result
```

The required families are:

```text
sidebar-chrome
header-chrome
summary-chrome
menu-chrome
home-chrome
composer-secondary
```

Expected:

- every verified family uses the theme material;
- summary rows no longer expose native gray `::before` hover;
- icon and label colors match `--codextheme-accent`;
- Send, disabled controls, status rows, conversation links, code, diffs, and files remain outside the material;
- selected project/session material remains stable while hovered;
- no row and nested action paint two row-sized surfaces.

- [ ] **Step 4: Repeat at a narrow window width**

Resize Codex below its desktop layout breakpoint and repeat the six-family matrix.

Expected: no clipped glow, horizontal overflow, exposed hover-only row actions, icon/text overlap, or geometry movement.

- [ ] **Step 5: Record the QA evidence**

Create `docs/qa/2026-07-24-private-skin-app-chrome.md` with:

```markdown
# Private Skin App-Chrome QA — 2026-07-24

## Build

- Branch: `codex/private-skin-icon-hover`
- Package source: repository-local private skin builder
- Codex root namespace: `codextheme-codex-skin`

## Matrix

| View | Width | Family | Idle | Hover/focus/open | Selected/primary exclusion | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Home | Desktop | sidebar-chrome | Native | Theme material | Selected retained | Pass |
| Home | Desktop | header-chrome | Native | Theme material | Primary unchanged | Pass |
| Home | Desktop | home-chrome | Native | Theme material | Send unchanged | Pass |
| Session | Desktop | sidebar-chrome | Native | Theme material | Selected retained | Pass |
| Session | Desktop | header-chrome | Native | Theme material | Primary unchanged | Pass |
| Session | Desktop | summary-chrome | Native | Theme material; no gray pseudo-layer | Status unchanged | Pass |
| Session | Desktop | menu-chrome | Native | Theme material | Danger unchanged | Pass |
| Session | Desktop | composer-secondary | Native | Theme material | Send unchanged | Pass |
| Home/Session | Narrow | all applicable | Native | Theme material | Exclusions unchanged | Pass |

## Regression Checks

- No double row material.
- No geometry movement or clipping.
- No content, file, diff, code, status, disabled, danger, or Send bleed.
- Browser preview and generated package share the corrected accent and material alphas.
```

Replace any `Pass` with the observed result. Do not mark the task complete until all rows pass.

- [ ] **Step 6: Commit the audit and verified QA evidence**

```bash
git add scripts/qa-private-skin-app-chrome.mjs docs/qa/2026-07-24-private-skin-app-chrome.md
git commit -m "test(site): verify private skin app chrome interactions"
```
