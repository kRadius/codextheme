# @codextheme/cli

Fixed-version, one-command curated themes for Codex Desktop on macOS.

```sh
npx --yes @codextheme/cli@0.1.0 apply midnight-circuit
```

The package bundles exactly three original themes and the exact runtime dependency required to apply them. It does not download themes, run install scripts, use `sudo`, or modify the Codex application bundle.

After restarting Codex, reapply the active theme with:

```sh
npx --yes @codextheme/cli@0.1.0 reapply
```

Restore the official appearance with:

```sh
npx --yes @codextheme/cli@0.1.0 restore
```

Requirements: macOS, Node.js 22.4+, and Codex Desktop. A running Codex process is never closed or reopened without an explicit `y` confirmation.

CodexTheme is an independent project and is not affiliated with or endorsed by OpenAI.
