# Gothic Flagship Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three original, installable gothic Codex Desktop themes with real Home/Session captures, a screenshot-first website, and a public support email.

**Architecture:** Keep the existing static catalog and bundled CLI model. Add three independently packaged themes that share the protected Codex CSS layer, publish them in CLI 0.1.1, and make the public site read only the new launch catalog. Generate original environment art first, then admit a theme to the site only after packaging and real Codex capture succeed.

**Tech Stack:** Node.js 22, npm workspaces, `@codextheme/runtime`, Sharp, Next.js 15, React 19, Node test runner, CodeDrobe/CDP, Vercel.

---

## File map

- `themes/catalog.json`: the three public flagship records and pinned 0.1.1 commands.
- `themes/shared/codex.css`: shared safe UI styling; theme color values continue to come from each manifest.
- `themes/<slug>/theme.json`: one manifest per installable theme.
- `themes/<slug>/assets/{hero,session}.jpg`: theme background assets.
- `themes/ASSET_PROVENANCE.md`: creation and rights record for the six distributed images.
- `packages/cli/src/catalog.mjs`: CLI-visible new and legacy slugs.
- `packages/cli/src/main.mjs`: CLI 0.1.1 public version and pinned reapply/restore commands.
- `packages/cli/themes/*.codextheme-theme`: immutable bundled theme packages.
- `apps/site/public/themes/<slug>/previews/{home,session}.png`: real Codex captures.
- `apps/site/app/page.tsx`: screenshot-first flagship and three-theme gallery.
- `apps/site/app/components/ThemeCard.tsx`: real screenshot cards without coming-soon UI.
- `apps/site/app/components/SiteChrome.tsx`: global support email.
- `apps/site/app/help/page.tsx`, `apps/site/app/security/page.tsx`: support contact copy.
- `apps/site/app/globals.css`: flagship hero and revised three-card layout.
- `tests/catalog.test.mjs`, `packages/cli/tests/main.test.mjs`, `apps/site/tests/rendered-html.test.mjs`: release contracts.

### Task 1: Lock the new catalog and release contract

