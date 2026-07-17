# codextheme.tech 48-Hour Traffic MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, macOS-first codextheme.tech MVP with an owned Apache-2.0-derived runtime, three bundled original themes, one fixed-version copy command, and verified apply/reapply/restore behavior.

**Architecture:** Preserve CodeDrobe Core 0.3.0 history as the repository baseline, move and rename it to `@codextheme/runtime`, then add a small `@codextheme/cli` and dependency-free static site in the same public monorepo. Theme packages are built at release time and bundled in the CLI tarball, so V1 needs no API, database, R2, descriptor, or remote theme download.

**Tech Stack:** Node.js 22.4+, npm workspaces, Node built-in test runner, CodeDrobe Core 0.3.0-derived ESM, Sharp for build-time original artwork, static HTML/CSS/JavaScript, OpenAI Sites hosting, npm public packages.

---

## File map

```text
codextheme/
├── apps/site/
│   ├── scripts/build.mjs
│   ├── src/page.mjs
│   ├── src/styles.css
│   ├── src/copy.js
│   ├── tests/build.test.mjs
│   └── package.json
├── packages/runtime/
│   ├── src/
│   ├── types/
│   ├── tests/
│   ├── LICENSE
│   ├── NOTICE
│   └── package.json
├── packages/cli/
│   ├── src/bin.mjs
│   ├── src/main.mjs
│   ├── src/lifecycle.mjs
│   ├── src/prompt.mjs
│   ├── src/state.mjs
│   ├── src/catalog.mjs
│   ├── themes/*.codedrobe-theme
│   ├── tests/main.test.mjs
│   ├── tests/lifecycle.test.mjs
│   ├── LICENSE
│   ├── NOTICE
│   ├── README.md
│   └── package.json
├── themes/
│   ├── catalog.json
│   ├── shared/codex.css
│   ├── midnight-circuit/{theme.json,assets/}
│   ├── crimson-eclipse/{theme.json,assets/}
│   ├── aurora-glass/{theme.json,assets/}
│   └── scripts/{generate-art.mjs,pack.mjs}
├── tests/catalog.test.mjs
├── scripts/check-packages.mjs
├── LICENSE
├── NOTICE
├── UPSTREAM.md
├── README.md
└── package.json
```

## Task 1: Convert the upstream baseline into the owned monorepo

**Files:**
- Move: current upstream root source into `packages/runtime/`
- Create: `package.json`
- Create: `README.md`
- Create: `UPSTREAM.md`
- Modify: `packages/runtime/package.json`
- Modify: `packages/runtime/src/version.mjs`
- Modify: `packages/runtime/tests/version.test.mjs`
- Delete: `packages/runtime/bin/codedrobe.mjs`
- Delete: `packages/runtime/src/cli.mjs`
- Delete: `packages/runtime/src/update.mjs`
- Delete: `packages/runtime/tests/cli.test.mjs`
- Delete: `packages/runtime/tests/update.test.mjs`

- [ ] **Step 1: Record the immutable upstream baseline**

Run:

```bash
git rev-parse v0.3.0
git rev-parse HEAD~0
```

Expected: both print `3e4d1c808d03e8cb87a7febbef64d60b34477090` before the first project code commit.

- [ ] **Step 2: Mechanically move the runtime files**

Create `packages/runtime`, then move `src`, `types`, `tests`, `examples`, `README.md`, `README_zh.md`, `LICENSE`, `NOTICE`, and the upstream package manifest into it. Remove the standalone upstream bin/update surface listed above; retain the runtime API, Codex adapter, package tooling, and existing tests. Copy LICENSE and NOTICE back to the repository root so GitHub and each npm package expose the required notices.

- [ ] **Step 3: Rename and narrow the runtime package**

`packages/runtime/package.json` must contain:

