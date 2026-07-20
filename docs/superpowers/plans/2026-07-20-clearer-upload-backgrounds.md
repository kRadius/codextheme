# Clearer Upload Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all three automatic custom-skin recipes preserve clear, recognizable uploaded artwork while retaining readable Codex surfaces.

**Architecture:** Keep the existing closed recipe system and change only the artwork defaults in `BASES`. `deriveRecipeDefaults` remains the single source used by upload, recipe switching, and reset; those settings drive both the live preview and the private package request. Tests lock the new values and brightness correction behavior.

**Tech Stack:** Next.js 16, React 19, Node.js test runner, JavaScript modules

---

### Task 1: Lock the clearer automatic recipe defaults

**Files:**
- Modify: `apps/site/tests/private-skin-profile.test.mjs:197-257`

- [ ] **Step 1: Update the recipe-default assertions before production code**

Replace the three expected recipe rows with:

```js
{ recipe: "cinematic", visibility: 92, overlay: 28, blur: 0, zoom: 108, positionX: 35, positionY: 65 },
{ recipe: "glass", visibility: 90, overlay: 30, blur: 0, zoom: 110, positionX: 35, positionY: 65 },
{ recipe: "focus", visibility: 78, overlay: 44, blur: 1, zoom: 112, positionX: 35, positionY: 65 },
```

Update the neutral Glass expectation to `visibility: 90`, `overlay: 30`, and `blur: 0`. Update the bright-upload assertion from `58` to `44`, proving the existing maximum `+14` brightness correction remains bounded.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: FAIL in `recipes produce distinct complete surface systems` because production defaults still return `84/38/0`, `76/44/1`, and `48/60/6`.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add apps/site/tests/private-skin-profile.test.mjs
git commit -m "test(site): require clearer upload recipe defaults"
```

### Task 2: Implement the clearer recipe defaults

**Files:**
- Modify: `apps/site/app/lib/private-skin-profile.mjs:7-62`

- [ ] **Step 1: Change only the artwork treatment in each recipe base**

Set the following fields and leave the surface, icon, saturation, contrast, radius, and shadow tokens unchanged:

```js
cinematic: {
  visibility: 92,
  overlay: 28,
  blur: 0,
}

glass: {
  visibility: 90,
  overlay: 30,
  blur: 0,
}

focus: {
  visibility: 78,
  overlay: 44,
  blur: 1,
}
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
node --test apps/site/tests/private-skin-profile.test.mjs
```

Expected: all profile tests PASS, including neutral and bright-upload correction cases.

- [ ] **Step 3: Run the complete site test suite**

Run outside restricted loopback sandboxing:

```bash
npm test -w @codextheme/site
```

Expected: Next.js build succeeds and all site tests PASS.

- [ ] **Step 4: Commit the implementation**

```bash
git add apps/site/app/lib/private-skin-profile.mjs
git commit -m "feat(site): reveal uploaded artwork by default"
```

### Task 3: Verify the live preview and branch integrity

**Files:**
- Verify: `apps/site/app/components/CustomSkinStudio.tsx`
- Verify: `apps/site/app/components/CodexMockup.tsx`
- Verify: `apps/site/app/lib/private-skin-package.mjs`

- [ ] **Step 1: Run the repository verification**

Run:

```bash
npm run check
```

Expected: typechecking, all tests, theme packaging, site build, package checks, and product-namespace checks PASS.

- [ ] **Step 2: Reload the existing local studio**

Open `http://127.0.0.1:3000/#create`, upload a portrait or character image, and confirm all three recipe previews show a sharp subject. Switching recipes and resetting automatic settings must show the values from the design table.

- [ ] **Step 3: Confirm the working tree is clean**

Run:

```bash
git status --short
```

Expected: no output.

### Task 4: Remove full-window backdrop blur

**Files:**
- Modify: `apps/site/tests/private-skin-profile.test.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`
- Modify: `apps/site/app/lib/private-skin-profile.mjs`

- [ ] **Step 1: Change the profile test to require `mainBlur: 0` for Cinematic, Glass, and Focus**

Run `node --test apps/site/tests/private-skin-profile.test.mjs` and expect the surface-system assertion to fail with the current `8`, `14`, and `6` values.

- [ ] **Step 2: Set only each recipe's `mainBlur` token to `0`**

Keep sidebar, header, composer, card, alpha, overlay, and image tokens unchanged.

- [ ] **Step 3: Update the generated-package expectations and run the site suite**

Change the three `mainBlur` expectations in `apps/site/tests/private-skin-schema.test.mjs` to `0`, then run `npm test -w @codextheme/site` and expect all 70 tests to pass.

- [ ] **Step 4: Run `npm run check` and verify the uploaded image locally**

The current upload must render with `filter: blur(0px)` on the artwork and `backdrop-filter: blur(0px)` on the full main content surface.
