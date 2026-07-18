# macOS release smoke — 2026-07-18

## Release candidate

- CodexTheme CLI: `0.1.0`, installed from the locally packed release tarball
- Codex Desktop: `26.715.21425` (build `5488`)
- Platform: macOS
- Curated theme: `midnight-circuit`

## Automated release gates

- CLI tests: 14 passed
- Runtime tests: 41 passed
- Site rendered-route tests: 3 passed
- Runtime and site builds: passed
- Theme package pack/read/lint: 3 passed with zero warnings
- npm tarball allowlist and secret/path scan: passed

The tests that exercise local CDP fixtures require permission to bind temporary
`127.0.0.1` ports. They pass outside the filesystem/network sandbox.

## Real Codex preflight

- Codex was running with CDP restricted to `127.0.0.1:9335`.
- Exactly one compatible Codex renderer target was found.
- A read-only runtime probe returned `compatible: true`.
- A non-interactive apply correctly refused to restart Codex, returned
  `E_RESTART_REQUIRED`, did not write CLI state, and left the managed Codex
  configuration byte-for-byte unchanged.

## Interactive apply and restore

- The final packed CLI ran from an independent pseudo-terminal so its process
  survived the authorized Codex restart.
- `apply midnight-circuit` accepted explicit `y` consent, printed its verified
  success message, and wrote only the approved state schema with mode `0600`.
- Runtime verification reported `midnight-circuit@1.0.0`, `pass: true`, both
  named images present, the renderer profile passing, and no horizontal
  overflow.
- `reapply` read the stored slug, returned exit code `0`, and passed runtime
  verification again.
- `restore` returned exit code `0`. The CLI state, transactional host backup,
  renderer style, theme dataset, and host root class were absent afterward.
- The bundled Codex CLI parsed the restored `config.toml` and returned exit
  code `0` from `features list`.

## Issues found during the smoke

1. A stale user-level CodeDrobe controller was continuously reapplying an old
   theme on port `9335`. That competing controller explained the initial theme
   id mismatch and was stopped before the final release-candidate run.
2. A fresh renderer target can appear before its DOM is ready. The preflight
   now uses the caller's full launch timeout; a virtual-time CDP regression test
   covers readiness after the former five-second cap.
3. Upstream Core `v0.3.0` could restore an unterminated `[desktop]` body and
   concatenate the following TOML table header. The reviewed upstream fix from
   commit `47b36d062cddd2d3cd69d3079be00c31566947d1` is included with attribution
   and a regression test. The real restored config was also parsed by Codex.
