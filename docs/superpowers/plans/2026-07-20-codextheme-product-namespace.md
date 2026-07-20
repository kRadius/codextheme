# CodexTheme Product Namespace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every newly generated or user-visible theme artifact uses CodexTheme naming while old CodeDrobe-format themes, renderer state, and backups remain recoverable.

**Architecture:** Introduce one canonical CodexTheme contract in the runtime, normalize legacy packages at read boundaries, and make all current writers and renderer ownership markers emit the canonical namespace. Keep old names inside explicit cleanup and migration paths, then add a release guard that scans product outputs without rejecting required Apache attribution.

**Tech Stack:** Node.js 22 ESM, Node test runner, npm workspaces, Next.js 16, TypeScript, JSON theme packages, Chromium renderer expressions.

---

### Task 1: Canonical package format with legacy input normalization

**Files:**
- Modify: `packages/runtime/src/theme/package.mjs`
- Modify: `packages/runtime/src/index.mjs`
- Modify: `packages/runtime/types/index.d.ts`
- Test: `packages/runtime/tests/theme-package.test.mjs`

- [ ] **Step 1: Write failing canonical and legacy-format tests**

Add assertions that `THEME_FORMAT === "codextheme-theme"`, `buildThemePackage()` serializes that value, and an input bundle with `format: "codedrobe-theme"` is accepted and returned as a cloned canonical bundle. Also assert unknown formats still fail.

```js
assert.equal(THEME_FORMAT, "codextheme-theme");
assert.equal((await buildThemePackage(exampleManifest.pathname)).bundle.format, THEME_FORMAT);
const normalized = normalizeThemePackage({ ...legacyBundle, format: LEGACY_THEME_FORMAT });
assert.equal(normalized.format, THEME_FORMAT);
assert.notEqual(normalized, legacyBundle);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/runtime/tests/theme-package.test.mjs`

Expected: FAIL because `THEME_FORMAT` is still `codedrobe-theme` and `normalizeThemePackage` is not exported.

- [ ] **Step 3: Implement canonical validation and legacy normalization**

Define and export both format constants, normalize only the historical format, validate the normalized object, and have `readThemePackage()` and `resolveThemeTarget()` use the normalized value.

```js
export const THEME_FORMAT = "codextheme-theme";
export const LEGACY_THEME_FORMAT = "codedrobe-theme";

export function normalizeThemePackage(bundle) {
  if (bundle?.format === THEME_FORMAT) return bundle;
  if (bundle?.format === LEGACY_THEME_FORMAT) return { ...bundle, format: THEME_FORMAT };
  throw new Error(`Unsupported theme format '${bundle?.format ?? "missing"}'.`);
}
```

Update runtime exports and declaration literals to expose the canonical contract while typing the accepted legacy input.

- [ ] **Step 4: Run runtime package and type tests and verify GREEN**

Run: `node --test packages/runtime/tests/theme-package.test.mjs && npm run typecheck -w @codextheme/runtime`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/theme/package.mjs packages/runtime/src/index.mjs packages/runtime/types/index.d.ts packages/runtime/tests/theme-package.test.mjs
git commit -m "feat(runtime): emit CodexTheme package format"
```

### Task 2: CodexTheme renderer ownership with legacy cleanup

**Files:**
- Create: `packages/runtime/src/runtime/legacy-namespace.mjs`
- Modify: `packages/runtime/src/runtime/renderer-payload.mjs`
- Modify: `packages/runtime/src/runtime/profiles/codex-theme-v1.mjs`
- Modify: `packages/runtime/src/runtime/dom-snapshot.mjs`
- Test: `packages/runtime/tests/renderer-payload.test.mjs`
- Test: `packages/runtime/tests/codex-renderer-profile.test.mjs`
- Test: `packages/runtime/tests/dom-snapshot.test.mjs`

- [ ] **Step 1: Write failing renderer namespace tests**

Assert apply expressions contain the canonical ownership markers and no old state creation, while remove expressions still contain explicit historical cleanup strings.

```js
assert.match(expression, /codextheme-host-workbuddy/);
assert.match(expression, /codextheme-theme-style-/);
assert.match(expression, /__CODEXTHEME__/);
assert.doesNotMatch(expression, /const rootState = window\.__CODEDROBE__/);
assert.match(buildRemoveExpression(adapter), /__CODEDROBE__/);
```

For the Codex profile, assert `codextheme-codex-skin`, `codextheme-codex-skin-chrome`, and CodexTheme datasets are installed and old markers are removed during cleanup.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test packages/runtime/tests/renderer-payload.test.mjs packages/runtime/tests/codex-renderer-profile.test.mjs packages/runtime/tests/dom-snapshot.test.mjs`

Expected: FAIL on old ownership markers.

- [ ] **Step 3: Implement the canonical renderer namespace**

Use these values for every new apply:

```js
const rootState = window.__CODEXTHEME__ ||= { hosts: {} };
const styleId = 'codextheme-theme-style-' + host.id;
root.classList.add('codextheme-theme', host.className);
root.dataset.codexthemeHost = host.id;
root.style.setProperty('--codextheme-image-' + name, 'url("' + imageUrl + '")');
```