```json
{
  "name": "@codextheme/runtime",
  "version": "0.1.0",
  "description": "Auditable Codex Desktop theme runtime derived from CodeDrobe Core 0.3.0.",
  "type": "module",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kRadius/codextheme.git",
    "directory": "packages/runtime"
  },
  "exports": {
    ".": { "types": "./types/index.d.ts", "default": "./src/index.mjs" },
    "./adapters": { "types": "./types/adapters.d.ts", "default": "./src/adapters/index.mjs" },
    "./theme": { "types": "./types/theme.d.ts", "default": "./src/theme/index.mjs" }
  },
  "types": "./types/index.d.ts",
  "files": ["LICENSE", "NOTICE", "README.md", "README_zh.md", "src", "types"],
  "scripts": {
    "test": "node --test",
    "typecheck": "tsc -p tests/types/tsconfig.json",
    "pack:check": "npm pack --dry-run"
  },
  "devDependencies": { "typescript": "5.9.2" },
  "engines": { "node": ">=22.4" },
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" }
}
```

Set `src/version.mjs` to `export const VERSION = "0.1.0";` and update the version assertion test.

- [ ] **Step 4: Add root workspace and provenance notes**

Root `package.json` is private, pins npm workspaces `packages/*` and `apps/*`, and exposes `build`, `test`, `typecheck`, `themes:build`, `site:build`, and `check` scripts. `UPSTREAM.md` records upstream URL, Apache-2.0, tag `v0.3.0`, commit `3e4d1c8…`, import date `2026-07-18`, removed surfaces, package rename, and the rule that upstream changes are reviewed/cherry-picked manually.

- [ ] **Step 5: Install and verify the preserved runtime**

Run:

```bash
npm install
npm run test -w @codextheme/runtime
npm run typecheck -w @codextheme/runtime
```

