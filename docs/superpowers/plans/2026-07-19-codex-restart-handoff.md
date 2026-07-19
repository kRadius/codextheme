# Codex Restart Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a theme apply launched from Codex survive the required Codex restart by transferring the restart, apply, verification, recovery, and notification work to an authorized detached one-shot worker.

**Architecture:** The foreground lifecycle delegates restart-required work to a new handoff scheduler that persists one allowlisted owner-only job and launches a detached worker. The worker reuses the existing lifecycle and runtime without a handoff coordinator, so only the independent process may execute `restartExisting: true`; it records a sanitized last result and exits.

**Tech Stack:** Node.js 22 ESM, Node test runner, existing `@codextheme/runtime`, Next.js site command generation, npm workspaces.

---

### Task 1: Define restart delegation in the lifecycle

**Files:**
- Modify: `packages/cli/tests/lifecycle.test.mjs`
- Modify: `packages/cli/src/lifecycle.mjs`

- [ ] **Step 1: Write the failing lifecycle tests**

Add a `restartHandoff` harness dependency whose `schedule(action)` records the action and returns `{ queued: true }`. Assert that a running non-CDP Codex, after consent, calls `schedule({ source: "catalog", themeSlug: "midnight-circuit" })`, never calls `runtime.apply`, and never writes active state. Assert that a runtime `CODEDROBE_RESTART_REQUIRED` result schedules once instead of retrying in the foreground. Preserve a separate no-handoff test proving the authorized worker path can still retry with `restartExisting: true`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/cli/tests/lifecycle.test.mjs`

Expected: FAIL because lifecycle ignores `restartHandoff` and calls the runtime restart path.

- [ ] **Step 3: Implement minimal delegation**

Pass `restartHandoff` through `applyTheme`, `applyPrivateTheme`, and `applyResolvedTheme`. After consent, return:

```js
{
  theme,
  handoff: await restartHandoff.schedule(nextState),
  appliedAt: null,
}
```

when a coordinator exists. Do not write active state until the worker later verifies the application. Retain the existing synchronous retry only when no coordinator exists.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test packages/cli/tests/lifecycle.test.mjs`

Expected: all lifecycle tests pass.

### Task 2: Persist and detach a safe one-shot job

**Files:**
- Create: `packages/cli/tests/handoff.test.mjs`
- Create: `packages/cli/src/handoff.mjs`

- [ ] **Step 1: Write failing scheduler tests**

Using a temporary home directory and an injected spawn function, assert that `createRestartHandoff().schedule()` writes `Library/Application Support/codextheme/handoff/pending.json` with modes `0700`/`0600`, stores only an allowlisted slug or 64-character cache hash, launches `process.execPath` with the packaged worker path using `{ detached: true, stdio: "ignore" }`, and calls `unref()`. Assert that a fresh pending job throws `E_HANDOFF_BUSY`, a stale job can be replaced, invalid action shapes throw `E_HANDOFF_FAILED`, and spawn failure removes the pending job.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/cli/tests/handoff.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `handoff.mjs`.

- [ ] **Step 3: Implement the scheduler and store**

Create a schema-one validator accepting only:

```js
{ source: "catalog", themeSlug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }
{ source: "private", cacheKey: /^[a-f0-9]{64}$/ }
```

