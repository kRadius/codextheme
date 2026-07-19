# Home/Session Background Anchor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep uploaded and curated artwork anchored to one window-sized coordinate system when switching between Codex Home and Session.

**Architecture:** The existing fixed `body::before` layer remains the sole artwork renderer. A Home route selector changes only that layer's image from `session-bg` to `hero`; `.dream-home` keeps visual tinting without painting another image. Curated packages are rebuilt and released through the pinned CodexTheme CLI.

**Tech Stack:** CSS, Node.js test runner, Next.js, `@codextheme/runtime`, npm workspaces.

---

### Task 1: Lock the background-coordinate contract with failing tests

**Files:**
- Create: `themes/tests/background-anchor.test.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Add the curated-theme failing test**

Read `themes/shared/codex.css`, isolate the `.dream-home` rule, and assert that it does not reference `--codedrobe-image-hero`. Assert that a `body:has(.dream-home)::before` rule does reference `--codedrobe-image-hero`.

- [ ] **Step 2: Add the private-package failing assertions**

Extend `generated packages contain only local images and safe Codex CSS` to require `body:has(.dream-home)::before` to select the Home image and to reject a Home image reference inside the `.dream-home` rule.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs apps/site/tests/private-skin-schema.test.mjs
```

Expected: failures because both current CSS sources paint `hero` on `.dream-home`.

### Task 2: Move Home artwork onto the fixed window layer

**Files:**
- Modify: `themes/shared/codex.css`
- Modify: `apps/site/app/lib/private-skin-package.mjs`

- [ ] **Step 1: Update curated CSS minimally**

Add a `body:has(.dream-home)::before` override that uses the existing Home gradient plus `var(--codedrobe-image-hero)`. Change `.dream-home` so its background contains only the Home tint and no image.

- [ ] **Step 2: Update private custom-skin CSS minimally**

Add the equivalent Home override on `body::before`, retaining the exact generated position, cover sizing, blur, scale, opacity, and overlay values. Remove artwork, position, and sizing declarations from `.dream-home`.

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run:

```bash
node --test themes/tests/background-anchor.test.mjs apps/site/tests/private-skin-schema.test.mjs
```

Expected: all focused tests pass.

### Task 3: Repack and pin release 0.2.2

**Files:**
- Modify: `packages/cli/themes/*.codextheme-theme`
- Modify: `packages/cli/package.json`
- Modify: `package-lock.json`
- Modify: `packages/cli/src/main.mjs`
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `themes/catalog.json`
- Modify: `tests/catalog.test.mjs`
- Modify: `apps/site/app/lib/private-skin-service.mjs`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/security/page.tsx`
- Modify: `apps/site/tests/install-copy.test.mjs`
- Modify: `scripts/check-packages.mjs`
- Modify: `README.md`
- Modify: `packages/cli/README.md`

- [ ] **Step 1: Repack curated artifacts**

Run:

```bash
node themes/scripts/pack.mjs
```

Expected: all available themes are packed and verified with the new shared CSS.

- [ ] **Step 2: Pin all public commands to 0.2.2**

Update the CLI version, lockfile workspace version, catalog commands, reapply/restore output, website-generated private commands, help/security/detail copy, package audit expectation, READMEs, and their exact-version tests from `0.2.1` to `0.2.2`.

- [ ] **Step 3: Run CLI, catalog, and site tests**

Run:

```bash
node --test tests/catalog.test.mjs packages/cli/tests/main.test.mjs apps/site/tests/install-copy.test.mjs apps/site/tests/private-skin-schema.test.mjs
```

Expected: all selected tests pass and every generated command is pinned to `@codextheme/cli@0.2.2`.

### Task 4: Verify and prepare release

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run full verification**

Run outside the restricted network sandbox because existing tests bind loopback ports:

```bash
npm run check
```

Expected: typecheck, theme tests, CLI tests, runtime tests, site build/tests, artifact build, and package audit all pass.

- [ ] **Step 2: Inspect the package payload**

Run:

```bash
npm pack -w @codextheme/cli --dry-run
```

Expected: version `0.2.2`, curated theme artifacts included, no install scripts, and no unrelated files.

- [ ] **Step 3: Commit the implementation**

```bash
git add themes apps/site packages/cli package-lock.json scripts/check-packages.mjs tests/catalog.test.mjs README.md docs/superpowers
git commit -m "fix: anchor Codex backgrounds across routes"
```

- [ ] **Step 4: Publish and production-verify after merge**

Publish `@codextheme/cli@0.2.2`, push the branch, merge it, wait for Vercel production, confirm `codextheme.tech` serves pinned `0.2.2` commands, and apply a new private skin through the published CLI. Inspect Home and a normal task for identical artwork anchoring.
