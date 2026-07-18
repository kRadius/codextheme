# CodexTheme Repository Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the launch catalog to nine installable original themes, capture honest Codex Home/Session previews, and reshape the Next.js homepage into a compact theme repository.

**Architecture:** Keep the static catalog and bundled-theme release model. Add six manifests and project-owned raster backgrounds, pack every theme into the fixed CLI release, then use a metadata-rich site model to render a repository-style Gallery and static detail pages. Real Codex screenshots are separate from theme wallpaper assets and are never synthesized by the site.

**Tech Stack:** Node.js 22, npm workspaces, Next.js 16, React 19, TypeScript, Node test runner, Sharp, CodeDrobe-compatible theme packages, macOS Codex Desktop.

---

## File map

```text
themes/catalog.json                         # canonical nine-theme metadata
themes/<new-slug>/theme.json                # installable theme manifests
themes/<new-slug>/assets/*.jpg              # original wallpaper assets
themes/<new-slug>/previews/*.png            # real Codex captures
themes/shared/codex.css                     # safe shared renderer styling
themes/scripts/pack.mjs                     # nine-theme packaging gate
packages/cli/src/catalog.mjs                # CLI slug registry
packages/cli/themes/*.codedrobe-theme        # bundled packages
apps/site/app/lib/themes.ts                 # typed repository view model
apps/site/app/components/ThemeCard.tsx       # Home/Session gallery interaction
apps/site/app/components/ThemePreview.tsx    # honest real screenshot display
apps/site/app/page.tsx                      # compact repository homepage
apps/site/app/themes/[slug]/page.tsx         # detail page and install action
apps/site/app/globals.css                    # cold-index visual system
apps/site/public/themes/<slug>/*             # public preview assets
tests/catalog.test.mjs                       # catalog/package contract
apps/site/tests/rendered-html.test.mjs       # route and copy contract
```

### Task 1: Lock the nine-theme repository contract

**Files:**
- Modify: `tests/catalog.test.mjs`
- Modify: `themes/catalog.json`
- Modify: `packages/cli/src/catalog.mjs`

- [ ] **Step 1: Write the failing catalog test**

Assert the exact slug order and required repository metadata:

```js
const slugs = [
  "midnight-circuit", "crimson-eclipse", "aurora-glass",
  "ink-mountain", "pixel-terminal", "neon-tokyo",
  "obsidian-gold", "sakura-observatory", "abyss-station",
];
assert.deepEqual(catalog.map(({ slug }) => slug), slugs);
for (const theme of catalog) {
  assert.ok(Array.isArray(theme.tags) && theme.tags.length >= 2);
  assert.equal(typeof theme.series, "string");
  assert.equal(theme.previewHome, `themes/${theme.slug}/previews/home.png`);
  assert.equal(theme.previewSession, `themes/${theme.slug}/previews/session.png`);
}
```

- [ ] **Step 2: Run the test and confirm RED**

Run `node --test tests/catalog.test.mjs`.
Expected: FAIL because only three entries exist and the repository fields are absent.

- [ ] **Step 3: Extend the catalog and CLI registry**

Add six entries with the approved names, series, tags, colors, source, fixed command, preview paths, author `CodexTheme Studio`, compatibility `Codex Desktop / macOS`, and ISO update date. Add the six package filenames to the CLI catalog without adding network lookup.

- [ ] **Step 4: Re-run the catalog test**

Run `node --test tests/catalog.test.mjs`.
Expected: metadata assertions pass; package assertions may remain red until Task 3.

### Task 2: Produce six original theme sources

**Files:**
- Create: `themes/{ink-mountain,pixel-terminal,neon-tokyo,obsidian-gold,sakura-observatory,abyss-station}/theme.json`
- Create: `themes/<slug>/assets/hero.jpg`
- Create: `themes/<slug>/assets/session.jpg`
- Modify: `themes/shared/codex.css` only if a verified theme needs a generic readability correction

- [ ] **Step 1: Generate one original landscape background per theme**

Use the built-in image generator with one prompt per approved theme. Every prompt requires a 16:10 desktop wallpaper composition, useful quiet space for Codex controls, no text, no logos, no recognizable IP, no watermark, and restrained contrast behind interface content.

- [ ] **Step 2: Inspect and save every selected image**

Visually inspect each output, then copy it to the matching theme asset directory as `hero.jpg`; create `session.jpg` as a non-destructive second composition generated for the same art direction. Do not overwrite the existing Circuit Series assets.

- [ ] **Step 3: Create six manifests**

Each manifest uses schema 1, version `1.0.0`, shared CSS, `hero` and `session-bg` image IDs, renderer profile `codex-theme-v1`, a theme-specific dark or light base theme, readable ink/surface values, semantic diff colors, and stable `main.main-surface` plus `.composer-surface-chrome` verification recommendations.

- [ ] **Step 4: Validate source completeness**

Run `find themes -path '*/theme.json' -o -path '*/assets/*.jpg' | sort`.
Expected: nine manifests and eighteen wallpaper assets.

### Task 3: Pack and test all themes

**Files:**
- Modify: `themes/scripts/pack.mjs`
- Generate: `packages/cli/themes/<six-new-slugs>.codedrobe-theme`
- Modify: `tests/catalog.test.mjs`

- [ ] **Step 1: Add failing package coverage**

For every catalog slug, read the packed JSON, assert `manifest.id === slug`, require embedded `hero` and `session-bg` images, and assert the canonical export timestamp.

- [ ] **Step 2: Run the package test and confirm RED**

