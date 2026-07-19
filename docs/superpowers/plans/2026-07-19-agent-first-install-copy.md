# Agent-First Install Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a local Codex task the primary one-click install path while retaining an explicit raw Terminal fallback and honest private-token disclosure.

**Architecture:** Add one client-safe pure helper that validates pinned CodexTheme commands and generates either an Agent instruction or the unchanged Terminal command. Reuse it from the ready-made theme copy component and private Studio, then align crawlable home, Help, Security, and theme-detail copy with the same path.

**Tech Stack:** Next.js 16, React 19, TypeScript, ESM JavaScript, Node test runner, CSS.

---

### Task 1: Safe install-copy payloads

**Files:**
- Create: `apps/site/app/lib/install-copy.mjs`
- Create: `apps/site/tests/install-copy.test.mjs`

- [ ] **Step 1: Write the failing helper tests**

Create tests that pass a catalog command and a private command to `buildInstallCopy`. Assert that Agent mode ends with the exact unchanged command, names the local macOS shell, forbids installed theme skills and package substitution, and names `@codextheme/cli`. Assert that Terminal mode equals the input exactly. Assert that newline injection, `@latest`, unsupported actions, and invalid modes throw `Invalid pinned CodexTheme install command.` or `Invalid install copy mode.`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test apps/site/tests/install-copy.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `install-copy.mjs`.

- [ ] **Step 3: Implement the minimal helper**

Export `buildInstallCopy(command, mode)` from `install-copy.mjs`. Accept only these complete single-line shapes:

```text
npx --yes @codextheme/cli@0.2.0 apply <lowercase-hyphen-slug>
npx --yes @codextheme/cli@0.2.0 apply-private <timestamp>.<base64url-secret>
```

For `terminal`, return the validated command. For `agent`, return:

```text
Run the following command exactly in my local macOS shell.
Do not use any installed theme skill, substitute another package, or modify the command.
Ask for approval only if required. After it finishes, report whether Codex needs to be reopened.

<command>
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test apps/site/tests/install-copy.test.mjs`

Expected: all helper tests pass.

- [ ] **Step 5: Commit the helper**

```bash
git add apps/site/app/lib/install-copy.mjs apps/site/tests/install-copy.test.mjs
git commit -m "feat: build safe agent install copy"
```

### Task 2: Agent-first controls in both install surfaces

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/components/CopyCommand.tsx`
- Modify: `apps/site/app/components/CustomSkinStudio.tsx`
- Modify: `apps/site/app/globals.css`

- [ ] **Step 1: Write the failing rendered-page assertions**

For every ready-made theme page, require exactly one primary `data-copy-command`, one `data-copy-terminal`, the text `Copy &amp; apply with Codex`, and `Copy Terminal command`. Keep the exact pinned command assertion.

- [ ] **Step 2: Run the site test and verify RED**

Run: `npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: FAIL because the new Agent and Terminal controls are absent.

- [ ] **Step 3: Implement the ready-made theme controls**

Update `CopyCommand` to call `buildInstallCopy(command, "agent")` for its primary button and `buildInstallCopy(command, "terminal")` for its secondary button. Keep analytics coarse by calling only `trackInstallCopy(themeSlug)`. Show `Copied — paste into a local Codex task.` or `Terminal command copied.` on success, and `Clipboard unavailable. Select the command above and copy it manually.` on failure.

- [ ] **Step 4: Implement the private Studio controls**

Replace `copyCommand` with a mode-aware copy function using the same helper. Add primary `Copy & apply with Codex` and secondary `Copy Terminal command` buttons. Under the visible raw command, disclose that the skin is absent from the public gallery but pasting into an Agent sends its temporary ID to that provider; recommend Terminal when the user does not want that ID in an Agent conversation.

- [ ] **Step 5: Style the two-action hierarchy**

Add shared `.install-copy-actions`, `.terminal-copy`, `.install-copy-status`, and `.studio-private-note` rules. The Codex action remains visually dominant; the Terminal action is a compact text button. Preserve responsive wrapping and accessible focus behavior.

- [ ] **Step 6: Run the helper and rendered tests and verify GREEN**

Run: `node --test apps/site/tests/install-copy.test.mjs && npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: all tests pass.

- [ ] **Step 7: Commit the interactive controls**

```bash
git add apps/site/app/components/CopyCommand.tsx apps/site/app/components/CustomSkinStudio.tsx apps/site/app/globals.css apps/site/tests/rendered-html.test.mjs
git commit -m "feat: make Codex the primary install path"
```

### Task 3: Align the crawlable product narrative

**Files:**
- Modify: `apps/site/tests/rendered-html.test.mjs`
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/themes/[slug]/page.tsx`
- Modify: `apps/site/app/help/page.tsx`
- Modify: `apps/site/app/security/page.tsx`

- [ ] **Step 1: Write the failing narrative assertions**

Require the home page to say `Paste into a local Codex task`, theme pages to say `Apply with Codex`, Help to include `local Codex task` and `Terminal fallback`, and Security to include `temporary ID` plus `Agent provider`. Assert the outdated `Paste one command into Terminal` and `open Terminal, paste it` phrases are absent.

- [ ] **Step 2: Run the rendered test and verify RED**

Run: `npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: FAIL on the missing Agent-first narrative.

- [ ] **Step 3: Update the product copy**

Change home step three to `Paste into a local Codex task—or use Terminal`. Change theme detail heading to `Apply with Codex` and explain exact execution of the pinned CLI. Update Help to make a local Codex task primary, identify Terminal as the fallback, warn that web-only chats cannot access the Mac, and preserve reapply/restore guidance. Update Security to distinguish unlisted storage from disclosure of the temporary ID to an Agent provider.

- [ ] **Step 4: Run the rendered test and verify GREEN**

Run: `npm run build -w @codextheme/site && node --test apps/site/tests/rendered-html.test.mjs`

Expected: all rendered route tests pass.

- [ ] **Step 5: Commit the narrative update**

```bash
git add apps/site/app/page.tsx apps/site/app/themes/[slug]/page.tsx apps/site/app/help/page.tsx apps/site/app/security/page.tsx apps/site/tests/rendered-html.test.mjs
git commit -m "copy: explain agent-first theme installs"
```

### Task 4: Full verification and release

**Files:**
- Verify all changed files and generated production output.

- [ ] **Step 1: Run repository verification**

Run outside the restricted sandbox because runtime and rendered-page tests bind temporary loopback ports:

```bash
npm run check
```

Expected: type checks, 94+ tests, theme generation, Next.js production build, and package checks pass.

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files.

- [ ] **Step 3: Push and merge**

Push `codex/agent-first-copy`, create a ready pull request, verify checks, and merge it into `main`.

- [ ] **Step 4: Verify production**

Confirm `https://codextheme.tech/`, one ready-made theme page, `/help`, and `/security` return 200 and contain the new Agent-first copy. Confirm the Vercel production deployment corresponds to the merged main commit.
