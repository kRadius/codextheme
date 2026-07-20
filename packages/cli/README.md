# @codextheme/cli

Fixed-version, one-command curated and private custom skins for Codex Desktop on macOS.

Apply a catalog skin:

```sh
npx --yes @codextheme/cli@0.2.5 apply cathedral-nocturne
```

The custom skin studio at [codextheme.tech](https://codextheme.tech) creates an expiring private command:

```sh
npx --yes @codextheme/cli@0.2.5 apply-private <private-id>
```

Private packages are downloaded only from the fixed `https://codextheme.tech` origin, bounded, integrity-checked, schema-validated, safety-linted, and cached locally with owner-only permissions. The temporary server link expires after 24 hours; `reapply` uses the validated local cache and works after that link expires.

The CLI emits and applies only CodexTheme-owned package and renderer names. Historical cached packages are normalized by the runtime compatibility layer without exposing the former namespace in normal command output.

```sh
npx --yes @codextheme/cli@0.2.5 reapply
npx --yes @codextheme/cli@0.2.5 restore
```

The CLI has no install scripts, does not use `sudo`, and does not modify the Codex application bundle. Requirements: macOS, Node.js 22.4+, and Codex Desktop. A running Codex process is never closed or reopened without an explicit `y` confirmation. After confirmation, version 0.2.5 uses an owner-only detached one-shot worker so an apply started inside Codex survives that restart; it does not install a persistent service.

CodexTheme is an independent project and is not affiliated with or endorsed by OpenAI.
