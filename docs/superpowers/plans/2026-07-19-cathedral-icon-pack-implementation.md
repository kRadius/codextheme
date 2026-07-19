# Cathedral Nocturne Icon Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 11 installable Cathedral Glyphs in Cathedral Nocturne, using the same assets in the packaged Codex theme and website previews with native-icon fallback.

**Architecture:** Eleven repository-owned SVG masters are deterministically rendered to transparent 96×96 PNGs and embedded as named theme images. Cathedral-scoped CSS paints those images into existing native SVG boxes and hides only the matched SVG drawing children; selector misses therefore leave native Codex icons untouched. A closed selector contract, package contract, and preview helper keep the real theme, validation, and marketing screenshots aligned.

**Tech Stack:** Node.js 24 ESM, `node:test`, Sharp, CSS, SVG/PNG assets, `@codextheme/runtime`, Next.js static preview assets, `@codextheme/cli`.

---

## File map

- Create `themes/cathedral-nocturne/icons-src/*.svg`: 11 editable illuminated-manuscript masters.
- Create `themes/cathedral-nocturne/assets/icons/*.png`: deterministic generated install/preview assets.
- Create `themes/scripts/generate-cathedral-icons.mjs`: validate and render masters.
- Create `themes/scripts/cathedral-icon-contract.mjs`: one closed icon-id/selector/match-count contract.
- Create `themes/scripts/cathedral-preview-icons.mjs`: load shared PNGs and render preview `<image>` markup.
- Create `themes/scripts/probe-cathedral-icons.mjs`: read-only live selector count gate using the local CodexTheme runtime.
- Create `themes/fixtures/cathedral-icon-selectors.json`: sanitized Home/Session compatibility evidence.
- Create `themes/tests/cathedral-icons.test.mjs`: source, raster, manifest, CSS, and package tests.
- Create `themes/tests/cathedral-icon-contract.test.mjs`: selector classification and CSS ownership tests.
- Modify `themes/cathedral-nocturne/theme.json`: version, named icon images, recommended verification nodes.
- Modify `themes/shared/codex.css`: Cathedral-only safe icon replacement rules.
- Modify `themes/scripts/pack.mjs`: per-theme image contracts.
- Modify `themes/scripts/generate-previews.mjs`: use the shared Cathedral PNGs.
- Modify `themes/tests/generate-previews.test.mjs`: preview parity and determinism.
- Modify `package.json`: run the icon raster step before packing.
- Modify `themes/catalog.json`: cache-busted previews and pinned `0.2.4` install command.
- Modify `packages/cli/package.json`, `packages/cli/src/main.mjs`, and `package-lock.json`: patch release metadata.
- Regenerate `packages/cli/themes/cathedral-nocturne.codextheme-theme` and Cathedral preview PNGs.

### Task 1: Deterministic Cathedral Glyph assets

**Files:**
- Create: `themes/tests/cathedral-icons.test.mjs`
- Create: `themes/scripts/generate-cathedral-icons.mjs`
- Create: `themes/cathedral-nocturne/icons-src/icon-new-chat.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-pull-requests.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-scheduled.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-plugins.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-project-folder.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-explore.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-build.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-review.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-fix.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-add.svg`
- Create: `themes/cathedral-nocturne/icons-src/icon-send.svg`
- Create: `themes/cathedral-nocturne/assets/icons/*.png`

- [ ] **Step 1: Write the failing asset-generation test**

The test defines the closed ids locally, runs the desired generator into a temporary directory, and asserts 11 transparent 96×96 PNGs plus safe 24-unit SVG masters:

```js
const ICON_IDS = [
  "icon-new-chat", "icon-pull-requests", "icon-scheduled", "icon-plugins",
  "icon-project-folder", "icon-explore", "icon-build", "icon-review",
  "icon-fix", "icon-add", "icon-send",
];

await assert.doesNotReject(execFileAsync(process.execPath, [
  "themes/scripts/generate-cathedral-icons.mjs",
], {
  cwd: repoRoot,
  env: { ...process.env, CODEXTHEME_ICON_OUTPUT_ROOT: outputRoot },
}));

for (const id of ICON_IDS) {
  const metadata = await sharp(path.join(outputRoot, `${id}.png`)).metadata();
  assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [96, 96, true]);
  const source = await readFile(path.join(themeRoot, "cathedral-nocturne", "icons-src", `${id}.svg`), "utf8");
  assert.match(source, /viewBox="0 0 24 24"/);
  assert.doesNotMatch(source, /https?:|<script|@import|url\(/i);
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test themes/tests/cathedral-icons.test.mjs`

