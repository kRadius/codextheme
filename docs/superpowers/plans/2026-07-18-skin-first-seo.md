# CodexTheme Skin-First SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the CodexTheme home page around high-intent `Codex skins` searches while retaining `Codex themes` and preserving the existing brand and application flow.

**Architecture:** Keep the current Next.js App Router and static catalog. Change only global home metadata, home-page structured data, and home hero copy; lock the positioning with the existing rendered-HTML integration test.

**Tech Stack:** Next.js 16, React, TypeScript, Node.js test runner

---

### Task 1: Lock and implement the dual-keyword home positioning

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/layout.tsx`
- Modify: `apps/site/app/page.tsx`

- [x] **Step 1: Write the failing rendered-HTML assertions**

Replace the old title, structured-data alternate name, and H1 expectations with assertions for:

```js
assert.match(homeHtml, /<title>Codex Skins &amp; Themes for Codex Desktop \| CodexTheme<\/title>/);
assert.match(homeHtml, /Discover immersive Codex skins and themes with real Home and Session previews/);
assert.equal(jsonLdBlocks.find((entry) => entry["@type"] === "WebSite").alternateName, "Codex Skins & Themes");
assert.match(homeHtml, /CODEX DESKTOP \/ SKINS &amp; THEMES/);
assert.match(homeHtml, /Codex skins that turn your workspace into a world/);
assert.match(homeHtml, /Immersive skins go beyond a color preset/);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: FAIL because the rendered home page still contains the theme-only title, alternate name, H1, and lead.

- [x] **Step 3: Implement the minimal metadata and hero-copy changes**

In `layout.tsx`, use:

```ts
const siteTitle = "Codex Skins & Themes for Codex Desktop | CodexTheme";
const siteDescription = "Discover immersive Codex skins and themes with real Home and Session previews, then install a pinned release with one command.";
```

Reuse `siteTitle` across the default, Open Graph, and Twitter titles. Change the social image alt text to `CodexTheme — skins and themes for Codex Desktop`.

In `page.tsx`, set `alternateName` to `Codex Skins & Themes`, change the eyebrow to `CODEX DESKTOP / SKINS & THEMES`, change the H1 to `Codex skins that turn your workspace into a world.`, and replace the lead with:

```text
Immersive skins go beyond a color preset: explore real Codex Desktop previews, choose a complete visual world, and install it with one command. Browse original themes now, with more on the way.
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: all rendered-HTML tests pass.

- [x] **Step 5: Run full verification**

Run:

```bash
npm run check
```

Expected: type checks, all tests, theme packaging, and the production site build pass.

- [x] **Step 6: Commit the release-ready change**

```bash
git add docs/superpowers/specs/2026-07-18-skin-first-seo-design.md docs/superpowers/plans/2026-07-18-skin-first-seo.md apps/site/tests/rendered-html.test.mjs apps/site/app/layout.tsx apps/site/app/page.tsx
git commit -m "feat: position Codex skins alongside themes"
```