Run `node --test tests/catalog.test.mjs`.
Expected: FAIL with missing new `.codedrobe-theme` files.

- [ ] **Step 3: Pack all catalog entries**

Run `node themes/scripts/pack.mjs`. The existing pack loop must read the expanded catalog, reject lint warnings, and write exactly nine packages.

- [ ] **Step 4: Re-run package tests and CLI tests**

Run `node --test tests/catalog.test.mjs && npm test -w @codextheme/cli`.
Expected: all catalog and CLI assertions pass.

### Task 4: Capture honest Codex previews

**Files:**
- Create: `themes/<slug>/previews/home.png`
- Create: `themes/<slug>/previews/session.png`
- Copy: `apps/site/public/themes/<slug>/home.png`
- Copy: `apps/site/public/themes/<slug>/session.png`

- [ ] **Step 1: Detect the supported Codex target**

Run `codedrobe apps --json` and `codedrobe detect --app codex --json` using the published CLI. Use the reported loopback port and application path consistently.

- [ ] **Step 2: Probe before every apply**

For each package, run `codedrobe probe --app codex --theme <absolute-package-path> --timeout-ms 5000`. A missing required adapter or invalid selector blocks capture for that theme.

- [ ] **Step 3: Apply and capture Home**

Apply the package without `--restart-existing` unless separately authorized. Open the native Home route, then run `codedrobe verify --app codex --theme <absolute-package-path> --screenshot <absolute-home-path>`. Confirm native navigation, project selector, suggestions, composer, no overflow, and no private data.

- [ ] **Step 4: Capture the standard Session fixture**

Open the public preview task containing prose, a code block, tool output, scrolling and the composer, then verify to `<absolute-session-path>`. Reject any screenshot containing user paths, unrelated task names or private messages.

- [ ] **Step 5: Restore after the final capture**

Run `codedrobe restore --app codex` and verify the managed theme class, style and renderer state are gone.

### Task 5: Build the repository view model and Gallery with TDD

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/lib/themes.ts`
- Create: `apps/site/app/components/ThemeCard.tsx`
- Modify: `apps/site/app/components/ThemePreview.tsx`

- [ ] **Step 1: Write failing rendered-HTML assertions**

Assert the home renders all nine slugs, the repository headline, `9 个主题`, real `/home.png` and `/session.png` paths, a GitHub submission link, and no `搜索`, `上传图片`, `为什么只有三个`, or synthetic preview class names.

- [ ] **Step 2: Run the site test and confirm RED**

Run `npm test -w @codextheme/site`.
Expected: FAIL against the three-theme AI-style homepage.

- [ ] **Step 3: Expand the typed view model**

Add `series`, `tags`, `author`, `compatibility`, `updatedAt`, `homePreview`, `sessionPreview`, and `verified` to `Theme`. Preserve the fixed command and find helper.

- [ ] **Step 4: Implement the interactive card**

`ThemeCard` is a client component with accessible Home/Session buttons and one screenshot image. Switching view changes only the image and active state; the card title links to the static detail page. Unverified themes render `预览待验证` instead of `已验证`.

- [ ] **Step 5: Make detail previews honest**

`ThemePreview` renders an actual `<img>` from `homePreview` or `sessionPreview`; it removes synthetic sidebars, fake composers and generated Codex controls.

### Task 6: Reshape the homepage and detail narrative

**Files:**
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/globals.css`

- [ ] **Step 1: Implement the compact repository homepage**

Use the approved order: compact nav, short repository hero, Gallery, 30-second install strip, contribution CTA, compact safety footer. The first desktop viewport must expose the first Gallery row. Do not render search, filters, uploads, fake metrics or “curated-only” positioning.

- [ ] **Step 2: Update navigation and contribution entry**

Header links are `全部主题`, `安装帮助`, `提交主题`, and `GitHub`. `提交主题` opens a prefilled GitHub issue URL in the public repository; it does not create an account or form backend.

- [ ] **Step 3: Update detail pages**

Show real Home/Session images, repository metadata, compatibility, updated date, fixed command and restore command. Keep exactly one `data-copy-command` element.

- [ ] **Step 4: Replace the AI visual system**

Use cold paper `#e4e7ea`, ink `#15181c`, proof white `#fbfbf9`, index blue `#2354ff`, and status green `#2f7c59`. Use condensed display type, Menlo utility labels, thin borders, restrained shadows, responsive two/three/one-column Gallery behavior, focus-visible outlines and reduced-motion rules.

- [ ] **Step 5: Re-run site tests**

Run `npm test -w @codextheme/site && npm run lint -w @codextheme/site`.
Expected: build, rendered HTML assertions and lint all pass without warnings.

### Task 7: Run the full release gate

**Files:**
- Modify: `README.md` if theme count or screenshots are documented incorrectly
- Modify: `apps/site/app/sitemap.ts` only if it does not derive all slugs dynamically

- [ ] **Step 1: Run automated verification**

Run `npm run typecheck && npm test && npm run build && node scripts/check-packages.mjs && git diff --check`.
Expected: every command exits 0 and package inspection reports nine themes.

- [ ] **Step 2: Inspect the local site visually**

Run the Next.js dev server, open desktop and mobile widths, verify the first Gallery row appears quickly, all images load, Home/Session switches work, keyboard focus is visible, and no horizontal overflow occurs.

- [ ] **Step 3: Commit and push**

Stage only the repository launch files, commit with `feat: launch Codex theme repository`, then push `codex/48h-mvp` so Vercel can produce a preview deployment.