Expected: FAIL because `themes/scripts/generate-cathedral-icons.mjs` and the 11 masters do not exist.

- [ ] **Step 3: Add the generator**

Implement a side-effect-free export plus CLI guard:

```js
export const CATHEDRAL_ICON_IDS = Object.freeze([
  "icon-new-chat", "icon-pull-requests", "icon-scheduled", "icon-plugins",
  "icon-project-folder", "icon-explore", "icon-build", "icon-review",
  "icon-fix", "icon-add", "icon-send",
]);

export async function generateCathedralIcons({ sourceRoot, outputRoot }) {
  await fs.mkdir(outputRoot, { recursive: true });
  for (const id of CATHEDRAL_ICON_IDS) {
    const source = await fs.readFile(path.join(sourceRoot, `${id}.svg`), "utf8");
    if (!/viewBox="0 0 24 24"/.test(source) || /https?:|<script|@import|url\(/i.test(source)) {
      throw new Error(`${id} is not a safe 24-unit local SVG master.`);
    }
    await sharp(Buffer.from(source)).resize(96, 96).png({ compressionLevel: 9 }).toFile(path.join(outputRoot, `${id}.png`));
  }
}
```

Default roots are `themes/cathedral-nocturne/icons-src` and `themes/cathedral-nocturne/assets/icons`; `CODEXTHEME_ICON_OUTPUT_ROOT` overrides only generated output for tests.

- [ ] **Step 4: Add all 11 master glyphs**

Every source uses `viewBox="0 0 24 24"`, round caps/joins, and the Cathedral palette. Navigation glyphs use `#D3B163`; Home medallions use a restrained `#3A2C15` field with `#D9B765` strokes; Send uses the dark `#17110A` arrow intended for Codex's existing gold submit circle.

Use these exact semantic constructions:

```xml
<!-- icon-new-chat.svg -->
<path d="M4.5 5.5c2.7-.9 5-.5 7.5 1.2 2.5-1.7 4.8-2.1 7.5-1.2v12c-2.7-.8-5-.4-7.5 1.2-2.5-1.6-4.8-2-7.5-1.2zM12 6.7v12M17 2.8v4.4M14.8 5h4.4"/>
<!-- icon-pull-requests.svg -->
<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M8 7.5c5 0 5 4.5 8 4.5h2M15.5 5.5 18 8l-2.5 2.5"/>
<!-- icon-scheduled.svg -->
<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5v5.7l3.7 2.1M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2"/><circle cx="12" cy="12" r="1.2" fill="#E8CB82" stroke="none"/>
<!-- icon-plugins.svg -->
<path d="M12 4.2c1.2-2 4.3-1.2 4.1 1.2-.1 1.1.8 2 1.9 1.9 2.4-.2 3.2 2.9 1.2 4.1-1 .6-1 2 0 2.6 2 1.2 1.2 4.3-1.2 4.1-1.1-.1-2 .8-1.9 1.9.2 2.4-2.9 3.2-4.1 1.2-.6-1-2-1-2.6 0-1.2 2-4.3 1.2-4.1-1.2.1-1.1-.8-2-1.9-1.9-2.4.2-3.2-2.9-1.2-4.1 1-.6 1-2 0-2.6-2-1.2-1.2-4.3 1.2-4.1 1.1.1 2-.8 1.9-1.9-.2-2.4 2.9-3.2 4.1-1.2.6 1 2 1 2.6 0z"/><path d="M10 9v3h4V9M12 12v4"/>
<!-- icon-project-folder.svg -->
<path d="M3.5 7.5h6l2-2h9v12.8H3.5zM6.5 17.8v-5.3c0-3 2.4-5.5 5.5-5.5s5.5 2.5 5.5 5.5v5.3M9 17.8v-5.3a3 3 0 0 1 6 0v5.3"/>
<!-- icon-explore.svg -->
<circle cx="12" cy="12" r="10" fill="#3A2C15"/><circle cx="12" cy="12" r="6.5"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z"/><circle cx="12" cy="12" r="1" fill="#F2D794" stroke="none"/>
<!-- icon-build.svg -->
<circle cx="12" cy="12" r="10" fill="#3A2C15"/><path d="m7 17 8.8-8.8M9.2 6.2l2.6 2.6-2 2-2.6-2.6zM13 15l3 3M14.6 13.4l3 3M6.2 15.8l2 2"/>
<!-- icon-review.svg -->
<circle cx="12" cy="12" r="10" fill="#3A2C15"/><path d="M5.5 11.5s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4z"/><circle cx="12" cy="11.5" r="2"/><path d="m9 17.4 1.8 1.6 3.6-3.5"/>
<!-- icon-fix.svg -->
<circle cx="12" cy="12" r="10" fill="#3A2C15"/><path d="m7 17 4-4M13 11l4-4M14.5 5.5l4 4M6.5 14.5l3 3M7.5 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>
<!-- icon-add.svg -->
<path d="M12 3.5c1.2 2.2 3.2 3.2 5.5 2.8-.4 2.3.6 4.3 2.8 5.7-2.2 1.2-3.2 3.2-2.8 5.5-2.3-.4-4.3.6-5.5 2.8-1.2-2.2-3.2-3.2-5.5-2.8.4-2.3-.6-4.3-2.8-5.5 2.2-1.4 3.2-3.4 2.8-5.7 2.3.4 4.3-.6 5.5-2.8zM12 8v8M8 12h8"/>
<!-- icon-send.svg -->
<path d="M12 19V6M7.2 10.8 12 6l4.8 4.8" stroke="#17110A" stroke-width="2.2"/>
```

- [ ] **Step 5: Generate raster assets and verify GREEN**

Run: `node themes/scripts/generate-cathedral-icons.mjs`

Run: `node --test themes/tests/cathedral-icons.test.mjs`

Expected: PASS with 11 safe SVG masters and 11 transparent 96×96 PNGs.

- [ ] **Step 6: Commit**

```bash
git add themes/cathedral-nocturne/icons-src themes/cathedral-nocturne/assets/icons themes/scripts/generate-cathedral-icons.mjs themes/tests/cathedral-icons.test.mjs
git commit -m "feat: add cathedral glyph assets"
```

### Task 2: Theme image and package contracts

**Files:**
- Modify: `themes/tests/cathedral-icons.test.mjs`
- Modify: `themes/cathedral-nocturne/theme.json`
- Modify: `themes/scripts/pack.mjs`
- Modify: `package.json`
- Modify: `packages/cli/themes/cathedral-nocturne.codextheme-theme`

- [ ] **Step 1: Add failing manifest/package assertions**

