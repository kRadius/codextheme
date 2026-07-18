# CodexTheme Repository Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a structurally complete nine-slot theme repository while keeping only the three already-packaged themes installable and representing missing real screenshots honestly.

**Architecture:** Add lifecycle state and optional preview paths to the canonical static catalog. The CLI and packer filter for `available` entries, while the Next.js site renders both available and coming-soon themes through shared cards and detail pages. Preview components render real images only when a path exists; otherwise they render an explicit empty state.

**Tech Stack:** Node.js 22, JSON catalog, npm workspaces, Next.js 16, React 19, TypeScript, Node test runner, static Vercel deployment.

---

### Task 1: Define availability and optional-preview contracts

**Files:**
- Modify: `tests/catalog.test.mjs`
- Modify: `themes/catalog.json`
- Modify: `packages/cli/src/catalog.mjs`
- Modify: `themes/scripts/pack.mjs`

- [ ] Write a failing test that requires nine site entries, exactly three `available` entries, six `coming-soon` entries, optional preview paths, and commands only for available entries.
- [ ] Run `node --test tests/catalog.test.mjs` and confirm it fails because lifecycle state is missing.
- [ ] Add `status`, `series`, `tags`, repository metadata and nullable preview fields to all entries; remove commands and source paths from coming-soon entries.
- [ ] Keep the CLI registry to the three available themes and make the packer filter `status === "available"`.
- [ ] Re-run catalog and CLI tests and confirm they pass.

### Task 2: Own the internal theme artifact name

**Files:**
- Modify: `themes/scripts/pack.mjs`
- Modify: `packages/cli/src/catalog.mjs`
- Rename: `packages/cli/themes/*.codedrobe-theme` to `*.codextheme-theme`
- Modify: `scripts/check-packages.mjs`
- Modify: affected tests and documentation

- [ ] Write a failing assertion that available CLI artifacts end in `.codextheme-theme` and packaged output contains no `.codedrobe-theme` filenames.
- [ ] Run the catalog/package tests and confirm the old extension fails.
- [ ] Update output, lookup and package inspection paths, then regenerate the three owned artifacts without changing their JSON schema or Apache-2.0 provenance.
- [ ] Re-run package, CLI and release-check tests.

### Task 3: Build the typed repository view model

**Files:**
- Modify: `apps/site/app/lib/themes.ts`
- Create: `apps/site/app/components/ThemeCard.tsx`
- Modify: `apps/site/app/components/ThemePreview.tsx`
- Modify: `apps/site/tests/rendered-html.test.mjs`

- [ ] Write failing rendered-HTML assertions for nine slugs, status labels, placeholder text, no fake preview controls, and no install command on coming-soon pages.
- [ ] Run `npm test -w @codextheme/site` and confirm the old three-theme site fails.
- [ ] Add typed `status`, repository metadata and nullable Home/Session preview fields.
- [ ] Implement a Gallery card that shows a real image only when supplied, otherwise `真实截图待补齐`; available cards link to installable details and coming-soon cards link to a non-installable detail state.
- [ ] Replace synthetic `ThemePreview` UI with image-or-placeholder rendering.

### Task 4: Reshape the pages around the repository

**Files:**
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/globals.css`

- [ ] Replace the large AI landing hero with a compact repository header that exposes the Gallery in the first desktop viewport.
- [ ] Render all nine theme slots without search, uploads, fake metrics or “only curated themes” positioning.
- [ ] Keep one copy CTA on available detail pages; render `完成验证后开放安装` with no command on coming-soon pages.
- [ ] Add the GitHub submission entry and compact install/safety sections.
- [ ] Apply the cold-paper catalog visual system, responsive Gallery, visible focus and reduced-motion behavior.

### Task 5: Verify the skeleton release

**Files:**
- Modify: `README.md` where the public theme count or artifact extension is stale

- [ ] Run `npm run typecheck`, all tests, Next.js build, package inspection and `git diff --check`.
- [ ] Inspect the local desktop and mobile layouts, verifying placeholders are explicit and no coming-soon command can be copied.
- [ ] Commit the repository skeleton and push `codex/48h-mvp` for Vercel preview deployment.
