# Private Custom Skin Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home-page featured-theme pitch with a private image-to-Codex-skin studio whose generated theme can be applied, reapplied offline, and restored through one pinned npm command.

**Architecture:** The browser performs local preview and bounded image export; a Next.js Node route re-decodes the image, builds a data-only theme package, and stores one unguessable expiring object in private Vercel Blob. CLI 0.2.0 retrieves only from the fixed production origin, validates and caches the package locally, then reuses the existing verified apply/restore runtime.

**Tech Stack:** Next.js 16 App Router, React 19, Canvas, Sharp, Vercel Blob private storage and Cron, Node.js 22 test runner, existing `@codextheme/runtime`, npm workspaces, GA4.

---

## File Map

### Site: shared rules and package construction

- Create `apps/site/app/lib/private-skin-schema.mjs`: normalized settings, ID/expiry parsing, size limits, and safe validation.
- Create `apps/site/app/lib/private-skin-palette.mjs`: deterministic RGB palette and contrast helpers shared by browser-facing code.
- Create `apps/site/app/lib/private-skin-package.mjs`: server-side CSS and data-only package construction.
- Create `apps/site/tests/private-skin-schema.test.mjs`: pure schema, ID, palette, and package tests.

### Site: storage and API

- Create `apps/site/app/lib/private-skin-service.mjs`: image normalization, Blob operations, creation, retrieval, and cleanup behind injectable dependencies.
- Create `apps/site/app/api/private-skins/route.ts`: multipart creation route.
- Create `apps/site/app/api/private-skins/[id]/route.ts`: private package delivery route.
- Create `apps/site/app/api/private-skins/cleanup/route.ts`: protected daily cleanup route.
- Create `apps/site/tests/private-skin-service.test.mjs`: service tests with in-memory Blob doubles.
- Create `vercel.json`: daily Cron registration.

### Site: browser studio and home page

- Create `apps/site/app/lib/browser-image.mjs`: client image validation, canvas export, palette sampling, and settings normalization.
- Create `apps/site/app/components/CodexMockup.tsx`: realistic Home/Session preview driven only by normalized values.
- Create `apps/site/app/components/CustomSkinStudio.tsx`: sample/editing/creating/ready state machine and controls.
- Modify `apps/site/app/page.tsx`: studio-first hero and gallery demotion.
- Modify `apps/site/app/globals.css`: studio, mockup, controls, responsive, focus, and reduced-motion styles.
- Modify `apps/site/app/components/SiteChrome.tsx`: `Create a skin` navigation.
- Modify `apps/site/app/lib/analytics.mjs`: privacy-safe studio conversion events.
- Modify `apps/site/app/security/page.tsx` and `apps/site/app/help/page.tsx`: temporary retention, local cache, and private apply help.
- Modify `apps/site/app/layout.tsx`: custom-skin-first metadata.
- Modify `apps/site/tests/analytics.test.mjs` and `apps/site/tests/rendered-html.test.mjs`: SEO, copy, event, and command assertions.

### CLI

- Create `packages/cli/src/private-source.mjs`: fixed-origin fetch, timeout, response cap, hash, and bundle parsing.
- Create `packages/cli/src/cache.mjs`: owner-only atomic package cache.
- Create `packages/cli/tests/private-source.test.mjs`: local-server download safety tests.
- Create `packages/cli/tests/cache.test.mjs`: atomic cache and permissions tests.
- Modify `packages/cli/src/state.mjs`: backward-compatible state schema two.
- Modify `packages/cli/src/runtime.mjs`: validated in-memory bundle loading.
- Modify `packages/cli/src/lifecycle.mjs`: apply a resolved private bundle and offline private reapply.
- Modify `packages/cli/src/main.mjs`: `apply-private` command and safe errors.
- Modify `packages/cli/tests/main.test.mjs`, `packages/cli/tests/lifecycle.test.mjs`, and `packages/cli/tests/state-prompt.test.mjs`: private lifecycle coverage.
- Modify `packages/cli/package.json`, `packages/cli/README.md`, root `README.md`, `apps/site/app/security/page.tsx`, `apps/site/app/help/page.tsx`, and `scripts/check-packages.mjs`: pin 0.2.0.