Expected: every retained upstream test passes and TypeScript consumer checks exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: establish codextheme runtime fork"
```

## Task 2: Generate and pack three original themes

**Files:**
- Create: `themes/catalog.json`
- Create: `themes/shared/codex.css`
- Create: `themes/scripts/generate-art.mjs`
- Create: `themes/scripts/pack.mjs`
- Create: `themes/<slug>/theme.json`
- Generate: `themes/<slug>/assets/hero.jpg`
- Generate: `themes/<slug>/assets/session.jpg`
- Generate: `packages/cli/themes/<slug>.codedrobe-theme`
- Create: `tests/catalog.test.mjs`
- Modify: root `package.json`

- [ ] **Step 1: Write the failing catalog test**

The test must assert exactly the three approved slugs, unique display names, hex accent/surface values, source paths under `themes/`, and fixed command strings:

```js
assert.deepEqual(catalog.map((theme) => theme.slug), [
  "midnight-circuit",
  "crimson-eclipse",
  "aurora-glass",
]);
for (const theme of catalog) {
  assert.equal(theme.command, `npx --yes @codextheme/cli@0.1.0 apply ${theme.slug}`);
}
```

Run `node --test tests/catalog.test.mjs`; expected: FAIL because the catalog is absent.

- [ ] **Step 2: Create the catalog and manifests**

Each record declares `slug`, English/Chinese display name, short description, `accent`, `surface`, and command. Each manifest uses schema 1, version `1.0.0`, images `hero` and `session-bg`, target `codex`, renderer profile `codex-theme-v1`, dark base theme, shared CSS, and only stable verification recommendations.

- [ ] **Step 3: Generate rights-safe raster art**

Add root dev dependency `sharp@0.35.3`. `generate-art.mjs` contains three hard-coded original SVG compositions made only from gradients, geometric rings, grids, blurred light, and noise filters. Render each to 3200×2000 JPEG `hero.jpg` and 2400×1600 JPEG `session.jpg`, quality 86, progressive, with no external file or network input.

- [ ] **Step 4: Implement full-session CSS**

`themes/shared/codex.css` uses per-theme manifest colors and both CodeDrobe image variables. It adds a fixed, pointer-events-none body background from `--codedrobe-image-session-bg`, keeps sidebar/composer/code surfaces opaque enough for readability, uses `--codedrobe-image-hero` for the Home card, preserves focus-visible outlines, and disables motion under reduced-motion. It must not contain remote `url()`, text selectors, arbitrary generated classes, or JavaScript.

- [ ] **Step 5: Pack and inspect themes**

`pack.mjs` imports `writeThemePackage`, `readThemePackage`, `lintThemePackage`, and `resolveThemeTarget` from `@codextheme/runtime`; it writes all three CLI package files, reads them back, rejects lint warnings, and requires both embedded image IDs.

Run:

```bash
npm run themes:build
node --test tests/catalog.test.mjs
```

Expected: three package files exist and every assertion passes.

- [ ] **Step 6: Commit**

```bash
git add themes packages/cli/themes tests package.json package-lock.json
git commit -m "feat: add three original Codex themes"
```

## Task 3: Implement the one-command CLI with TDD

**Files:**
- Create: `packages/cli/src/catalog.mjs`
- Create: `packages/cli/src/state.mjs`
- Create: `packages/cli/src/prompt.mjs`
- Create: `packages/cli/src/lifecycle.mjs`
- Create: `packages/cli/src/main.mjs`
- Create: `packages/cli/src/bin.mjs`
- Create: `packages/cli/tests/main.test.mjs`
- Create: `packages/cli/tests/lifecycle.test.mjs`
- Create: `packages/cli/package.json`
- Create: `packages/cli/README.md`
- Create: `packages/cli/LICENSE`
- Create: `packages/cli/NOTICE`

- [ ] **Step 1: Write failing command tests**

Inject stdout/stderr, platform, runtime facade, state store, prompt, and clock. Cover exact argv shapes:

```js
assert.equal(await run(["apply", "midnight-circuit"], deps), 0);
assert.equal(await run(["reapply"], depsWithState), 0);
assert.equal(await run(["restore"], deps), 0);
assert.equal(await run(["apply", "unknown"], deps), 2);
assert.match(stderr.text(), /E_USAGE/);
```

Also assert unsupported platforms fail before theme load, `reapply` performs no fetch/network call, and successful output contains the fixed reapply/restore commands.

- [ ] **Step 2: Write failing lifecycle tests**

The fake runtime facade exposes `loadTheme`, `detect`, `apply`, and `restore`. Cover closed Codex, CDP-ready Codex, running-without-CDP cancel, explicit `y`, runtime restart-required retry, verification failure without state, successful reapply, successful restore, and partial restore retaining state.

- [ ] **Step 3: Implement strict catalog and state**

`catalog.mjs` maps only the three hard-coded slugs to `../themes/<slug>.codedrobe-theme` using `fileURLToPath`. `state.mjs` atomically writes mode-0600 JSON under `~/Library/Application Support/codextheme/state.json`; the schema contains only version, slug, and timestamp. Dependency injection allows tests to use a temp directory.

- [ ] **Step 4: Implement explicit restart consent**

`prompt.mjs` returns false for non-TTY streams. In a TTY it prints:

```text
Codex 需要重新打开才能完整应用主题。未发送的输入可能丢失。
现在重新打开 Codex？[y/N]
```

Only the normalized exact input `y` returns true.

- [ ] **Step 5: Implement runtime facade and lifecycle**

The production facade imports the public API from `@codextheme/runtime`. It reads/lints/resolves the package, detects installed/running/ready state, calls `applySkin({ launch: true, restartExisting })`, maps runtime errors to stable public codes, and writes state only after every returned target passes. `restore` uses the runtime restore result and deletes state only when renderer/host restoration is complete or already absent.

- [ ] **Step 6: Implement CLI entry and package manifest**

`bin.mjs` checks Node 22.4 before dynamically importing `main.mjs`. Package manifest:

```json
{
  "name": "@codextheme/cli",
  "version": "0.1.0",
  "type": "module",
  "license": "Apache-2.0",
  "bin": { "codextheme": "src/bin.mjs" },
  "files": ["src", "themes", "README.md", "LICENSE", "NOTICE"],
  "dependencies": { "@codextheme/runtime": "0.1.0" },
  "engines": { "node": ">=22.4" },
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" }
}
```

No lifecycle script is allowed.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -w @codextheme/cli
npm run typecheck -w @codextheme/runtime
git add packages/cli package.json package-lock.json
git commit -m "feat: add one-command theme CLI"
```

