# English-First SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an English-first CodexTheme site with crawlable English content, a home canonical, a favicon, and `WebSite` structured data while preserving the current theme and installation flows.

**Architecture:** Keep the current Next.js App Router routes and theme catalog. Global search metadata stays in `layout.tsx`, home-only `WebSite` JSON-LD stays in `page.tsx`, and existing page components are translated in place without adding a localization framework.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node.js test runner, Vercel.

---

## File map

- Modify `apps/site/app/layout.tsx`: global English metadata, canonical, favicon declaration, and document language.
- Modify `apps/site/app/page.tsx`: English home content and static `WebSite` JSON-LD.
- Create `apps/site/public/favicon.svg`: stable square CodexTheme search icon.
- Modify `apps/site/app/components/SiteChrome.tsx`: English navigation, footer, and GitHub issue template.
- Modify `apps/site/app/components/ThemeCard.tsx`: English card labels, names, descriptions, and alt text.
- Modify `apps/site/app/components/ThemePreview.tsx`: English preview labels and alt text.
- Modify `themes/catalog.json`: English public theme tags.
- Modify `apps/site/app/themes/[slug]/page.tsx`: English theme metadata and installation content.
- Modify `apps/site/app/help/page.tsx`: English installation and recovery documentation.
- Modify `apps/site/app/security/page.tsx`: English safety documentation.
- Modify `apps/site/app/not-found.tsx`: English 404 content.
- Modify `apps/site/tests/rendered-html.test.mjs`: rendered-output regression coverage for the SEO foundation and English pages.

### Task 1: Add the technical SEO foundation

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/layout.tsx`
- Modify: `apps/site/app/page.tsx`
- Create: `apps/site/public/favicon.svg`

- [ ] **Step 1: Write the failing rendered-HTML assertions**

Add these assertions after reading `homeHtml` in the home-page test:

```js
assert.match(homeHtml, /<html lang="en">/);
assert.match(homeHtml, /<title>Codex Themes for Codex Desktop \| CodexTheme<\/title>/);
assert.match(homeHtml, /<link rel="canonical" href="https:\/\/codextheme\.tech\/"/);
assert.match(homeHtml, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/);

