# Codex Restart Handoff Design

## Outcome

Applying a theme from a local Codex task must survive the one restart required to launch Codex with its loopback CDP port and load changed host appearance settings. The foreground CLI will prepare and validate the theme, obtain explicit restart consent, and hand the destructive portion to an owner-only, detached, one-shot worker before returning successfully to the Agent.

The worker is not a persistent service. It exits after one apply attempt and leaves only a bounded last-result record for support.

## User Journey

1. The visitor pastes the exact pinned `@codextheme/cli` install action into a local Codex task.
2. The CLI downloads and caches a private package, when applicable, and validates the resolved theme before touching Codex.
3. If a restart is required, the CLI warns that unsent input may be lost and asks for explicit confirmation.
4. After confirmation, the CLI stores an owner-only pending job containing only a public catalog slug or a local private-cache hash.
5. The CLI starts a detached Node worker, reports that the restart has been handed off, and exits before Codex is closed.
6. The worker waits for the foreground process to exit, closes and reopens Codex through the existing runtime, applies and verifies the theme, writes active state only after verification, records a sanitized result, and exits.
7. A macOS notification reports success or failure. On failure, the worker attempts the existing restore path and ensures Codex is open when possible.

## Architecture

`packages/cli/src/handoff.mjs` owns the pending-job schema, owner-only filesystem storage, stale-job handling, and detached process launch. There is one pending job at a time. A fresh job blocks a duplicate request; a stale job older than five minutes may be replaced.

`packages/cli/src/handoff-runner.mjs` executes an already-authorized job. It resolves public themes from the shipped catalog and private themes from the content-addressed local cache. It deliberately calls the existing lifecycle without another handoff coordinator, allowing the worker—not the foreground Agent—to pass `restartExisting: true` after the authorization already captured by the job.

`packages/cli/src/handoff-worker.mjs` is a minimal Node entry point. It waits until the scheduling CLI process has exited, runs the job, records a sanitized result, attempts recovery on failure, sends a fixed macOS notification, and exits.

The normal lifecycle receives an optional restart handoff coordinator. Production CLI calls always provide it. Tests and the authorized worker may omit it to exercise the existing synchronous restart path. Direct apply remains synchronous when Codex is closed, already exposes CDP, and host settings do not require a restart.

## Job and Result Boundaries

The pending job uses schema version 1 and contains:

- creation timestamp;
- foreground parent PID used only for exit coordination; and
- either `{ source: "catalog", themeSlug }` or `{ source: "private", cacheKey }`.

It must never contain a private web ID, downloaded package bytes, CSS, images, access credentials, conversation text, or arbitrary executable arguments. The directory is mode `0700`; pending and result files are mode `0600`. Writes are atomic and validated on read.

The last-result record contains only status, completion timestamp, and a stable public error code/message. A successful worker removes the pending job. A failed worker also removes it after writing the sanitized result so a future install is not permanently blocked.

## Failure Handling

- Failure to create or detach the worker returns `E_HANDOFF_FAILED` while Codex is still running.
- A duplicate fresh job returns `E_HANDOFF_BUSY` and does not start another worker.
- Invalid, expired, or tampered jobs fail closed.
- Theme application keeps the runtime's transactional host-settings rollback and renderer verification.
- After an application failure, the worker attempts restore and relaunch recovery, records whether recovery completed, and shows a failure notification.
- Active theme state is written only after application verification succeeds.

## Release and Copy

The behavior ships as `@codextheme/cli@0.2.1`. All site-generated commands and command validators move from `0.2.0` to `0.2.1`; old `0.2.0` commands continue to work but retain the Terminal-first restart limitation.

Agent copy will state that Codex may close and reopen once and that the current task may end after the CLI reports a successful handoff. Terminal remains the visible fallback.

## Testing

Tests must prove:

- restart-required foreground flows queue a handoff and never call `runtime.apply({ restartExisting: true })` in the Agent-owned process;
- cancellation schedules nothing;
- pending jobs are owner-only, contain only allowlisted references, block duplicates, and launch a detached/unref'ed worker;
- the worker waits for its parent, applies catalog and private cached jobs with the authorized synchronous restart path, writes sanitized results, and removes pending state;
- worker failure invokes recovery and does not leak private IDs or raw internal errors;
- CLI output distinguishes queued handoff from completed synchronous application;
- the packed npm artifact contains the worker files and all website commands are pinned to `0.2.1`;
- the full repository check remains green.

## Out of Scope

- A persistent LaunchAgent or daemon.
- Automatic reapplication on every future Codex launch.
- Windows or Linux support.
- Remote job polling or server-side knowledge of local apply status.
- Changing the theme package format or the existing loopback-only CDP security boundary.
