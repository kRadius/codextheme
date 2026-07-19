# Unified Brand Mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CodexTheme header, footer, browser favicon, and Apple Touch Icon use the selected blue-node C mark.

**Architecture:** Keep `brand-mark.svg` as the sole editable visual source. A small Sharp script derives the 180x180 Apple PNG during the site build, while the visible React chrome and Next.js metadata both reference the canonical SVG URL.

**Tech Stack:** Next.js 16 metadata, React 19, TypeScript, SVG, Sharp, Node.js test runner

---

## File map

- Create `apps/site/public/brand-mark.svg`: canonical selected Option A vector.
- Create `apps/site/public/apple-touch-icon.png`: generated 180x180 raster derivative.
- Create `apps/site/scripts/generate-brand-assets.mjs`: deterministic SVG-to-PNG generator.
- Create `apps/site/tests/brand-assets.test.mjs`: color, geometry, and raster-dimension contract.
- Modify `apps/site/package.json`: run the brand generator before every Next.js build.
- Modify `apps/site/app/components/SiteChrome.tsx`: render one shared visible brand-link component.
- Modify `apps/site/app/globals.css`: size and align the 22px mark.
- Modify `apps/site/app/layout.tsx`: expose the canonical favicon and Apple Touch Icon.
- Modify `apps/site/tests/rendered-html.test.mjs`: assert metadata and both visible mark instances.
- Delete `apps/site/public/favicon.svg`: remove the superseded gold-node asset.

### Task 1: Canonical vector and generated Apple icon

**Files:**
- Create: `apps/site/tests/brand-assets.test.mjs`
- Create: `apps/site/public/brand-mark.svg`
- Create: `apps/site/scripts/generate-brand-assets.mjs`
- Create: `apps/site/public/apple-touch-icon.png`
- Modify: `apps/site/package.json`
- Delete: `apps/site/public/favicon.svg`

- [ ] **Step 1: Write the failing asset-contract test**

Create `apps/site/tests/brand-assets.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const publicAsset = (name) => new URL(`../public/${name}`, import.meta.url);

test("brand assets share the selected blue-node C identity", async () => {
  const svg = await readFile(publicAsset("brand-mark.svg"), "utf8");
  assert.match(svg, /fill="#171512"/);
  assert.match(svg, /stroke="#f3eee4"/);
  assert.match(svg, /fill="#2354ff"/);
  assert.doesNotMatch(svg, /#c7a45a/i);

  const png = await readFile(publicAsset("apple-touch-icon.png"));
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 180);
  assert.equal(metadata.height, 180);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `node --test apps/site/tests/brand-assets.test.mjs`.

Expected: FAIL with `ENOENT` for `apps/site/public/brand-mark.svg`.

- [ ] **Step 3: Add the canonical SVG**

Create `apps/site/public/brand-mark.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#171512"/>
  <path d="M45 18a19 19 0 1 0 0 28" fill="none" stroke="#f3eee4" stroke-width="8" stroke-linecap="round"/>
  <circle cx="45" cy="18" r="4" fill="#2354ff"/>
</svg>
```

Delete `apps/site/public/favicon.svg`; no production code will retain its URL.

- [ ] **Step 4: Add the deterministic PNG generator**

Create `apps/site/scripts/generate-brand-assets.mjs`:

```js
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../public/brand-mark.svg", import.meta.url);
const destination = new URL("../public/apple-touch-icon.png", import.meta.url);
const svg = await readFile(source);

const png = await sharp(svg, { density: 192 })
  .resize(180, 180, { fit: "fill" })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

await writeFile(destination, png);
```

Update `apps/site/package.json` scripts to contain:

```json
"brand:build": "node scripts/generate-brand-assets.mjs",
"build": "npm run brand:build && next build"
```

- [ ] **Step 5: Generate the Apple icon and rerun the focused test**

Run:

```bash
npm run brand:build -w @codextheme/site
node --test apps/site/tests/brand-assets.test.mjs
```

Expected: PASS, with one passing test and a 180x180 PNG at `apps/site/public/apple-touch-icon.png`.

- [ ] **Step 6: Commit the asset pipeline**

```bash
git add apps/site/package.json apps/site/public/brand-mark.svg apps/site/public/apple-touch-icon.png apps/site/public/favicon.svg apps/site/scripts/generate-brand-assets.mjs apps/site/tests/brand-assets.test.mjs
git commit -m "feat: add unified brand assets"
```

### Task 2: Site chrome and metadata

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/globals.css`
- Modify: `apps/site/app/layout.tsx`

- [ ] **Step 1: Change the rendered-HTML assertions first**