## Task 1: Lock the Private-skin Data Contract

**Files:**
- Create: `apps/site/app/lib/private-skin-schema.mjs`
- Create: `apps/site/app/lib/private-skin-palette.mjs`
- Test: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Write failing contract tests**

Cover the exact public settings and token form:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PROCESSED_IMAGE_BYTES,
  normalizePrivateSkinSettings,
  createPrivateSkinId,
  parsePrivateSkinId,
} from "../app/lib/private-skin-schema.mjs";
import { derivePalette } from "../app/lib/private-skin-palette.mjs";

test("settings clamp to the four editor controls", () => {
  assert.deepEqual(normalizePrivateSkinSettings({
    visibility: 200, overlay: -2, blur: 99, zoom: 120, positionX: 40, positionY: 65,
  }), {
    visibility: 100, overlay: 0, blur: 16, zoom: 120, positionX: 40, positionY: 65,
  });
  assert.equal(MAX_PROCESSED_IMAGE_BYTES, 1_200_000);
});

test("private ids expose expiry but retain 192 bits of randomness", () => {
  const id = createPrivateSkinId({ now: new Date("2026-07-19T00:00:00Z"), randomBytes: Buffer.alloc(24, 7) });
  const parsed = parsePrivateSkinId(id);
  assert.equal(parsed.expiresAt.toISOString(), "2026-07-20T00:00:00.000Z");
  assert.match(id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
});

test("palette remains dark and readable", () => {
  const palette = derivePalette({ red: 210, green: 70, blue: 120 });
  assert.match(palette.accent, /^#[0-9a-f]{6}$/);
  assert.match(palette.surface, /^#[0-9a-f]{6}$/);
  assert.ok(palette.contrast >= 60);
});
```

- [ ] **Step 2: Run the tests and verify missing-module failure**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the closed schema and palette helpers**

Use constants `10_000_000` source bytes, `1_200_000` processed bytes, 800×500 minimum, 1920×1200 output bounds, and 24-hour logical expiry. `normalizePrivateSkinSettings` must coerce only finite numbers and return exactly the six documented keys. `createPrivateSkinId` must emit `<expiry-base36>.<24-byte-base64url>`; `parsePrivateSkinId` must reject every other form and return the expiry before any Blob lookup.

`derivePalette` must produce `accent`, `surface`, `ink`, and numeric `contrast` from a single RGB sample without external state.

- [ ] **Step 4: Run the focused tests**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add apps/site/app/lib/private-skin-schema.mjs apps/site/app/lib/private-skin-palette.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat: define private skin contract"
```

## Task 2: Build and Validate Data-only Theme Packages

**Files:**
- Create: `apps/site/app/lib/private-skin-package.mjs`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`
- Modify: `apps/site/package.json`

- [ ] **Step 1: Add a failing package test**

```js
import { lintThemePackage, resolveThemeTarget, validateThemePackage } from "@codextheme/runtime";
import { buildPrivateSkinPackage } from "../app/lib/private-skin-package.mjs";

test("generated packages contain only local images and safe Codex CSS", () => {
  const serialized = buildPrivateSkinPackage({
    id: "abc.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: normalizePrivateSkinSettings({}),
    palette: derivePalette({ red: 120, green: 80, blue: 200 }),
  });
  const bundle = validateThemePackage(JSON.parse(serialized));
  assert.deepEqual(lintThemePackage(bundle), []);
  const target = resolveThemeTarget(bundle, "codex");
  assert.deepEqual(Object.keys(target.imageDataUrls).sort(), ["hero", "session-bg"]);
  assert.doesNotMatch(target.css, /@import|url\(\s*["']?https?:/i);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs`

Expected: FAIL because `private-skin-package.mjs` is absent.

- [ ] **Step 3: Implement package generation**

Add `@codextheme/runtime: "0.1.0"` to the private site workspace. Build a schema-version-one JSON package containing two WebP image entries, `rendererProfile: "codex-theme-v1"`, the derived dark `baseTheme`, existing stable recommended verification selectors, and CSS with only interpolated normalized numbers and six-digit colors. Keep the serialized response under 3.8 MB and end it with one newline.

- [ ] **Step 4: Verify package tests and site typecheck**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs && npm run typecheck -w @codextheme/site`

Expected: PASS.

- [ ] **Step 5: Commit package generation**

```bash
git add apps/site/package.json package-lock.json apps/site/app/lib/private-skin-package.mjs apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat: build safe custom skin packages"
```

## Task 3: Implement Private Blob Service and Expiry

**Files:**
- Create: `apps/site/app/lib/private-skin-service.mjs`
- Create: `apps/site/tests/private-skin-service.test.mjs`
- Modify: `apps/site/package.json`

- [ ] **Step 1: Write service tests with memory-backed storage**

The injected Blob double must expose `put`, `get`, `list`, and `del`. Tests must prove:

```js
test("create re-encodes, stores one private package, and returns no blob url", async () => {
  const result = await service.create({ image: validFixture, settings: {}, now });
  assert.match(result.id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
  assert.deepEqual(Object.keys(result).sort(), ["command", "expiresAt", "id"]);
  assert.match(result.command, /^npx --yes @codextheme\/cli@0\.2\.0 apply-private /);
  assert.equal(blobs.size, 1);
});

test("retrieval rejects expiry before reading storage", async () => {
  await assert.rejects(() => service.retrieve(expiredId, later), { code: "E_EXPIRED" });
  assert.equal(calls.some(([name]) => name === "get"), false);
});

test("cleanup removes only expired private skin paths", async () => {
  assert.deepEqual(await service.cleanup(later), { scanned: 2, deleted: 1 });
});
```

Also cover malformed images, dimensions, unsupported settings, output above 1.2 MB, missing blobs, and a package response above 3.8 MB.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test apps/site/tests/private-skin-service.test.mjs`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement the service**

Add `@vercel/blob >=2.3` and `sharp` as explicit site dependencies. Export `createPrivateSkinService({ blob, imageProcessor, randomBytes })`. Use a pathname of `private-skins/<id>.codextheme-theme`, private access, immutable writes, and `cacheControlMaxAge: 60`. The real image processor must use `sharp(buffer).rotate().resize({ width: 1920, height: 1200, fit: "inside", withoutEnlargement: true }).webp(...)`, iterating quality and dimensions until output is at most 900 KB so the duplicated base64 package remains below the Vercel 4.5 MB response limit.

Cleanup must paginate `list({ prefix: "private-skins/", limit: 1000, cursor })`, parse expiry from each pathname, and pass expired URLs to `del` in bounded batches.

- [ ] **Step 4: Run service and package tests**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs apps/site/tests/private-skin-service.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit storage service**

```bash
git add apps/site/package.json package-lock.json apps/site/app/lib/private-skin-service.mjs apps/site/tests/private-skin-service.test.mjs
git commit -m "feat: add expiring private skin storage"
```

## Task 4: Expose Safe Next.js API Routes and Cron

**Files:**
- Create: `apps/site/app/api/private-skins/route.ts`
- Create: `apps/site/app/api/private-skins/[id]/route.ts`
- Create: `apps/site/app/api/private-skins/cleanup/route.ts`
- Create: `vercel.json`
- Modify: `apps/site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing route assertions**

Extend the production Next server test to assert:

```js
const malformed = await fetch(`${origin}/api/private-skins`, { method: "POST", body: new FormData() });
assert.equal(malformed.status, 400);
assert.deepEqual(await malformed.json(), { error: "invalid_upload" });

const invalidId = await fetch(`${origin}/api/private-skins/not-an-id`);
assert.equal(invalidId.status, 404);
assert.equal(invalidId.headers.get("cache-control"), "no-store");
```

Add a filesystem assertion that `vercel.json` contains one daily cron at `/api/private-skins/cleanup`.

- [ ] **Step 2: Verify the route tests fail**

Run: `npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: FAIL with 404 for the creation route.

- [ ] **Step 3: Implement the routes**

The creation route must require multipart `image` and `settings`, reject `Content-Length` above 4.4 MB before parsing, and map safe errors to `400`, `413`, or `503`. The retrieval route must parse expiry before Blob access and return `application/vnd.codextheme.theme+json`, `X-Content-Type-Options: nosniff`, `X-CodexTheme-SHA256`, and `Cache-Control: no-store`. It must return `410` for expired and `404` for unknown IDs.

The cleanup route must require `Authorization: Bearer ${process.env.CRON_SECRET}` and return `401` before any list operation when absent. Add:

```json
{
  "crons": [{ "path": "/api/private-skins/cleanup", "schedule": "17 3 * * *" }]
}
```

- [ ] **Step 4: Run route, build, and type checks**

Run: `npm run typecheck -w @codextheme/site && npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: PASS without `BLOB_READ_WRITE_TOKEN` because malformed and invalid-ID paths fail before storage access.

- [ ] **Step 5: Commit the API**

```bash
git add apps/site/app/api apps/site/tests/rendered-html.test.mjs vercel.json
git commit -m "feat: expose private skin api"
```

## Task 5: Build the Local Image Editor and Realistic Codex Preview

**Files:**
- Create: `apps/site/app/lib/browser-image.mjs`
- Create: `apps/site/app/components/CodexMockup.tsx`
- Create: `apps/site/app/components/CustomSkinStudio.tsx`
- Modify: `apps/site/app/globals.css`
- Modify: `apps/site/tests/private-skin-schema.test.mjs`

- [ ] **Step 1: Add failing pure browser-helper tests**

Test file-type and byte-size acceptance, clamping, focal-point conversion, deterministic palette samples, and the request serializer that emits only `image` and normalized `settings`.

```js
test("upload request omits filename, palette, and source metadata", () => {
  const body = buildPrivateSkinForm({ image: new Blob(["x"], { type: "image/webp" }), settings: {} });
  assert.deepEqual([...body.keys()], ["image", "settings"]);
});
```

- [ ] **Step 2: Verify the helper test fails**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs`

Expected: FAIL because `browser-image.mjs` is missing.

- [ ] **Step 3: Implement browser processing**

Decode with `createImageBitmap`, draw through canvas at no more than 1920×1200, sample a small offscreen canvas, and export WebP while reducing quality until at most 1.2 MB. Revoke old object URLs whenever a new file is selected or the component unmounts. Return accessible user messages for unsupported type, dimensions, decode failure, and processed-size failure.

- [ ] **Step 4: Implement `CodexMockup`**

Render a stable, non-interactive Codex shell with sidebar, header, prompt cards or session transcript, and composer. Drive image, accent, surface, visibility, overlay, blur, zoom, and focal point through CSS custom properties. Provide Home/Session tabs with pressed state and descriptive alt text; the mockup must never impersonate a live Codex control.

- [ ] **Step 5: Implement `CustomSkinStudio`**

Use one reducer for `sample | editing | creating | ready | error`. Keep the upload label dominant until selection, show the four compact controls only in editing, POST only after **Create private skin**, and show only the server-provided pinned command. Copying must use Clipboard API with fallback selection and a visible success label.

- [ ] **Step 6: Add responsive and accessible styles**

Preserve the editorial black/ivory aesthetic, use the existing typography, and avoid dashboard cards. Desktop uses a 0.8/1.2 editor-preview split; mobile stacks preview first after selection. Add `:focus-visible`, 44 px minimum controls, readable range outputs, no animation under reduced motion, and no layout shift when controls appear.

- [ ] **Step 7: Verify helpers, typecheck, lint, and build**

Run: `node --test apps/site/tests/private-skin-schema.test.mjs && npm run typecheck -w @codextheme/site && npm run lint -w @codextheme/site && npm run build -w @codextheme/site`

Expected: PASS.

- [ ] **Step 8: Commit the studio component**

```bash
git add apps/site/app/lib/browser-image.mjs apps/site/app/components/CodexMockup.tsx apps/site/app/components/CustomSkinStudio.tsx apps/site/app/globals.css apps/site/tests/private-skin-schema.test.mjs
git commit -m "feat: add custom skin studio"
```

## Task 6: Reframe the Home Page, SEO, Help, and Analytics

**Files:**
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/layout.tsx`
- Modify: `apps/site/app/components/SiteChrome.tsx`
- Modify: `apps/site/app/lib/analytics.mjs`
- Modify: `apps/site/app/security/page.tsx`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/tests/analytics.test.mjs`
- Modify: `apps/site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Write failing crawlability and analytics assertions**

The home HTML must contain `Turn any image into a Codex skin`, `custom Codex skin`, `Codex theme generator`, `No account`, `Private temporary upload`, `Need inspiration? Start with a ready-made skin`, all three theme links, support email, canonical metadata, and no temporary ID or unpublished command in server HTML.

Analytics tests must prove studio events accept only a fixed event name and error category:

```js
assert.equal(trackStudioEvent("custom_preview_ready", undefined, target), true);
assert.deepEqual(events[0], ["event", "custom_preview_ready", {}]);
assert.equal(trackStudioEvent("custom_create_error", "invalid_upload", target), true);
assert.deepEqual(events[1][2], { error_category: "invalid_upload" });
```

- [ ] **Step 2: Verify copy tests fail**

Run: `node --test apps/site/tests/analytics.test.mjs && npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: FAIL on the new studio copy.

- [ ] **Step 3: Replace the featured hero with the studio**

Render an English-first copy column and `CustomSkinStudio` above the fold. Move the three existing `ThemeCard` entries below under the inspiration heading. Keep a single installation strip and remove the GitHub submission block from the primary narrative; retain submission in the footer.

- [ ] **Step 4: Update metadata, navigation, safety, and help**

Use the title `Custom Codex Skin & Theme Generator | CodexTheme` and a description that explains real preview and one-command apply. Add `Create a skin` and `Gallery` anchors. Explain logical 24-hour expiry, next-window physical deletion, local CLI cache, image-rights responsibility, `reapply`, `restore`, and the support email without claiming end-to-end encryption.

- [ ] **Step 5: Add privacy-safe GA4 events**

Expose only the five fixed event names and normalized error categories. Never pass file name, type, dimensions, image bytes, theme ID, command, colors, slider values, or Blob URL.

- [ ] **Step 6: Run site verification**

Run: `npm run test -w @codextheme/site && npm run lint -w @codextheme/site && npm run typecheck -w @codextheme/site`

Expected: PASS.

- [ ] **Step 7: Commit the home-page reframing**

```bash
git add apps/site/app apps/site/tests
git commit -m "feat: lead home page with custom skins"
```

## Task 7: Add Safe Private Download and Local Cache to CLI

**Files:**
- Create: `packages/cli/src/private-source.mjs`
- Create: `packages/cli/src/cache.mjs`
- Create: `packages/cli/tests/private-source.test.mjs`
- Create: `packages/cli/tests/cache.test.mjs`

- [ ] **Step 1: Write failing fixed-origin download tests**

Use a local HTTP server only through an injected `origin` in tests. Cover a valid bounded response, invalid ID before fetch, 404, 410, 500, redirect rejection, timeout, response above 3.8 MB, incorrect media type, mismatched `X-CodexTheme-SHA256`, malformed JSON, runtime schema failure, and lint warnings.

```js
const result = await source.download(validId);
assert.equal(result.sha256, createHash("sha256").update(result.serialized).digest("hex"));
assert.equal(result.bundle.format, "codedrobe-theme");
```

- [ ] **Step 2: Write failing atomic cache tests**

Use a temporary fake home and assert owner-only directory/file modes, content-addressed filename, same-content idempotence, absent-key behavior, malformed-key rejection, and cleanup of temporary files after write failure.

- [ ] **Step 3: Verify both modules are missing**

Run: `node --test packages/cli/tests/private-source.test.mjs packages/cli/tests/cache.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Implement fixed-origin download**

Production origin is a module constant `https://codextheme.tech`; only tests may inject another origin. Use `AbortSignal.timeout(15_000)`, `redirect: "error"`, `Accept: application/vnd.codextheme.theme+json`, incremental streamed byte counting capped at 3.8 MB, and SHA-256 comparison. Before `validateThemePackage` and `lintThemePackage`, require the exact private-package root keys, one `codex` target, exactly `hero` and `session-bg` WebP images, and no unknown target, option, asset, or copy fields. Map errors without echoing IDs or bodies.

- [ ] **Step 5: Implement content-addressed cache**

Use `~/Library/Application Support/codextheme/private/<sha256>.codextheme-theme`, directory mode `0700`, file mode `0600`, atomic temp write and rename, and exact hash verification on every read. Export `write(serialized)`, `read(sha256)`, and `remove(sha256)`.

- [ ] **Step 6: Run the focused CLI tests**

Run: `node --test packages/cli/tests/private-source.test.mjs packages/cli/tests/cache.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit private source and cache**

```bash
git add packages/cli/src/private-source.mjs packages/cli/src/cache.mjs packages/cli/tests/private-source.test.mjs packages/cli/tests/cache.test.mjs
git commit -m "feat: download and cache private skins"
```

## Task 8: Integrate Private Apply, Offline Reapply, and State V2

**Files:**
- Modify: `packages/cli/src/state.mjs`
- Modify: `packages/cli/src/runtime.mjs`
- Modify: `packages/cli/src/lifecycle.mjs`
- Modify: `packages/cli/src/main.mjs`
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `packages/cli/tests/lifecycle.test.mjs`
- Modify: `packages/cli/tests/state-prompt.test.mjs`

- [ ] **Step 1: Write failing state compatibility tests**

Prove schema-one catalog state still reads, schema-two catalog/private states are closed, private state contains only `source`, `cacheKey`, and `appliedAt`, and IDs/URLs/absolute paths are rejected.

```js
assert.deepEqual(await store.read(), {
  schemaVersion: 2,
  source: "private",
  cacheKey: "a".repeat(64),
  appliedAt: timestamp,
});
```

- [ ] **Step 2: Write failing command and lifecycle tests**

Assert exact argv `apply-private <id>`, download and validation before Codex detection, cache before apply, state only after runtime verification, no network during private `reapply`, expired and invalid remote error mapping, restart consent behavior, and unchanged curated/restore paths.

- [ ] **Step 3: Verify the integration tests fail**

Run: `node --test packages/cli/tests/main.test.mjs packages/cli/tests/lifecycle.test.mjs packages/cli/tests/state-prompt.test.mjs`

Expected: FAIL because `apply-private` is still `E_USAGE`.

- [ ] **Step 4: Implement state schema two**

Keep schema-one parsing exactly backward compatible. Add closed catalog and private variants. Never persist the remote ID. Migrate to schema two only after a successful new apply.

- [ ] **Step 5: Add validated bundle loading to the runtime adapter**

Implement `loadThemeBundle(bundle)` using runtime `validateThemePackage`, `lintThemePackage`, and `resolveThemeTarget`. Leave `loadTheme(slug)` unchanged for bundled catalog themes.

- [ ] **Step 6: Generalize the apply lifecycle**

Extract the current detect/restart/apply/verify block into an internal `applyResolvedTheme({ theme, nextState, ... })`. Catalog apply supplies a catalog state; private apply supplies a cache state. Reapply branches only on parsed local state and never calls the private source.

- [ ] **Step 7: Add main-command wiring and safe messages**

Set version and all pinned recovery commands to `0.2.0`. Add help text for `apply-private`. Map `E_PRIVATE_NOT_FOUND`, `E_PRIVATE_EXPIRED`, `E_PRIVATE_DOWNLOAD`, `E_PRIVATE_INVALID`, and `E_PRIVATE_CACHE` to concise Chinese messages and exit code one without printing IDs, paths, URLs, response bodies, or stack traces.

- [ ] **Step 8: Run the full CLI suite**

Run: `npm test -w @codextheme/cli`

Expected: PASS, including unchanged curated-theme tests.

- [ ] **Step 9: Commit lifecycle integration**

```bash
git add packages/cli/src packages/cli/tests
git commit -m "feat: apply private skins through cli"
```

## Task 9: Prepare the 0.2.0 Release and Trusted Publishing

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/README.md`
- Modify: `README.md`
- Modify: `scripts/check-packages.mjs`
- Create: `.github/workflows/publish-cli.yml`

- [ ] **Step 1: Update release-check expectations first**

Change the expected CLI identity to `@codextheme/cli@0.2.0`, retain exact runtime `0.1.0`, verify the tarball includes `private-source.mjs` and `cache.mjs`, and continue rejecting lifecycle scripts, private keys, absolute user paths, and non-loopback debugging addresses.

- [ ] **Step 2: Bump metadata and documentation**

Set CLI version to `0.2.0`; document `apply-private`, fixed-origin retrieval, local owner-only cache, expiry, offline reapply, and restore. Do not claim private uploads are end-to-end encrypted or deleted at an exact physical second.

- [ ] **Step 3: Add a least-privilege trusted-publish workflow**

Use a manual `workflow_dispatch`, GitHub-hosted Ubuntu, Node 22.14+, npm 11.5.1+, `permissions: { contents: read, id-token: write }`, `npm ci`, full `npm run check`, a registry check that 0.2.0 is absent, and `npm publish -w @codextheme/cli --access public`. Do not add an npm token secret.

- [ ] **Step 4: Run release checks**

Run: `npm run check && npm pack --dry-run -w @codextheme/cli`

Expected: all tests/builds pass; tarball identity is `@codextheme/cli@0.2.0`; no install scripts.

- [ ] **Step 5: Commit the release preparation**

```bash
git add packages/cli/package.json packages/cli/README.md README.md scripts/check-packages.mjs .github/workflows/publish-cli.yml package-lock.json
git commit -m "chore: prepare cli 0.2.0 release"
```

- [ ] **Step 6: Configure the npm trusted publisher if absent**

In npm package settings for `@codextheme/cli`, configure GitHub Actions with organization/user `kRadius`, repository `codextheme`, workflow filename `publish-cli.yml`, and allowed action `npm publish`. This is the only owner-security interaction that may require the user's hardware key.

- [ ] **Step 7: Publish and verify the immutable package**

Run the workflow, then verify:

```bash
npm view @codextheme/cli@0.2.0 version dist.integrity --json
npx --yes @codextheme/cli@0.2.0 --version
```

Expected: registry version `0.2.0`, a non-empty integrity string, and CLI output `0.2.0`.

## Task 10: Configure Vercel, Deploy, and Smoke-test Production

**Files:**
- Modify only if required by project linking: no committed credentials.

- [ ] **Step 1: Run complete local verification from a clean install**

Run: `npm ci && npm run check && git diff --check && git status --short`

Expected: checks pass; only intentional plan-tracking or ignored local files remain.

- [ ] **Step 2: Visually inspect desktop and mobile locally**

Run the production site locally and inspect 1440×1000 and 390×844. Confirm the sample is compelling before upload, real selected images update both preview modes, controls do not shift the page unexpectedly, keyboard and focus behavior work, and the gallery remains below the studio.

- [ ] **Step 3: Create and link private Blob storage**

In the Vercel `codextheme-site` project, create a private Blob store named `codextheme-private-skins`. Confirm Vercel adds `BLOB_READ_WRITE_TOKEN` to Preview and Production. Add a random 32+ character `CRON_SECRET` to both environments. Never print, commit, or copy either value into chat or logs.

- [ ] **Step 4: Deploy a preview and test real storage**

Deploy the current commit to Vercel Preview. Upload a disposable image, create a theme, retrieve it once through the CLI test client, verify the Blob is private in a direct unauthenticated request, verify malformed/expired IDs, and invoke cleanup with the secret from Vercel rather than the shell history.

- [ ] **Step 5: Push, merge, and deploy production**

Push the implementation branch, merge only after CI passes, and confirm the Vercel production deployment uses the merge commit. The site must not expose the studio's production command until npm 0.2.0 exists.

- [ ] **Step 6: Run the real Codex smoke test**

On the current Mac: upload a disposable image on `https://codextheme.tech`, run the copied command, approve restart only when asked, inspect Home and Session, close Codex, disconnect network, run `reapply`, reconnect, run `restore` twice, and confirm official appearance.

- [ ] **Step 7: Verify observability, privacy, and indexing**

Confirm GA4 receives the five coarse events without private fields; API responses use no-store; the temporary route is absent from sitemap and robots-discoverable links; `https://codextheme.tech/sitemap.xml` still returns 200 XML; and GSC-submitted URLs remain the home, help, security, and permanent theme pages only.

- [ ] **Step 8: Record production evidence**

Add the deployed commit, npm integrity, production URL, smoke-test timestamp, and any follow-up constraints to the implementation plan's completion notes. Do not record a private skin ID, image, command, token, user path, or Vercel secret.