Use an atomic owner-only pending file, a five-minute freshness window, a fixed `last-result.json`, and `spawn(process.execPath, [workerPath, pendingPath, String(process.pid)], { detached: true, stdio: "ignore" })`. Expose store methods required by the runner: `readPending`, `writeResult`, and `removePending`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test packages/cli/tests/handoff.test.mjs`

Expected: all scheduler tests pass.

### Task 3: Execute, recover, and notify outside Codex

**Files:**
- Create: `packages/cli/tests/handoff-runner.test.mjs`
- Create: `packages/cli/src/handoff-runner.mjs`
- Create: `packages/cli/src/handoff-worker.mjs`
- Modify: `packages/cli/src/runtime.mjs`

- [ ] **Step 1: Write failing runner tests**

Inject a job store, lifecycle functions, cache, runtime, state store, wait function, and notifier. Assert that the runner waits for the parent, applies catalog jobs with `promptRestart()` returning true, parses private packages only from `cache.read(cacheKey)`, writes a success result, removes pending state, and notifies success. On an apply error, assert it calls `runtime.recover()`, writes only a stable code/message plus recovery status, removes pending state, notifies failure, and returns exit code 1.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/cli/tests/handoff-runner.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `handoff-runner.mjs`.

- [ ] **Step 3: Implement the runner and worker entry**

`runHandoffJob` waits for the recorded parent PID, reads the job, invokes `applyTheme` or `applyPrivateTheme` without `restartHandoff`, records the sanitized result, removes pending state in `finally`, and calls a fixed success/failure notifier. The production worker constructs `createRestartHandoff().store`, `createPrivateCache()`, `createStateStore()`, and the production runtime. It uses `/usr/bin/osascript` through `execFile` arguments, never a shell.

- [ ] **Step 4: Add runtime recovery**

Add `runtime.recover()` that first invokes `restoreSkin({ adapter })`, detects whether Codex is still running, and invokes `launchApp({ adapter })` only when it is absent. Return a structured recovery result and let the runner sanitize any recovery error.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `node --test packages/cli/tests/handoff.test.mjs packages/cli/tests/handoff-runner.test.mjs packages/cli/tests/lifecycle.test.mjs`

Expected: all handoff and lifecycle tests pass.

### Task 4: Wire CLI UX and release 0.2.1

**Files:**
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `packages/cli/src/main.mjs`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/README.md`
- Modify: `README.md`
- Modify: `scripts/check-packages.mjs`
- Modify: `apps/site/app/lib/install-copy.mjs`
- Modify: `apps/site/tests/install-copy.test.mjs`
- Modify: `apps/site/app/lib/private-skin-service.mjs`
- Modify: `apps/site/tests/private-skin-service.test.mjs`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/security/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`

- [ ] **Step 1: Write failing CLI and site assertions**

Assert production services provide `restartHandoff`, a queued apply prints that Codex will close and reopen while a synchronous apply still prints verified success, `--version` reports `0.2.1`, and all generated/accepted site commands pin `@codextheme/cli@0.2.1`. Require Agent copy to warn that the current Codex task may end after handoff.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test packages/cli/tests/main.test.mjs apps/site/tests/install-copy.test.mjs apps/site/tests/private-skin-service.test.mjs`

Expected: FAIL on missing coordinator/output and old `0.2.0` pins.

- [ ] **Step 3: Wire production dependencies and output**

Construct `createRestartHandoff()` in `main.mjs`, pass it as `restartHandoff`, and branch success copy on `result.handoff?.queued`. The queued message must say the foreground work is complete, Codex will close/reopen once, and the current task may end. Keep raw IDs out of output.

- [ ] **Step 4: Bump and align release pins**

Change the CLI package and exported version to `0.2.1`, update README commands, package checks, site command generation/validation/tests, Help, Security, and theme-detail copy. Keep the runtime dependency pinned to `0.1.0`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test packages/cli/tests/*.test.mjs && npm run build -w @codextheme/site && node --test apps/site/tests/*.test.mjs`

Expected: all CLI and site tests pass.

### Task 5: Verify the release artifact and integrate

**Files:**
- Verify all changed files and the packed npm artifact.

- [ ] **Step 1: Run repository verification**

Run outside the restricted sandbox because runtime tests bind loopback ports:

```bash
npm run check
```

Expected: type checks, all tests, theme packaging, Next.js production build, and package checks pass.

- [ ] **Step 2: Inspect the npm tarball and diff**

Run:

```bash
npm pack --dry-run -w @codextheme/cli
git diff --check origin/main...HEAD
git status --short
```

Expected: the tarball contains `handoff.mjs`, `handoff-runner.mjs`, and `handoff-worker.mjs`; no whitespace errors or accidental generated files exist.

- [ ] **Step 3: Commit, push, publish, and merge**

Commit the tested release, push `codex/restart-handoff`, publish `@codextheme/cli@0.2.1`, create a ready pull request, verify checks, and merge into `main`. Publishing must occur before the site deploy exposes pinned `0.2.1` commands.

- [ ] **Step 4: Verify production**

Confirm npm reports `@codextheme/cli@0.2.1`, `https://codextheme.tech` serves the merged deployment, Agent copy contains the restart-handoff warning and exact `0.2.1` command, and the Terminal fallback remains available.