Build Cathedral directly with `buildThemePackage()` and assert the sorted image ids are exactly `hero`, the 11 exported icon ids, and `session-bg`; assert other available themes remain exactly `hero,session-bg`. Also assert Cathedral version is `1.1.0` and the final serialized package stays below 30 MB.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test themes/tests/cathedral-icons.test.mjs`

Expected: FAIL because Cathedral's manifest still declares only two images and version `1.0.0`.

- [ ] **Step 3: Add all named icon images to Cathedral**

Add the exact mapping:

```json
"icon-new-chat": "assets/icons/icon-new-chat.png",
"icon-pull-requests": "assets/icons/icon-pull-requests.png",
"icon-scheduled": "assets/icons/icon-scheduled.png",
"icon-plugins": "assets/icons/icon-plugins.png",
"icon-project-folder": "assets/icons/icon-project-folder.png",
"icon-explore": "assets/icons/icon-explore.png",
"icon-build": "assets/icons/icon-build.png",
"icon-review": "assets/icons/icon-review.png",
"icon-fix": "assets/icons/icon-fix.png",
"icon-add": "assets/icons/icon-add.png",
"icon-send": "assets/icons/icon-send.png"
```

Set the theme version to `1.1.0`.

- [ ] **Step 4: Watch packing fail under the old equality check**

Run: `node themes/scripts/pack.mjs`

Expected: FAIL with `cathedral-nocturne must embed exactly hero and session-bg images.`

- [ ] **Step 5: Implement the per-theme packer contract**

Import `CATHEDRAL_ICON_IDS`; define base ids `hero,session-bg`; for Cathedral append all 11 ids, and compare sorted actual ids against sorted expected ids. Preserve the two-image contract for every non-pilot theme. Update `themes:build` so `generate-cathedral-icons.mjs` runs before packing.

- [ ] **Step 6: Rebuild and verify GREEN**

Run: `npm run themes:build`

Run: `node --test themes/tests/cathedral-icons.test.mjs`

Expected: pack succeeds; Cathedral contains 13 local named images; all other available bundles contain two.

- [ ] **Step 7: Commit**

```bash
git add package.json themes/cathedral-nocturne/theme.json themes/scripts/pack.mjs themes/tests/cathedral-icons.test.mjs packages/cli/themes/cathedral-nocturne.codextheme-theme
git commit -m "feat: package cathedral icon images"
```

### Task 3: Closed selector contract and safe CSS replacement

**Files:**
- Create: `themes/scripts/cathedral-icon-contract.mjs`
- Create: `themes/scripts/probe-cathedral-icons.mjs`
- Create: `themes/fixtures/cathedral-icon-selectors.json`
- Create: `themes/tests/cathedral-icon-contract.test.mjs`
- Modify: `themes/shared/codex.css`
- Modify: `themes/cathedral-nocturne/theme.json`

- [ ] **Step 1: Write failing selector and CSS tests**

The contract contains these exact selectors:

```js
const sidebarPrefix = 'aside.app-shell-left-panel [role="navigation"] .vertical-scroll-fade-mask > div:first-child > div > div > div';

