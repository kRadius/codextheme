# Codex Auxiliary Renderer Compatibility Fix

## Problem

Codex Desktop 26.715.52143 exposes both the main renderer and an auxiliary
`app://-/index.html?initialRoute=%2Favatar-overlay` renderer through CDP. The
Codex adapter currently accepts every `app://` page, so theme preflight treats
the auxiliary renderer as a full workspace. That renderer has no main surface,
sidebar, or composer, causing `E_DOM_INCOMPATIBLE`. The handoff worker then
rolls back, leaving the user with a restart and no visible theme.

## Approved scope

1. Reject the known avatar-overlay renderer in the Codex adapter while keeping
   normal `app://` Codex pages eligible.
2. Record Codex 26.715.52143 as the verified macOS version.
3. Replace the foreground handoff wording with language that clearly says the
   theme is still being applied and has not yet succeeded.
4. Publish a patch runtime and CLI, then update all pinned website commands.

Theme CSS, generated packages, private storage, and the restart architecture
remain unchanged.

## Behavior

- The main Codex renderer remains the only current theme target.
- `avatar-overlay` is ignored by discovery, preflight, injection, verification,
  restore, and recovery because all of those operations share `matchTarget`.
- A queued handoff reports that application is in progress and that the final
  result arrives through a macOS notification.
- A background failure remains recoverable and continues to write the sanitized
  `last-result.json` status.

## Testing

- Adapter regression test: the observed avatar-overlay URL is rejected while a
  normal Codex app URL remains accepted.
- CLI regression test: queued output contains “正在后台应用” and does not claim
  success or say only that work was handed off.
- Full monorepo checks cover type checks, all tests, package safety, namespace
  checks, theme generation, and the production site build.
- A read-only probe against the running Codex 26.715.52143 CDP endpoint must
  return only the compatible main renderer.

## Release

- `@codextheme/runtime`: `0.1.1` → `0.1.2`
- `@codextheme/cli`: `0.2.4` → `0.2.5`, pinning runtime `0.1.2`
- Website and documentation commands: pin CLI `0.2.5`