Replace the old favicon assertion in `apps/site/tests/rendered-html.test.mjs` and add visible-mark assertions:

```js
assert.match(homeHtml, /<link rel="icon" href="\/brand-mark\.svg" type="image\/svg\+xml"/);
assert.match(homeHtml, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180" type="image\/png"/);
const visibleBrandMarks = [...homeHtml.matchAll(/<img class="brand-mark" src="\/brand-mark\.svg" width="22" height="22" alt=""/g)];
assert.equal(visibleBrandMarks.length, 2);
```

- [ ] **Step 2: Run the site test and verify the new contract fails**

Run `npm test -w @codextheme/site`.

Expected: FAIL because the rendered HTML still contains `/favicon.svg` and dot spans.

- [ ] **Step 3: Render a single shared brand link**

In `apps/site/app/components/SiteChrome.tsx`, add:

```tsx
function BrandLink() {
  return (
    <Link className="brand" href="/">
      <img className="brand-mark" src="/brand-mark.svg" width="22" height="22" alt="" />
      codextheme.tech
    </Link>
  );
}
```

Replace both duplicated brand links with `<BrandLink />`.

- [ ] **Step 4: Size the visible mark without layout movement**

Replace `.brand-mark` in `apps/site/app/globals.css` with:

```css
.brand-mark { display: block; width: 22px; height: 22px; flex: 0 0 22px; }
```

Keep the existing `.brand` gap, font, and header geometry unchanged.

- [ ] **Step 5: Point metadata at the shared assets**

Replace the `icons` entry in `apps/site/app/layout.tsx` with:

```ts
icons: {
  icon: [{ url: "/brand-mark.svg", type: "image/svg+xml" }],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
```

- [ ] **Step 6: Run the site tests and verify the contract passes**

Run `npm test -w @codextheme/site`.

Expected: PASS with the brand asset test and rendered HTML test included.

- [ ] **Step 7: Commit site integration**

```bash
git add apps/site/app/components/SiteChrome.tsx apps/site/app/globals.css apps/site/app/layout.tsx apps/site/tests/rendered-html.test.mjs
git commit -m "feat: unify site brand mark"
```

### Task 3: Full verification and visual QA

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the complete repository check**

Run `npm run check`.

Expected: type checks, 2 theme tests, 42 CLI tests, 42 runtime tests, all site tests, production builds, and package audits pass.

- [ ] **Step 2: Start the site locally**

Run `npm run dev -w @codextheme/site`.

Expected: Next.js reports a localhost URL and serves the home page.

- [ ] **Step 3: Inspect desktop and mobile layouts**

Open the local site at 1440x900 and 390x844. Verify:

- the C mark is 22px and vertically centered with `codextheme.tech`;
- the header remains 68px tall;
- navigation and wordmark do not wrap at the mobile breakpoint;
- the footer renders the same mark without duplicate accessible text;
- the browser tab displays the blue-node C icon.

- [ ] **Step 4: Check the final diff**

Run:

```bash
git diff main...HEAD --check
git status --short
```

Expected: no whitespace errors and no uncommitted source files.

### Task 4: Merge and production validation

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Push the branch and open a ready PR**

Create `/tmp/codextheme-brand-mark-pr.md` with this exact content using `apply_patch`:

```markdown
## Summary

- unify the visible header and footer mark with the browser favicon
- derive the Apple Touch Icon from the canonical SVG
- keep the existing CodexTheme wordmark and layout

## Verification

- `npm run check`
- desktop and mobile visual inspection
```

```bash
git push -u origin codex/unified-brand-mark
gh pr create -R kRadius/codextheme --base main --head kRadius:codex/unified-brand-mark --title "feat: unify CodexTheme brand mark" --body-file /tmp/codextheme-brand-mark-pr.md
```

Expected: GitHub returns a PR URL.

- [ ] **Step 2: Wait for every check and merge**

```bash
PR_NUMBER=$(gh pr view -R kRadius/codextheme codex/unified-brand-mark --json number --jq .number)
gh pr checks -R kRadius/codextheme "$PR_NUMBER" --watch --interval 10
gh pr merge -R kRadius/codextheme "$PR_NUMBER" --merge --delete-branch
```

Expected: Node 22/24, Vercel, and security checks pass; the PR reports `MERGED`.

- [ ] **Step 3: Verify production assets and HTML**

Request:

```text
https://codextheme.tech/
https://codextheme.tech/brand-mark.svg
https://codextheme.tech/apple-touch-icon.png
```

Expected: the home HTML references `/brand-mark.svg` twice in visible chrome, exposes both icon metadata links, and both asset URLs return HTTP 200. The SVG contains `#2354ff` and no `#c7a45a`; the PNG is 180x180.