export const CATHEDRAL_ICON_ANCHORS = Object.freeze([
  { id: "icon-new-chat", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(1) svg`, expected: 1 },
  { id: "icon-pull-requests", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(2) svg`, expected: 1 },
  { id: "icon-scheduled", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(3) svg`, expected: 1 },
  { id: "icon-plugins", contexts: ["home", "session"], selector: `${sidebarPrefix} > button:nth-child(4) svg`, expected: 1 },
  { id: "icon-project-folder", contexts: ["home", "session"], selector: "aside.app-shell-left-panel .group\\/folder-row > div:first-child > span:first-child > svg", expected: 1 },
  { id: "icon-explore", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(1) svg", expected: 1 },
  { id: "icon-build", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(2) svg", expected: 1 },
  { id: "icon-review", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(3) svg", expected: 1 },
  { id: "icon-fix", contexts: ["home"], selector: ".dream-home .group\\/home-suggestions button:nth-child(4) svg", expected: 1 },
  { id: "icon-add", contexts: ["home", "session"], selector: ".composer-surface-chrome .col-start-1 button:first-child > svg", expected: 1 },
  { id: "icon-send", contexts: ["home", "session"], selector: ".composer-surface-chrome button.size-token-button-composer > svg", expected: 1 },
]);
```

Tests assert ids are unique; selectors contain no localized copy, runtime ids, remote resources, or unscoped body selectors; count classification returns `warning` below expected and `error` above expected; every CSS mapping uses its matching packaged image variable and a sibling `svg > * { opacity: 0 !important; }` rule.

- [ ] **Step 2: Run and verify RED**

Run: `node --test themes/tests/cathedral-icon-contract.test.mjs`

Expected: FAIL because the contract module and Cathedral CSS rules do not exist.

- [ ] **Step 3: Implement the contract and sanitized fixture**

Export the exact anchor list plus:

```js
export function classifyCathedralIconCounts(context, observed) {
  return CATHEDRAL_ICON_ANCHORS
    .filter((anchor) => anchor.contexts.includes(context))
    .map((anchor) => {
      const count = observed[anchor.id] ?? 0;
      return {
        id: anchor.id,
        expected: anchor.expected,
        count,
        status: count > anchor.expected ? "error" : count < anchor.expected ? "warning" : "pass",
      };
    });
}
```

The JSON fixture records schema version 1, capture date `2026-07-19`, the exact selectors, and Home/Session expected counts only; it contains no text, input values, URLs, project names, task names, or active private theme ids.

- [ ] **Step 4: Add Cathedral-scoped CSS replacement**

For every anchor, prefix the selector with:

```css
html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]
```

The native SVG rule contains only:

```css
background-image: var(--codedrobe-image-<matching-id>);
background-position: center;
background-repeat: no-repeat;
background-size: contain;
```

The paired child rule contains only `opacity: 0 !important`. Do not change width, height, display, padding, pointer events, labels, wrappers, or button layout.

- [ ] **Step 5: Add recommended verification nodes**

Add one named recommended check per anchor. Put Home-only action-card checks in a `home` context whose `when.any` is `[".dream-home"]`; keep sidebar, folder, and composer checks at target level so Session remains covered. These checks warn on selector drift without making the entire background theme unusable.

- [ ] **Step 6: Implement the read-only live count probe**

`probe-cathedral-icons.mjs` uses `getAdapter("codex")`, `findTargets()`, and `CdpSession.evaluate()` from `@codextheme/runtime` to evaluate only `document.querySelectorAll(selector).length`. It prints the classifier JSON and exits 1 only for over-match errors; selector misses remain warnings. It never reads text, attributes, links, form values, or HTML.

- [ ] **Step 7: Verify GREEN**

Run: `node --test themes/tests/cathedral-icon-contract.test.mjs`

Run while Codex is on Session: `node themes/scripts/probe-cathedral-icons.mjs session`

Run while Codex is on Home: `node themes/scripts/probe-cathedral-icons.mjs home`

Expected: tests pass; live probe reports no `error`; every available intended control reports `pass`, while temporarily absent optional controls report only named `warning`.

- [ ] **Step 8: Commit**

```bash
git add themes/scripts/cathedral-icon-contract.mjs themes/scripts/probe-cathedral-icons.mjs themes/fixtures/cathedral-icon-selectors.json themes/tests/cathedral-icon-contract.test.mjs themes/shared/codex.css themes/cathedral-nocturne/theme.json
git commit -m "feat: replace cathedral native icons safely"
```

### Task 4: Preview parity from shared icon assets

**Files:**
- Create: `themes/scripts/cathedral-preview-icons.mjs`
- Modify: `themes/scripts/generate-previews.mjs`
- Modify: `themes/tests/generate-previews.test.mjs`
- Modify: `themes/catalog.json`
- Create: `apps/site/public/themes/cathedral-nocturne/previews/home-v013.png`
- Create: `apps/site/public/themes/cathedral-nocturne/previews/session-v013.png`

- [ ] **Step 1: Write failing parity tests**

Add a test that dynamically imports `cathedral-preview-icons.mjs`, loads Cathedral's manifest, and asserts all 11 ids resolve to `data:image/png;base64,...`. Generate previews twice into separate temporary roots and assert Cathedral Home and Session buffers are byte-identical.

- [ ] **Step 2: Run and verify RED**

Run: `node --test themes/tests/generate-previews.test.mjs`

Expected: FAIL because the shared preview-icon helper does not exist.

- [ ] **Step 3: Implement the preview icon loader**

```js
export async function loadCathedralPreviewIcons({ themeRoot, slug, manifest }) {
  if (slug !== "cathedral-nocturne") return Object.freeze({});
  return Object.fromEntries(await Promise.all(CATHEDRAL_ICON_IDS.map(async (id) => {
    const image = await fs.readFile(path.join(themeRoot, slug, manifest.images[id]));
    return [id, `data:image/png;base64,${image.toString("base64")}`];
  })));
}

export function previewIconImage(iconData, id, { x, y, size }) {
  const href = iconData[id];
  return href ? `<image href="${href}" x="${x}" y="${y}" width="${size}" height="${size}"/>` : "";
}
```

- [ ] **Step 4: Replace only Cathedral's generic preview glyphs**

Pass the loaded map into `chrome()`, `homeBody()`, and `sessionBody()`. Use shared PNGs for the four sidebar icons, folder, four Home action cards, Add, and Send. Preserve generic preview glyphs for every non-pilot theme.

- [ ] **Step 5: Cache-bust and generate previews**

Change Cathedral preview paths from `home-v012.png`/`session-v012.png` to `home-v013.png`/`session-v013.png`; set `updatedAt` to `2026-07-19`.

Run: `npm run previews:build`

- [ ] **Step 6: Verify GREEN**

Run: `node --test themes/tests/generate-previews.test.mjs`

Expected: PASS; both Cathedral previews are 1600×1000, deterministic, and sourced from all 11 installable PNG assets.

- [ ] **Step 7: Commit**

```bash
git add themes/scripts/cathedral-preview-icons.mjs themes/scripts/generate-previews.mjs themes/tests/generate-previews.test.mjs themes/catalog.json apps/site/public/themes/cathedral-nocturne/previews/home-v013.png apps/site/public/themes/cathedral-nocturne/previews/session-v013.png
git commit -m "feat: show cathedral glyphs in previews"
```

### Task 5: Pin the CodexTheme CLI patch release

**Files:**
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/main.mjs`
- Modify: `themes/catalog.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Change version expectations first**

Update CLI tests to expect `0.2.4` for `--version`, platform errors, reapply, and restore commands. Add a catalog assertion that every available website command is pinned to `@codextheme/cli@0.2.4`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test packages/cli/tests/main.test.mjs`

Expected: FAIL because production constants and package metadata still report `0.2.3`.

- [ ] **Step 3: Update release metadata**

Set `packages/cli/package.json` and `packages/cli/src/main.mjs` to `0.2.4`; update pinned reapply/restore strings and all available catalog commands. Run `npm install --package-lock-only` to update workspace lock metadata without changing dependency ranges.

- [ ] **Step 4: Verify GREEN**

Run: `node --test packages/cli/tests/main.test.mjs`

Run: `npm run themes:build`

Expected: CLI tests pass and the rebuilt Cathedral package contains theme `1.1.0` plus all 13 named images.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/tests/main.test.mjs packages/cli/package.json packages/cli/src/main.mjs themes/catalog.json package-lock.json packages/cli/themes/cathedral-nocturne.codextheme-theme
git commit -m "chore: prepare cli 0.2.4"
```

### Task 6: Full verification and real Codex smoke test

**Files:**
- Modify only files required by defects reproduced during this task; each defect receives a failing regression test first.

- [ ] **Step 1: Run repository verification**

Run with loopback permission: `npm run check`

Expected: type checks, all tests, theme build, website production build, and package checks pass with zero failures.

- [ ] **Step 2: Inspect the final package through our runtime**

Run a local Node inspection using `readThemePackage`, `lintThemePackage`, and `resolveThemeTarget`; assert theme `cathedral-nocturne@1.1.0`, 13 named images, no lint warnings, no external CSS resources, and package size under 30 MB.

- [ ] **Step 3: Apply through our CLI without authorizing a restart**

Run: `node packages/cli/src/bin.mjs apply cathedral-nocturne`

Expected: the local `@codextheme/cli` workflow applies and verifies the bundled Cathedral theme. Do not pass a restart flag and do not approve a restart prompt. If Codex requires host-setting restart, stop and report rather than closing it.

- [ ] **Step 4: Verify Session and Home visually**

On Session, run the Session selector probe and capture a screenshot. On Home, run the Home selector probe and capture a screenshot. Confirm shared backgrounds stay anchored, native control boxes retain their geometry, icons remain crisp, and selectors neither under-match intended visible controls nor over-match unrelated controls.

- [ ] **Step 5: Restore native appearance**

Run: `node packages/cli/src/bin.mjs restore`

Expected: theme id/styles/images disappear and native icons return.

- [ ] **Step 6: Review the branch**

Run: `git diff main...HEAD --check`

Run: `git status -sb`

Expected: no whitespace errors and a clean feature branch. Publishing to npm and production deployment remain separate explicit release actions after review.