const jsonLdBlocks = [...homeHtml.matchAll(
  /<script type="application\/ld\+json">(.*?)<\/script>/gs,
)].map((match) => JSON.parse(match[1]));
assert.deepEqual(jsonLdBlocks.find((entry) => entry["@type"] === "WebSite"), {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodexTheme",
  alternateName: "Codex Themes",
  url: "https://codextheme.tech/",
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: FAIL because the document still uses `zh-CN` and the home page has no canonical, favicon declaration, or `WebSite` JSON-LD.

- [ ] **Step 3: Implement the global metadata and document language**

Update `apps/site/app/layout.tsx` so its metadata includes:

```tsx
const siteDescription = "Browse original Codex themes with real Home and Session previews, then install a pinned release with one command.";

export const metadata: Metadata = {
  metadataBase: new URL("https://codextheme.tech"),
  title: {
    default: "Codex Themes for Codex Desktop | CodexTheme",
    template: "%s | CodexTheme",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CodexTheme",
    title: "Codex Themes for Codex Desktop | CodexTheme",
    description: siteDescription,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CodexTheme — themes for Codex Desktop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codex Themes for Codex Desktop | CodexTheme",
    description: siteDescription,
    images: ["/og.png"],
  },
};
```

Change the root element to:

```tsx
<html lang="en"><body>{children}<GoogleAnalytics /></body></html>
```

- [ ] **Step 4: Add home-page `WebSite` JSON-LD**

Define and render this static value in `apps/site/app/page.tsx` inside `<main>`:

```tsx
const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodexTheme",
  alternateName: "Codex Themes",
  url: "https://codextheme.tech/",
};

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
/>
```

- [ ] **Step 5: Add the stable favicon asset**

Create `apps/site/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#171512"/>
  <path d="M45 18a19 19 0 1 0 0 28" fill="none" stroke="#f3eee4" stroke-width="8" stroke-linecap="round"/>
  <circle cx="45" cy="18" r="4" fill="#c7a45a"/>
</svg>
```

- [ ] **Step 6: Rebuild and verify GREEN**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: the new SEO assertions pass; old Chinese content assertions may now still pass because translation has not started.

- [ ] **Step 7: Commit the SEO foundation**

```bash
git add apps/site/app/layout.tsx apps/site/app/page.tsx apps/site/public/favicon.svg apps/site/tests/rendered-html.test.mjs
git commit -m "feat: add English SEO foundation"
```

### Task 2: Translate the shared shell and home gallery

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/components/ThemeCard.tsx`
- Modify: `apps/site/app/components/ThemePreview.tsx`
- Modify: `themes/catalog.json`

- [ ] **Step 1: Replace the home-page expectations with English-first assertions**

Use these home assertions:

```js
assert.match(homeHtml, /Codex themes that turn your workspace into a world/);
assert.match(homeHtml, /Browse all themes/);
assert.match(homeHtml, /Submit a theme/);
assert.match(homeHtml, /Three complete worlds/);
assert.match(homeHtml, /mailto:codextheme@codextheme\.tech/);
assert.doesNotMatch(homeHtml, /把 Codex|全部主题|提交主题|安装帮助|已可安装/);
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: FAIL on the new English home copy.

- [ ] **Step 3: Translate the home page without changing its structure**

Use these primary strings in `apps/site/app/page.tsx`:

```tsx
<h1>Codex themes that turn your workspace into a world.</h1>
<p className="flagship-lead">Browse real Codex Desktop previews, choose a complete visual world, and install a pinned release with one command. Start with three original Gothic themes, with more on the way.</p>
```

Translate the remaining labels to `Explore Cathedral Nocturne`, `Browse all themes`, `Codex Home preview`, `Three complete worlds, not three recolored wallpapers.`, `Choose a theme. Install it in 30 seconds.`, `See Home and Session previews`, `Copy the pinned command`, `Paste it into Terminal`, `The next theme could be yours.`, and `Submit a theme proposal`.

- [ ] **Step 4: Translate shared chrome and issue template**

Use English navigation labels `All themes`, `Install help`, `Submit a theme`, and `GitHub`. Use footer labels `Security`, `Install help`, and `Submit a theme`, with the notice `Independent project · Apache-2.0 · Not affiliated with or endorsed by OpenAI`.

Set `SUBMIT_THEME_URL` to:

```ts
export const SUBMIT_THEME_URL = "https://github.com/kRadius/codextheme/issues/new?title=Theme%20submission%3A%20&body=Theme%20name%3A%0AStyle%20description%3A%0AAsset%20sources%20and%20licenses%3A%0A";
```

- [ ] **Step 5: Translate cards, previews, and public tags**

Render `theme.name`, `theme.description`, and English alt text in `ThemeCard.tsx` and `ThemePreview.tsx`. Replace the three catalog tag lists with:

```json
["Gothic", "Black & gold", "Dark"]
["Gothic", "Crimson moon", "Dark"]
["Gothic", "Silver", "Dark"]
```

Use `Ready to install`, `View and install`, `Home`, and `Session` for card and preview labels.

- [ ] **Step 6: Rebuild and verify GREEN**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: the English home assertions pass and all three theme links remain present.

- [ ] **Step 7: Commit the English gallery**

```bash
git add apps/site/app/page.tsx apps/site/app/components/SiteChrome.tsx apps/site/app/components/ThemeCard.tsx apps/site/app/components/ThemePreview.tsx themes/catalog.json apps/site/tests/rendered-html.test.mjs
git commit -m "feat: make the theme gallery English-first"
```

### Task 3: Translate theme, Help, Security, and 404 pages

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/security/page.tsx`
- Modify: `apps/site/app/not-found.tsx`

- [ ] **Step 1: Add English subpage assertions**

For every theme page assert the English theme name, description, `Ready to install`, `Apply with one command`, and the unchanged pinned command. Change route expectations to:

```js
["/security", /Codex\.app stays untouched/],
["/help", /Apply a theme for the first time/],
["/robots.txt", /User-Agent/],
["/sitemap.xml", /themes\/cathedral-nocturne/],
```

Also assert that Help and Security do not contain `返回首页`, `使用帮助`, or `安全边界`.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: FAIL on the untranslated theme and documentation pages.

- [ ] **Step 3: Translate theme metadata and installation content**

Use:

```ts
title: `${theme.name} Codex Theme`,
description: `${theme.description} Preview and install this Codex Desktop theme.`,
```

Render the English name, description, `Author`, `Compatibility`, `Updated`, `Apply with one command`, `Installation boundaries`, `View the complete security model`, and the existing fixed CLI command. Keep the safety meaning and restore route unchanged.

- [ ] **Step 4: Translate Help, Security, and 404 pages**

Help must cover first application, `reapply`, `restore`, restart consent, and safe support details. Security must retain these headings and meanings:

```text
Codex.app stays untouched
Themes are data, not programs
Codex never restarts silently
Pinned releases and public source
Restore the official appearance
Get help
Independent project
```

Use `This theme page does not exist.` and `Back to the home page` on the 404 page.

- [ ] **Step 5: Rebuild and verify GREEN**

Run:

```bash
npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs
```

Expected: all rendered HTML tests pass with English public content and unchanged commands.

- [ ] **Step 6: Commit the English support pages**

```bash
git add apps/site/app/themes/'[slug]'/page.tsx apps/site/app/help/page.tsx apps/site/app/security/page.tsx apps/site/app/not-found.tsx apps/site/tests/rendered-html.test.mjs
git commit -m "feat: translate theme and support pages"
```

### Task 4: Run the full quality gate

**Files:**
- Verify: all files changed in Tasks 1–3

- [ ] **Step 1: Check formatting and types**

Run:

```bash
git diff --check HEAD~3
npm run typecheck
npm run lint -w @codextheme/site
```

Expected: exit code 0 with no TypeScript or ESLint errors.

- [ ] **Step 2: Run the complete test and production build suite**

Run:

```bash
npm test
npm run site:build
node scripts/check-packages.mjs
```

Expected: all tests pass, the Next.js production build succeeds, and published-package checks report no package boundary errors.

- [ ] **Step 3: Inspect the final rendered signals**

Run the built app and verify `/` contains the English title, canonical, favicon link, `WebSite` JSON-LD, English H1, all three theme links, and GA4 ID. Verify one theme page, `/help`, `/security`, `/robots.txt`, and `/sitemap.xml` return HTTP 200.

- [ ] **Step 4: Review the final diff and status**

Run:

```bash
git diff origin/main...HEAD --stat
git status --short
```

Expected: only the approved English-first SEO files and plan/spec documentation are changed; `.superpowers/` remains untracked and untouched.
