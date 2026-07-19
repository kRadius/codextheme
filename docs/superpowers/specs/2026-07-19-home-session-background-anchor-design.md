# Home/Session Background Anchor Design

## Problem

CodexTheme currently paints the Session artwork on `body::before`, whose containing rectangle is the full Codex window. Home paints its artwork again on `.dream-home`, whose containing rectangle is the narrower Home content region. Both layers use `cover`, so the same uploaded image is cropped against two different rectangles and appears to move when the user switches between Home and a task.

## Decision

Both routes will paint artwork on the existing fixed, window-sized `body::before` layer. Session will use the `session-bg` image and Home will switch that same layer to `hero` when `.dream-home` is present. `.dream-home` will keep only route-specific tinting and decoration; it will no longer establish a second artwork coordinate system.

This is a CSS-only route selection using Chromium's supported `:has(.dream-home)` selector. It does not add a watcher, change the CLI lifecycle, or alter restart behavior.

## Scope

- Update the shared CSS used by curated themes.
- Update private custom-skin CSS generation.
- Repack curated theme artifacts.
- Publish a pinned `@codextheme/cli@0.2.2` release and update site commands to that release.
- Preserve all user-selected position, zoom, blur, visibility, and overlay settings.

## Expected behavior

- A private custom skin uses identical viewport coordinates in Home and Session.
- Curated Home and Session artwork may differ, but both are cropped against the same viewport rectangle.
- Home content tinting remains readable and the native Codex layout remains interactive.
- Reapply, restore, and restart handoff behavior is unchanged.

## Testing

Add source-level regression tests that reject a Home artwork declaration on `.dream-home` and require the Home image override on the fixed window layer. Run the private-package tests, curated-theme tests, complete monorepo check, and a packaged CLI smoke test. Finally apply the release through `@codextheme/cli` and inspect both Home and a normal task.
