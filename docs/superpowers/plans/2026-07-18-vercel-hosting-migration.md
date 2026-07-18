# Vercel Hosting Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/site` from the OpenAI Sites Vinext/Cloudflare Worker build to a native Next.js application that Vercel can detect and deploy without custom commands.

**Architecture:** Keep the existing App Router pages and public assets unchanged. Replace only the hosting adapter, exercise the production `.next` output through a real Next server in tests, and leave the current Sites deployment and DNS untouched for rollback.

**Tech Stack:** Next.js 16, React 19, Node.js 22, npm workspaces, Node built-in test runner, Vercel.

---

### Task 1: Specify the native Next.js deployment contract

**Files:**
- Create: `apps/site/tests/vercel-config.test.mjs`
- Modify: `apps/site/tests/rendered-html.test.mjs`

- [ ] **Step 1: Write a failing configuration test**

Create `apps/site/tests/vercel-config.test.mjs`:

```js
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const siteRoot = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("package.json", siteRoot), "utf8"),
);
const nextConfigSource = await readFile(
  new URL("next.config.ts", siteRoot),
  "utf8",
);
const gitignoreSource = await readFile(new URL(".gitignore", siteRoot), "utf8");

test("site uses the native Next.js commands Vercel detects", () => {
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
});

test("site has no Cloudflare or Vinext build dependencies", () => {
  for (const dependency of [
    "@cloudflare/vite-plugin",
    "@vitejs/plugin-react",
    "@vitejs/plugin-rsc",
    "react-server-dom-webpack",
    "vinext",
    "vite",
    "wrangler",
  ]) {
    assert.equal(packageJson.dependencies?.[dependency], undefined);
    assert.equal(packageJson.devDependencies?.[dependency], undefined);
  }
});

test("site has no hosting-specific Worker build entry points", async () => {
  for (const pathname of [
    "vite.config.ts",
    "worker/index.ts",
    "build/sites-vite-plugin.ts",
  ]) {
    await assert.rejects(
      access(new URL(pathname, siteRoot)),
      (error) => error?.code === "ENOENT",
    );
  }
});

test("site pins the monorepo root and uses its single package lock", async () => {
  assert.match(nextConfigSource, /turbopack:\s*\{/);
  assert.match(nextConfigSource, /root:\s*repoRoot/);
  await assert.rejects(
    access(new URL("package-lock.json", siteRoot)),
    (error) => error?.code === "ENOENT",
  );
});

test("site ignores TypeScript incremental build state", () => {
  assert.match(gitignoreSource, /^\*\.tsbuildinfo$/m);
});
```

- [ ] **Step 2: Replace the Worker-only HTML harness**

Replace `apps/site/tests/rendered-html.test.mjs` with:

```js
import assert from "node:assert/strict";
import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";
import test, { after, before } from "node:test";

const routes = [
  "../app/page.tsx",
  "../app/themes/[slug]/page.tsx",
  "../app/security/page.tsx",
  "../app/help/page.tsx",
];

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const app = next({ dev: false, dir: siteRoot });
let origin;
let server;

before(async () => {
  await app.prepare();
  const handler = app.getRequestHandler();
  server = createServer((request, response) => handler(request, response));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await app.close();
});

function render(pathname = "/") {
  return fetch(`${origin}${pathname}`, { headers: { accept: "text/html" } });
}

test("all traffic MVP routes have source entries", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("home and every curated theme render real crawlable HTML", async () => {
  const home = await render("/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<title>CodexTheme/);
  assert.match(homeHtml, /midnight-circuit/);
  assert.match(homeHtml, /crimson-eclipse/);
  assert.match(homeHtml, /aurora-glass/);
  assert.doesNotMatch(homeHtml, /codex-preview|react-loading-skeleton/);

  for (const slug of ["midnight-circuit", "crimson-eclipse", "aurora-glass"]) {
    const response = await render(`/themes/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-copy-command/g) ?? []).length, 1);
    assert.match(html, new RegExp(`@codextheme\\/cli@0\\.1\\.0 apply ${slug}`));
    assert.match(html, /Home 预览/);
    assert.match(html, /Session 预览/);
    assert.doesNotMatch(html, /安装 Skill|\.pkg|curl \| bash|@latest/);
  }
});

