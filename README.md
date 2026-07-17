# CodexTheme

One-command, reversible themes for Codex Desktop on macOS.

```bash
npx --yes @codextheme/cli@0.1.0 apply midnight-circuit
```

The public repository contains the auditable runtime, CLI, theme sources, and static site. The runtime is an Apache-2.0 derivative of CodeDrobe Core 0.3.0; see [UPSTREAM.md](UPSTREAM.md), [LICENSE](LICENSE), and [NOTICE](NOTICE).

V1 requires Node.js 22.4+, never uses `sudo`, does not modify the Codex application bundle, asks before restarting a running Codex process, and supports `reapply` and `restore`. Themes apply to the current Codex process; reopening Codex normally requires `reapply`.

CodexTheme is an independent project and is not affiliated with or endorsed by OpenAI.
