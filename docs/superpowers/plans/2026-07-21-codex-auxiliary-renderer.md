# Codex Auxiliary Renderer Compatibility Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Codex auxiliary renderers from aborting theme application and make restart handoff status unambiguous.

**Architecture:** Keep the fix at the adapter boundary so every runtime operation receives the same filtered target set. Preserve the existing handoff and recovery design, changing only its foreground status copy. Release patch versions and update exact CLI pins across the repository.

**Tech Stack:** Node.js ESM, Node test runner, npm workspaces, Next.js, Vercel

---

### Task 1: Filter the auxiliary Codex renderer

**Files:**
- Modify: `packages/runtime/tests/adapters.test.mjs`
- Modify: `packages/runtime/src/adapters/codex.mjs`

- [ ] **Step 1: Write the failing target matcher test**

Add assertions that the observed `app://-/index.html?initialRoute=%2Favatar-overlay`
target is rejected while `app://-/index.html` remains accepted.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/runtime/tests/adapters.test.mjs`

Expected: the avatar-overlay assertion fails because the current matcher accepts
every `app://` page.

- [ ] **Step 3: Implement the minimal matcher change**

Parse the target URL and reject only the known `initialRoute=/avatar-overlay`
auxiliary renderer. Update `lastVerified.darwin` to app version `26.715.52143`,
build `5591`, verified on `2026-07-21`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test packages/runtime/tests/adapters.test.mjs`

Expected: all adapter tests pass.

### Task 2: Clarify handoff output

**Files:**
- Modify: `packages/cli/tests/main.test.mjs`
- Modify: `packages/cli/src/main.mjs`

- [ ] **Step 1: Write the failing output test**

Require queued output to include `正在后台应用` and reject the old
`已交给独立任务处理` wording and any verified-success claim.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test packages/cli/tests/main.test.mjs`

Expected: the new progress wording assertion fails.

- [ ] **Step 3: Implement the minimal copy change**

Change only the queued handoff copy. Preserve the restart warning, task-ending
warning, exact command behavior, and error handling.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test packages/cli/tests/main.test.mjs`

Expected: all CLI main tests pass.

### Task 3: Release patch versions and update pins

**Files:**
- Modify: `packages/runtime/package.json`
- Modify: `packages/runtime/src/version.mjs`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/main.mjs`
- Modify: repository files containing `@codextheme/cli@0.2.4`
- Modify: `package-lock.json`

- [ ] **Step 1: Locate exact version pins**

Run: `rg -n '0\\.1\\.1|0\\.2\\.4|@codextheme/cli@' --glob '!node_modules/**'`

- [ ] **Step 2: Update runtime and CLI versions**

Set runtime to `0.1.2`, CLI to `0.2.5`, CLI dependency to exact runtime
`0.1.2`, and all user-facing commands to exact CLI `0.2.5`.

- [ ] **Step 3: Refresh the lockfile mechanically**

Run: `npm install --package-lock-only`

Expected: the workspace versions and exact runtime dependency are updated with
no unrelated package upgrades.

### Task 4: Verify and publish

**Files:**
- No additional source files

- [ ] **Step 1: Run focused package tests**

Run: `npm test -w @codextheme/runtime && npm test -w @codextheme/cli`

Expected: all runtime and CLI tests pass.

- [ ] **Step 2: Run the full repository check**

Run: `npm run check`

Expected: type checks, tests, builds, package checks, and namespace checks all
exit successfully.

- [ ] **Step 3: Probe the real running Codex renderer set**

Use `probeApp` through runtime source against port `9335` and the cached private
theme. Expected: only `app://-/index.html` is returned and it is compatible.

- [ ] **Step 4: Publish npm packages in dependency order**

Run runtime `npm publish`, verify registry version `0.1.2`, then run CLI
`npm publish` and verify registry version `0.2.5` with runtime dependency
`0.1.2`.

- [ ] **Step 5: Commit, merge, and push main**

Commit the verified change on `codex/fix-avatar-overlay-target`, merge it into
`main`, push `main`, and confirm the Vercel deployment serves commands pinned to
`@codextheme/cli@0.2.5`.