test("security, help, robots, and sitemap routes render", async () => {
  for (const [pathname, expected] of [
    ["/security", /不修改 Codex 安装包/],
    ["/help", /reapply/],
    ["/robots.txt", /User-Agent/],
    ["/sitemap.xml", /themes\/midnight-circuit/],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(await response.text(), expected);
  }
});
```

- [ ] **Step 3: Verify the configuration test fails for the old build adapter**

Run:

```bash
node --test apps/site/tests/vercel-config.test.mjs
```

Expected: FAIL because the current scripts still invoke `vinext` and the Cloudflare/Vinext dependencies and source files still exist.

### Task 2: Replace the Sites build adapter with native Next.js

**Files:**
- Modify: `apps/site/package.json`
- Modify: `apps/site/.gitignore`
- Modify: `package-lock.json`
- Modify: `apps/site/next.config.ts`
- Modify: `apps/site/README.md`
- Delete: `apps/site/package-lock.json`
- Delete: `apps/site/vite.config.ts`
- Delete: `apps/site/worker/index.ts`
- Delete: `apps/site/build/sites-vite-plugin.ts`

- [ ] **Step 1: Change the site scripts**

Set the scripts to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit"
}
```

Keep the current `test` and `lint` commands.

- [ ] **Step 2: Remove hosting-only development dependencies**

Remove `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `react-server-dom-webpack`, `vinext`, `vite`, and `wrangler`. Keep Next.js, React, TypeScript, ESLint, and type packages.

- [ ] **Step 3: Remove hosting-only source files**

Delete the Vinext Vite configuration, Cloudflare Worker entry point, and OpenAI Sites packaging plugin. Preserve `apps/site/.openai/hosting.json` only as rollback metadata.

- [ ] **Step 4: Update package locks**

Delete the site-local lockfile, then update the single workspace lockfile:

```bash
npm install --package-lock-only --ignore-scripts
```

Set `next.config.ts` to resolve `turbopack.root` to the repository root using `import.meta.url`. Expected: the repository lockfile represents the reduced native Next.js dependency graph and native builds emit no ambiguous-root warning.

- [ ] **Step 5: Update the site README**

Set `apps/site/README.md` to:

```markdown
# codextheme.tech

The traffic-first public gallery for three curated Codex Desktop themes. Built with Next.js and deployed from the public CodexTheme monorepo.

## Vercel

Import the repository in Vercel, set **Root Directory** to `apps/site`, keep the detected Next.js framework and default build settings, and deploy. The existing OpenAI Sites deployment remains available as a rollback target until the custom-domain cutover is verified.
```

Add `*.tsbuildinfo` to `apps/site/.gitignore` so local and Vercel TypeScript incremental state never enters source control.

- [ ] **Step 6: Verify the deployment contract turns green**

Run:

```bash
node --test apps/site/tests/vercel-config.test.mjs
```

Expected: PASS.

### Task 3: Verify production behavior

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run the site package test**

Run:

```bash
npm test -w @codextheme/site
```

Expected: the native `next build` succeeds and all route/HTML tests pass against a production Next server.

- [ ] **Step 2: Run the site type check**

Run:

```bash
npm run typecheck -w @codextheme/site
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run the repository check**

Run:

```bash
npm run check
```

Expected: all package tests, type checks, theme generation, the native Next.js production build, and package checks pass.

### Task 4: Publish the migration branch

**Files:**
- Stage only the files named in Tasks 1 and 2 plus this plan.

- [ ] **Step 1: Review the final diff**

Run `git status -sb` and `git diff --check`, then inspect the complete diff for unrelated changes.

- [ ] **Step 2: Commit the verified migration**

Commit with message:

```text
build: migrate site to native Next.js for Vercel
```

- [ ] **Step 3: Push the existing branch**

Push `codex/48h-mvp` to `origin` so the existing draft pull request and the Vercel project receive the migration commit.