Move historical marker strings into `legacy-namespace.mjs` helpers used only by apply pre-cleanup, remove, and profile cleanup. Keep current profile creation and verification free of old names.

- [ ] **Step 4: Run focused runtime tests and verify GREEN**

Run: `node --test packages/runtime/tests/renderer-payload.test.mjs packages/runtime/tests/codex-renderer-profile.test.mjs packages/runtime/tests/dom-snapshot.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/runtime packages/runtime/tests/renderer-payload.test.mjs packages/runtime/tests/codex-renderer-profile.test.mjs packages/runtime/tests/dom-snapshot.test.mjs
git commit -m "feat(runtime): own renderer state under CodexTheme"
```

### Task 3: CodexTheme public errors and backup paths

**Files:**
- Modify: `packages/runtime/src/runtime/skin.mjs`
- Modify: `packages/runtime/src/runtime/launcher.mjs`
- Modify: `packages/runtime/src/runtime/injector.mjs`
- Modify: `packages/runtime/src/host/codex-settings.mjs`
- Modify: `packages/cli/src/lifecycle.mjs`
- Modify: `packages/cli/src/runtime.mjs`
- Test: `packages/runtime/tests/skin.test.mjs`
- Test: `packages/runtime/tests/launcher.test.mjs`
- Test: `packages/runtime/tests/injector.test.mjs`
- Test: `packages/runtime/tests/codex-settings.test.mjs`
- Test: `packages/cli/tests/lifecycle.test.mjs`
- Test: `packages/cli/tests/runtime.test.mjs`

- [ ] **Step 1: Write failing error and migration tests**

Assert public errors use `CODEXTHEME_*`; default backup paths use `CodexTheme/config.before-codextheme.toml`; restore falls back to `CodeDrobe/config.before-codedrobe.toml` only when the new backup is absent.

```js
assert.equal(error.code, "CODEXTHEME_RESTART_REQUIRED");
assert.match(defaults.backupPath, /CodexTheme\/config\.before-codextheme\.toml$/);
assert.equal(restored.legacyBackup, true);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test packages/runtime/tests/skin.test.mjs packages/runtime/tests/launcher.test.mjs packages/runtime/tests/injector.test.mjs packages/runtime/tests/codex-settings.test.mjs packages/cli/tests/lifecycle.test.mjs packages/cli/tests/runtime.test.mjs`

Expected: FAIL because error codes and backup defaults still use the old namespace.

- [ ] **Step 3: Rename current public codes and add backup fallback**

Change current errors to `CODEXTHEME_RESTART_REQUIRED`, `CODEXTHEME_DOM_INCOMPATIBLE`, `CODEXTHEME_VERIFY_FAILED`, and `CODEXTHEME_TARGET_TIMEOUT`. Compute both backup paths, write only the new path, and read legacy backup only after an `ENOENT` on the new path.

```js
return {
  configPath,
  backupPath: path.join(currentRoot, "config.before-codextheme.toml"),
  legacyBackupPath: path.join(legacyRoot, "config.before-codedrobe.toml"),
};
```

- [ ] **Step 4: Run focused runtime and CLI tests and verify GREEN**

Run: `node --test packages/runtime/tests/skin.test.mjs packages/runtime/tests/launcher.test.mjs packages/runtime/tests/injector.test.mjs packages/runtime/tests/codex-settings.test.mjs packages/cli/tests/lifecycle.test.mjs packages/cli/tests/runtime.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src packages/runtime/tests packages/cli/src/lifecycle.mjs packages/cli/src/runtime.mjs packages/cli/tests/lifecycle.test.mjs packages/cli/tests/runtime.test.mjs
git commit -m "feat: expose CodexTheme lifecycle identity"
```

### Task 4: Canonical CSS for catalog and private themes

**Files:**
- Modify: `themes/shared/codex.css`
- Modify: `apps/site/app/lib/private-skin-package.mjs`
- Modify: `packages/cli/src/runtime.mjs`
- Modify: `packages/cli/tests/private-source.test.mjs`
- Modify: `packages/cli/tests/runtime.test.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`
- Modify: `apps/site/tests/private-skin-service.test.mjs`
- Modify: `themes/tests/background-anchor.test.mjs`

- [ ] **Step 1: Write failing generator tests**

Assert generated private packages and the shared catalog CSS contain `codextheme-codex-skin`, `#codextheme-codex-skin-chrome`, and `--codextheme-image-*`, with no case-insensitive `codedrobe` match.

```js
assert.equal(bundle.format, "codextheme-theme");
assert.match(bundle.targets.codex.css, /html\.codextheme-codex-skin/);
assert.doesNotMatch(JSON.stringify(bundle), /codedrobe/i);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test packages/cli/tests/private-source.test.mjs packages/cli/tests/runtime.test.mjs apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs themes/tests/background-anchor.test.mjs`

Expected: FAIL on the old CSS namespace and format.

- [ ] **Step 3: Rename current source CSS and private generators**