## Task 4: Build the traffic-first static site

**Files:**
- Create: `apps/site/src/page.mjs`
- Create: `apps/site/src/styles.css`
- Create: `apps/site/src/copy.js`
- Create: `apps/site/scripts/build.mjs`
- Create: `apps/site/tests/build.test.mjs`
- Create: `apps/site/package.json`

- [ ] **Step 1: Write the failing static build test**

Build into a temporary directory and assert:

```js
assert.equal(await exists("index.html"), true);
for (const slug of slugs) assert.equal(await exists(`themes/${slug}/index.html`), true);
assert.equal(count(themeHtml, 'data-copy-command'), 1);
assert.match(themeHtml, /@codextheme\/cli@0\.1\.0 apply midnight-circuit/);
assert.doesNotMatch(themeHtml, /安装 Skill|\.pkg|curl \| bash|@latest/);
```

- [ ] **Step 2: Implement escaped, deterministic page generation**

`page.mjs` exports HTML escape, layout, home page, theme page, security page, and help page functions. Every curated page has canonical metadata, Chinese title/description, Home/Session preview frames, adjacent Node/session/restart disclosure, one copy button, footer links, non-affiliation notice, and no raw user input.

- [ ] **Step 3: Implement the visual system**

Use a near-black editorial layout with restrained violet/red/cyan accents, large readable type, layered preview windows, opaque content surfaces, visible keyboard focus, responsive single-column mobile layout, and reduced-motion rules. Theme previews use the real generated hero/session images.

- [ ] **Step 4: Implement copy behavior**

`copy.js` reads only `data-command` from the page's single button, calls Clipboard API, changes the label to `已复制，去 Terminal 粘贴并回车`, and restores the original label after 2.5 seconds. It never downloads or executes code.

- [ ] **Step 5: Build, test, and commit**

```bash
npm test -w @codextheme/site
npm run site:build
git add apps/site package.json package-lock.json
git commit -m "feat: add traffic-first theme gallery"
```

## Task 5: Add package and repository release checks

**Files:**
- Create: `scripts/check-packages.mjs`
- Modify: `README.md`
- Modify: root `package.json`

- [ ] **Step 1: Implement fail-closed package inspection**

`check-packages.mjs` runs `npm pack --json --dry-run` for runtime and CLI, rejects install/preinstall/postinstall scripts, checks exact public names/versions, requires LICENSE/NOTICE/README, requires exactly three theme packages in CLI, and scans all shipped text for `BEGIN PRIVATE KEY`, `/Users/`, `curl | bash`, `@codedrobe/core` dependency, and non-loopback CDP address strings.

- [ ] **Step 2: Document trust and scope honestly**

Root README shows the fixed command, three themes, source relationship to CodeDrobe Core 0.3.0, Apache notices, macOS/Node requirements, session scope, explicit restart consent, restore command, and non-affiliation. It must not claim permanent installation, official endorsement, full upstream independence, Windows support, or custom upload.

- [ ] **Step 3: Run the full local gate and commit**

```bash
npm run check
git diff --check
git add scripts README.md package.json package-lock.json
git commit -m "build: add MVP release gates"
```

Expected: runtime tests, CLI tests, catalog tests, site tests/build, typecheck, theme pack/lint, and npm pack inspection all pass.

## Task 6: Verify on real Codex Desktop

**Files:**
- Create: `docs/qa/2026-07-18-macos-smoke.md`

- [ ] **Step 1: Test from the local packed CLI**

