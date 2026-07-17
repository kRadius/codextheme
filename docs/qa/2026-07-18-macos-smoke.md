# macOS release smoke — 2026-07-18

## Release candidate

- CodexTheme CLI: `0.1.0`, installed from the locally packed release tarball
- Codex Desktop: `26.715.21316` (build `5484`)
- Platform: macOS
- Curated theme: `midnight-circuit`

## Automated release gates

- CLI tests: 14 passed
- Runtime tests: 39 passed
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

Pending the controlled Codex restart at the end of the release session.