Replace current selectors and image variables with the canonical contract. Keep `packages/cli/src/runtime.mjs` capable of recognizing and converting cached historical private CSS, but emit canonical CSS after conversion.

```css
:root.codextheme-codex-skin { color-scheme: dark !important; }
html.codextheme-codex-skin body::before { background-image: var(--codextheme-image-session-bg); }
#codextheme-codex-skin-chrome { pointer-events: none; }
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test packages/cli/tests/private-source.test.mjs packages/cli/tests/runtime.test.mjs apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs themes/tests/background-anchor.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add themes/shared/codex.css themes/tests/background-anchor.test.mjs apps/site/app/lib/private-skin-package.mjs apps/site/tests packages/cli/src/runtime.mjs packages/cli/tests/private-source.test.mjs packages/cli/tests/runtime.test.mjs
git commit -m "feat: generate CodexTheme-owned skin CSS"
```

### Task 5: Rebuild and verify bundled themes

**Files:**
- Generate: `packages/cli/themes/*.codextheme-theme`
- Test: `themes/tests/background-anchor.test.mjs`
- Test: `packages/cli/tests/main.test.mjs`

- [ ] **Step 1: Add a failing catalog artifact assertion**

Read each bundled `.codextheme-theme`, assert `format === "codextheme-theme"`, and reject `/codedrobe/i` in the serialized product package.

- [ ] **Step 2: Run catalog tests and verify RED**

Run: `node --test themes/tests/*.test.mjs packages/cli/tests/main.test.mjs`

Expected: FAIL because checked-in artifacts still contain historical format and CSS markers.

- [ ] **Step 3: Rebuild catalog themes**

Run: `npm run themes:build`

Expected: six available themes are packed using the canonical runtime writer.

- [ ] **Step 4: Run catalog tests and verify GREEN**

Run: `node --test themes/tests/*.test.mjs packages/cli/tests/main.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/themes themes/tests packages/cli/tests/main.test.mjs
git commit -m "build: repack catalog themes as CodexTheme artifacts"
```

### Task 6: Product-output release guard

**Files:**
- Modify: `scripts/check-packages.mjs`
- Create: `scripts/check-product-namespace.mjs`
- Modify: `package.json`
- Test: `scripts/tests/product-namespace.test.mjs`

- [ ] **Step 1: Write a failing scanner test**

Create temporary clean, leaky, and attribution fixtures. Assert a product file containing `CodeDrobe` fails, while `LICENSE`, `NOTICE`, and `UPSTREAM.md` are excluded.

```js
await assert.rejects(() => assertCodexThemeProductNamespace(leakyRoot), /CodeDrobe/);
await assert.doesNotReject(() => assertCodexThemeProductNamespace(attributionOnlyRoot));
```

- [ ] **Step 2: Run the scanner test and verify RED**

Run: `node --test scripts/tests/product-namespace.test.mjs`

Expected: FAIL because the scanner module does not exist.

- [ ] **Step 3: Implement and wire the scanner**

Scan bundled themes, private-generator output fixtures, normal CLI output fixtures, website build HTML, and npm pack text files. Exclude only explicit attribution documents and named legacy migration modules/tests.

```js
const PRODUCT_LEAK = /codedrobe/i;
if (PRODUCT_LEAK.test(source)) throw new Error(`Product namespace leak in ${filename}`);
```

Add the scanner to the root `check` command after builds and package checks.

- [ ] **Step 4: Run scanner and package checks and verify GREEN**

Run: `node --test scripts/tests/product-namespace.test.mjs && node scripts/check-packages.mjs && node scripts/check-product-namespace.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-packages.mjs scripts/check-product-namespace.mjs scripts/tests/product-namespace.test.mjs package.json
git commit -m "test: block legacy names from product outputs"
```

### Task 7: Full verification and release notes

**Files:**
- Modify: `README.md`
- Modify: `packages/runtime/README.md`
- Modify: `packages/runtime/README_zh.md`
- Modify: `packages/cli/README.md`
- Modify: `docs/superpowers/specs/2026-07-20-codextheme-product-namespace-design.md`

- [ ] **Step 1: Update user-facing documentation**

Document the canonical `.codextheme-theme` contract and state that historical packages are read through a compatibility layer. Keep the Apache attribution and `UPSTREAM.md` link intact.

- [ ] **Step 2: Scan documentation boundaries**

Run: `rg -n -i "codedrobe" README.md packages/*/README* apps/site/app themes packages/cli/themes`

Expected: Matches only in the root/runtime provenance paragraphs and explicitly documented legacy compatibility text; no match in site, theme, or normal CLI product content.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm run check`

Expected: all runtime, CLI, theme, website, typecheck, build, package, and namespace checks pass with exit code 0.

- [ ] **Step 4: Inspect the final diff and commit**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended migration files.

```bash
git add README.md packages/runtime/README.md packages/runtime/README_zh.md packages/cli/README.md docs/superpowers/specs/2026-07-20-codextheme-product-namespace-design.md
git commit -m "docs: document CodexTheme compatibility boundary"
```