Pack both workspaces, install runtime and CLI tarballs into one temporary npm prefix, then run the installed `codextheme` binary. Do not depend on unpublished registry packages.

- [ ] **Step 2: Execute the five approved scenarios**

Record PASS/FAIL for closed apply, running cancel, running approve, offline reapply, and double restore. Check `lsof -nP -iTCP:9335 -sTCP:LISTEN` and require loopback only. Do not commit screenshots, username, paths, conversation text, or tokens.

- [ ] **Step 3: Fix failures and rerun the complete gate**

No workaround may skip runtime verification, restart consent, or restore. After fixes, run `npm run check` again.

- [ ] **Step 4: Commit the sanitized QA record**

```bash
git add docs/qa/2026-07-18-macos-smoke.md
git commit -m "test: verify Codex theme lifecycle on macOS"
```

## Task 7: Publish public source and npm 0.1.0

**Files:**
- Modify: package manifests only if registry validation requires metadata corrections

- [ ] **Step 1: Verify external ownership**

Run:

```bash
gh auth status
npm whoami
npm org ls codextheme --json
npm view @codextheme/runtime name
npm view @codextheme/cli name
```

Expected: GitHub user can push `kRadius/codextheme`, npm user is a `codextheme` org owner/developer, and both package lookups return 404 before first publish.

- [ ] **Step 2: Push the audited source**

```bash
git push -u origin main
```

Expected: public repository HEAD equals local HEAD.

- [ ] **Step 3: Publish runtime, then CLI**

```bash
npm publish -w @codextheme/runtime --access public --provenance
npm publish -w @codextheme/cli --access public --provenance
```

If local provenance is rejected, publish with interactive 2FA but never create a long-lived automation token; configure trusted publishing immediately after 0.1.0 exists.

- [ ] **Step 4: Smoke fixed registry bytes**

```bash
NPM_CONFIG_CACHE=$(mktemp -d) npx --yes @codextheme/cli@0.1.0 --version
npm view @codextheme/runtime@0.1.0 dist.integrity
npm view @codextheme/cli@0.1.0 dist.integrity
```

Expected: version `0.1.0` and integrity metadata for both immutable packages.

## Task 8: Deploy the site and bind codextheme.tech

**Files:**
- Create through Sites: `.openai/hosting.json`

- [ ] **Step 1: Run the production static build from pushed HEAD**

```bash
npm run site:build
git status --short
```

Expected: only ignored/generated `apps/site/dist` content or a clean tree, and no secret.

- [ ] **Step 2: Create/save/deploy one Sites project**

Create the site once, persist its exact project ID in `.openai/hosting.json`, save a version from the pushed commit/archive, deploy that saved version publicly, and wait for terminal `active` status.

- [ ] **Step 3: Add the apex custom domain**

Add hostname `codextheme.tech`, return exact validation/A records to the owner, and poll only after the owner confirms DNS changes. Do not invent targets or replace existing unrelated DNS records.

- [ ] **Step 4: Run public smoke tests**

Require HTTPS homepage, one theme page, one copy command pinned to 0.1.0, security/help pages, sitemap, robots, and registry CLI version. The site must not claim npm availability before registry smoke succeeds.

- [ ] **Step 5: Commit hosting metadata and push**

```bash
git add .openai/hosting.json
git commit -m "ops: configure codextheme site hosting"
git push origin main
```

## Completion gate

- [ ] Public source contains the preserved Apache-2.0 baseline and explicit modifications.
- [ ] `@codextheme/runtime@0.1.0` and `@codextheme/cli@0.1.0` are immutable, public, and clean-cache runnable.
- [ ] Three original theme packages pass runtime read/lint.
- [ ] apply/reapply/restore pass automated and real macOS checks.
- [ ] Website has three curated theme pages and one CTA per page.
- [ ] `codextheme.tech` serves the pushed build over HTTPS.
- [ ] No npm/GitHub token, private key, user upload, copyrighted image, absolute user path, or real Codex content exists in Git or npm tarballs.