**Files:**
- Modify: `tests/catalog.test.mjs`
- Modify: `apps/site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Replace the nine-slot catalog expectation with the three flagship slugs**

Use this public order:

```js
const launchSlugs = [
  "cathedral-nocturne",
  "crimson-procession",
  "silver-reliquary",
];
```

Assert all three are `available`, have `previewHome` and `previewSession` equal to `themes/<slug>/previews/{home,session}.png`, and use:

```js
`npx --yes @codextheme/cli@0.1.1 apply ${theme.slug}`
```

Assert the CLI artifact directory contains the three legacy artifacts plus the three new artifacts so old 0.1.0 commands are not broken.

- [ ] **Step 2: Change the rendered HTML contract to screenshot-first content**

Set:

```js
const availableSlugs = [
  "cathedral-nocturne",
  "crimson-procession",
  "silver-reliquary",
];
```

Require the homepage to contain `Cathedral Nocturne`, `把 Codex 变成你的工作世界`, all three new slugs, and no `主题槽位`, `制作中`, `真实截图待补齐`, or legacy slugs. Require each detail page to contain exactly one copy command pinned to 0.1.1 and both real capture labels.

- [ ] **Step 3: Add the contact contract**

In the route test require `/`, `/help`, and `/security` to contain:

```html
mailto:codextheme@codextheme.tech
```

- [ ] **Step 4: Run the focused tests and verify failure**

Run:

```bash
node --test tests/catalog.test.mjs
npm run build -w @codextheme/site
node --test apps/site/tests/rendered-html.test.mjs
```

Expected: catalog and rendered HTML tests fail because the existing site still contains nine records, 0.1.0 commands, placeholders, and no support email.

- [ ] **Step 5: Commit the failing contracts**

```bash
git add tests/catalog.test.mjs apps/site/tests/rendered-html.test.mjs
git commit -m "test: define gothic flagship release contract"
```

### Task 2: Produce and record the original environment art

**Files:**
- Create: `themes/cathedral-nocturne/assets/hero.jpg`
- Create: `themes/cathedral-nocturne/assets/session.jpg`
- Create: `themes/crimson-procession/assets/hero.jpg`
- Create: `themes/crimson-procession/assets/session.jpg`
- Create: `themes/silver-reliquary/assets/hero.jpg`
- Create: `themes/silver-reliquary/assets/session.jpg`
- Create: `themes/ASSET_PROVENANCE.md`

- [ ] **Step 1: Generate Cathedral Nocturne candidates**

Use image generation with this art direction:

```text
Original cinematic gothic cathedral interior for a desktop workspace background, monumental vertical architecture, black obsidian stone, warm antique-gold window light, restrained deep-red textiles, solemn and luxurious, no people, no character, no logo, no text, no UI. Composition for a 16:10 desktop app: left 28 percent very dark and low-detail, center calm enough for readable cards and text, architectural focal detail and luminous windows on the right. Photoreal environment concept art, coherent geometry, subtle atmospheric smoke, long-hour usability, not purple cyberpunk.
```

Reject text-like masonry, malformed arches, recognizable IP, centered focal points, or bright left-side detail. Keep the best source and crop it to 3200×2000 for `hero.jpg`; crop a second 2400×1600 composition for `session.jpg`.

- [ ] **Step 2: Generate Crimson Procession candidates**

```text
Original cinematic gothic monastery cloister beneath a crimson moon, black stone arcades, restrained dark-red banners, wet floor reflections, dramatic but readable, no people, no ninja, no anime character, no eye symbol, no cloud emblem, no logo, no text, no UI. 16:10 desktop workspace composition with the left 28 percent dark and low-detail, quiet center for conversation text, moon and architectural focal point on the right. Premium environment concept art, coherent geometry, deep black and wine red, avoid oversaturated gaming dashboard aesthetics.
```

Apply the same rejection and crop rules.

- [ ] **Step 3: Generate Silver Reliquary candidates**

```text
Original moonlit gothic reliquary ruins for a focused desktop workspace, pale limestone, silver metal, cold blue-grey moonlight, thin fog, quiet sacred atmosphere, no people, no bones, no character, no logo, no text, no UI. 16:10 desktop app composition with the left 28 percent darker and low-detail, a calm center, elegant arches and moonlit focal detail on the right. Premium cinematic environment art, coherent architecture, restrained contrast, readable for long sessions, not purple cyberpunk.
```

Apply the same rejection and crop rules.

- [ ] **Step 4: Write the provenance record**

Create `themes/ASSET_PROVENANCE.md` with one row for each final file and these columns:

```markdown
| File | Creation method | Third-party input | Distribution decision |
| --- | --- | --- | --- |
| `cathedral-nocturne/assets/hero.jpg` | OpenAI image generation, 2026-07-18, project-owned prompt | None | Approved for public theme package |
```

Repeat explicitly for all six files. Record that no third-party artwork, character, logo, or downloaded wallpaper was used.

- [ ] **Step 5: Inspect all six final files**

Open each raster at original detail. Expected: correct safe zones, no text/watermarks/people, no visible generation defects, and visibly distinct scenes rather than palette swaps.

- [ ] **Step 6: Commit the approved theme art**

```bash
git add themes/cathedral-nocturne/assets themes/crimson-procession/assets themes/silver-reliquary/assets themes/ASSET_PROVENANCE.md
git commit -m "feat: add original gothic flagship artwork"
```

### Task 3: Define, package, and expose the themes in CLI 0.1.1

**Files:**
- Create: `themes/cathedral-nocturne/theme.json`
- Create: `themes/crimson-procession/theme.json`
- Create: `themes/silver-reliquary/theme.json`
- Modify: `themes/catalog.json`
- Modify: `themes/shared/codex.css`
- Modify: `packages/cli/src/catalog.mjs`
- Modify: `packages/cli/src/main.mjs`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `package-lock.json`
- Generate: `packages/cli/themes/*.codextheme-theme`

- [ ] **Step 1: Add CLI tests for the new and legacy slugs**

Require all six slugs in the CLI catalog, apply each new slug in the harness, and assert help/reapply/restore output pins 0.1.1. Keep a legacy apply assertion for `midnight-circuit`.

- [ ] **Step 2: Run the CLI test and verify failure**

Run:

```bash
node --test packages/cli/tests/main.test.mjs
```

Expected: FAIL because the new slugs are unknown and output is still 0.1.0.

- [ ] **Step 3: Create the three manifests**

Use `schemaVersion: 1`, version `1.0.0`, the shared `../shared/codex.css`, `rendererProfile: "codex-theme-v1"`, the existing recommended selectors, and exactly `hero` plus `session-bg` images. Use these base tokens:

```js
const themeTokens = {
  "cathedral-nocturne": { accent: "#c7a45a", ink: "#f3eee3", surface: "#15120e", diffAdded: "#79c79c", diffRemoved: "#df6b72", skill: "#d5b96f" },
  "crimson-procession": { accent: "#d34a55", ink: "#f4e9e9", surface: "#160c0e", diffAdded: "#75c99a", diffRemoved: "#ef5969", skill: "#e17a7f" },
  "silver-reliquary": { accent: "#9fb8c9", ink: "#eef3f5", surface: "#11171b", diffAdded: "#75caa7", diffRemoved: "#dd747b", skill: "#b8cbd7" },
};
```

Set `opaqueWindows: true`, `contrast: 74`, and use short English copy without invented lore paragraphs.

- [ ] **Step 4: Replace the public catalog with three complete records**

All records are `available`, `series` is `Gothic Worlds`, author is `CodexTheme Studio`, preview paths are non-null, and commands pin CLI 0.1.1. Remove six coming-soon records and three legacy records from the public catalog.

- [ ] **Step 5: Extend the CLI catalog while preserving legacy entries**

Keep the three existing entries and add:

```js
"cathedral-nocturne": Object.freeze({ slug: "cathedral-nocturne", name: "Cathedral Nocturne" }),
"crimson-procession": Object.freeze({ slug: "crimson-procession", name: "Crimson Procession" }),
"silver-reliquary": Object.freeze({ slug: "silver-reliquary", name: "Silver Reliquary" }),
```

- [ ] **Step 6: Bump only the publishable CLI to 0.1.1**

Set `packages/cli/package.json` version and `packages/cli/src/main.mjs` `VERSION`, `REAPPLY`, and `RESTORE` to 0.1.1. Refresh the lockfile with:

```bash
npm install --package-lock-only --ignore-scripts
```

- [ ] **Step 7: Tune the shared CSS for photographic gothic backgrounds**

Keep native-state protections. Reduce blanket main-surface opacity enough to reveal the environment, keep the sidebar more opaque, and use theme tokens for borders. The final values must preserve text readability in both Home and Session; do not add theme-specific slug selectors to the shared file.

- [ ] **Step 8: Pack and verify all public themes**

Run:

```bash
node themes/scripts/pack.mjs
node --test tests/catalog.test.mjs packages/cli/tests/main.test.mjs
```

Expected: six artifact files remain in the CLI directory; all bundles lint cleanly; the three new public records and CLI tests pass.

- [ ] **Step 9: Commit theme definitions and CLI release**

```bash
git add themes packages/cli package-lock.json tests/catalog.test.mjs
git commit -m "feat: bundle gothic themes in cli 0.1.1"
```

### Task 4: Apply each theme and create real Codex captures

**Files:**
- Create: `apps/site/public/themes/cathedral-nocturne/previews/home.png`
- Create: `apps/site/public/themes/cathedral-nocturne/previews/session.png`
- Create: `apps/site/public/themes/crimson-procession/previews/home.png`
- Create: `apps/site/public/themes/crimson-procession/previews/session.png`
- Create: `apps/site/public/themes/silver-reliquary/previews/home.png`
- Create: `apps/site/public/themes/silver-reliquary/previews/session.png`
- Modify: `docs/qa/2026-07-18-macos-smoke.md`

- [ ] **Step 1: Apply Cathedral Nocturne from our local npm workspace package**

Run the workspace entry for `@codextheme/cli@0.1.1`, using the same CLI, runtime, and bundled theme files that will ship to npm. Do not use the global/upstream `codedrobe` CLI as a substitute, and do not restart the Codex instance that hosts this task. Verify the renderer reports the required session and composer selectors.

- [ ] **Step 2: Inspect Home and Session behavior**

Check sidebar navigation, project picker, suggestion cards, conversation text, code blocks, tool output, composer, buttons, focus ring, and destructive states. Adjust shared tokens before capture if any text or native state is unclear.

- [ ] **Step 3: Capture sanitized Home and Session screenshots**

Use the same Codex window size for both captures. Ensure the visible project and conversation contain no personal name, local path, token, private message, or customer data. Save PNG files at the exact public paths above.

- [ ] **Step 4: Repeat apply, inspection, and capture for Crimson Procession**

Expected: scene and color treatment are visibly different from Cathedral Nocturne and all controls remain readable.

- [ ] **Step 5: Repeat apply, inspection, and capture for Silver Reliquary**

Expected: the cold light does not reduce text or focus contrast.

- [ ] **Step 6: Verify switch and restore behavior**

Switch among the three local themes, restart/reapply the active theme, then restore official appearance. Record pass/fail evidence in `docs/qa/2026-07-18-macos-smoke.md`.

- [ ] **Step 7: Commit only real captures and QA evidence**

```bash
git add apps/site/public/themes docs/qa/2026-07-18-macos-smoke.md
git commit -m "test: add real gothic theme captures"
```

### Task 5: Rebuild the website around finished results

**Files:**
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/components/ThemeCard.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/globals.css`

- [ ] **Step 1: Make Cathedral Nocturne the visual hero**

Render its real Home capture as the dominant first-screen image. Use the headline `把 Codex 变成你的工作世界。`, a short result-focused sentence, and one primary link to `/themes/cathedral-nocturne`. Remove repository statistics and internal production language.

- [ ] **Step 2: Render only the three finished theme cards**

Keep Home/Session switching and real screenshot alt text. Remove coming-soon status branches and placeholder messaging from the card component because every public catalog entry now has both captures.

- [ ] **Step 3: Simplify the detail page**

Keep real Home/Session captures before the install panel. Update the install copy and command version to 0.1.1 through catalog data. Remove the coming-soon branch and contributor CTA from detail pages.

- [ ] **Step 4: Replace slot-oriented CSS with image-first layout**

Add a large bordered hero capture with restrained page chrome, preserve responsive behavior, and ensure the first theme row appears immediately below the hero. Keep the site’s editorial paper aesthetic so the theme screenshots carry the visual drama.

- [ ] **Step 5: Build and run rendered HTML tests**

Run:

```bash
npm run build -w @codextheme/site
node --test apps/site/tests/rendered-html.test.mjs
```

Expected: PASS; no empty preview, coming-soon, slot-count, legacy theme, or 0.1.0 install text appears on public pages.

- [ ] **Step 6: Commit the screenshot-first site**

```bash
git add apps/site/app apps/site/tests/rendered-html.test.mjs
git commit -m "feat: showcase gothic themes with real captures"
```

### Task 6: Add the support email

**Files:**
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/security/page.tsx`

- [ ] **Step 1: Export a single support address**

In `SiteChrome.tsx` define:

```ts
export const SUPPORT_EMAIL = "codextheme@codextheme.tech";
```

Render a footer link with `href={`mailto:${SUPPORT_EMAIL}`}` and the visible address.

- [ ] **Step 2: Add support copy to Help and Security**

Import `SUPPORT_EMAIL` in both routes and add: `安装或兼容问题，请联系我们` followed by the mailto link. Do not ask users to send conversations, tokens, or private paths.

- [ ] **Step 3: Run the route contract**

Run:

```bash
npm run build -w @codextheme/site
node --test apps/site/tests/rendered-html.test.mjs
```

Expected: the mailto contract passes for `/`, `/help`, and `/security`.

- [ ] **Step 4: Commit support contact changes**

```bash
git add apps/site/app/components/SiteChrome.tsx apps/site/app/help/page.tsx apps/site/app/security/page.tsx apps/site/tests/rendered-html.test.mjs
git commit -m "feat: add public support email"
```

### Task 7: Release verification, npm publication, and production deployment

**Files:**
- Modify if evidence changes: `docs/qa/2026-07-18-macos-smoke.md`

- [ ] **Step 1: Run the complete local verification**

Run:

```bash
npm run check
```

Expected: typecheck, every workspace test, theme packaging, package checks, and production Next.js build pass with exit code 0.

- [ ] **Step 2: Inspect the final site at desktop and mobile widths**

Verify the hero image, all three cards, Home/Session toggles, copy command, support mail link, keyboard focus, mobile wrapping, and reduced-motion behavior. Fix and rerun the full check if any issue appears.

- [ ] **Step 3: Verify the npm tarball before publication**

Run:

```bash
npm pack --dry-run -w @codextheme/cli
```

Expected: version 0.1.1 and all six theme packages are listed; no source screenshots, private files, or `.superpowers` files are included.

Install that tarball into a temporary directory and verify `codextheme --version`, help output, all three new slugs, and package contents through the installed `@codextheme/cli`. An upstream `codedrobe` command is not acceptable release evidence.

- [ ] **Step 4: Publish CLI 0.1.1**

After confirming npm authentication and that 0.1.1 does not already exist, run:

```bash
npm publish -w @codextheme/cli --access public
```

Verify each public command through the npm-hosted package, beginning with `npx --yes @codextheme/cli@0.1.1 --version`, before the website deployment. Do not use a globally installed `codedrobe` executable anywhere in this verification.

- [ ] **Step 5: Integrate and push the release branch**

Fetch `origin/main`, replay the release commits onto a `codex/gothic-flagship-series` branch based on current main if necessary, push it, and merge through the repository’s normal PR path. Never overwrite unrelated user changes.

- [ ] **Step 6: Verify Vercel production**

After merge, confirm `https://codextheme.tech/`, all three theme detail routes, `/help`, and `/security` return 200 over HTTPS. Confirm visible commands use 0.1.1 and the production screenshots load.

- [ ] **Step 7: Final live smoke test**

Copy one command from production, apply it, verify the intended theme, then run the production restore command. Report which themes passed, any withheld theme, npm version, production commit, and live URLs.
