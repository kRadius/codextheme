# CodexTheme

Create, preview, and apply reversible Codex Desktop skins on macOS. The public studio and theme gallery live at [codextheme.tech](https://codextheme.tech).

```bash
npx --yes @codextheme/cli@0.2.3 apply cathedral-nocturne
```

## Available themes

| Theme | Slug | Scope |
| --- | --- | --- |
| Cathedral Nocturne | `cathedral-nocturne` | Home + session background |
| Crimson Procession | `crimson-procession` | Home + session background |
| Silver Reliquary | `silver-reliquary` | Home + session background |

The homepage also includes a private custom skin studio. It processes an uploaded image in the browser, previews it in a Codex shell, lets the user adjust visibility, darkness, blur, zoom, and position, then creates a temporary one-command skin. No account is required.

All current catalog and private packages use the `codextheme-theme` format and CodexTheme-owned renderer markers. Packages created before this namespace migration remain readable through a compatibility layer and are normalized in memory before application.

## User flow

Requirements: macOS, Node.js 22.4 or newer, and Codex Desktop.

1. Open an available theme page on codextheme.tech.
2. Copy its guided install into a local Codex task, or use the visible Terminal fallback.
3. If Codex must reopen, the CLI warns about unsent input and continues only after an explicit `y`. It then hands the restart to an owner-only one-shot worker so the operation survives the current Codex task ending.

Themes apply to the current Codex process. After reopening Codex, run:

```bash
npx --yes @codextheme/cli@0.2.3 reapply
```

Restore the official appearance with:

```bash
npx --yes @codextheme/cli@0.2.3 restore
```

## Trust boundary

- No `sudo`, admin permission, install script, postinstall hook, or application-bundle rewrite.
- Runtime injection binds Chromium DevTools Protocol to `127.0.0.1` and does not modify `.app`, `app.asar`, or the official signature.
- Theme packages contain data, CSS, and local images; themes cannot execute JavaScript or load remote CSS resources.
- Catalog packages are bundled in the fixed CLI release. Private packages are downloaded only from `https://codextheme.tech`, integrity-checked, schema-validated, safety-linted, and cached with owner-only permissions.
- Temporary private links expire after 24 hours. Local state stores only a catalog slug or a content hash for the cached private package; it never stores the private link or ID.
- Restart handoff jobs are owner-only, contain only the same slug or local cache hash, and run once. CodexTheme does not install a persistent background service.
- `restore` is part of the same public, fixed-version CLI.

## Source and license

This public monorepo contains the runtime, CLI, original theme sources, release checks, and website. `packages/runtime` is an Apache-2.0 derivative of CodeDrobe Core 0.3.0. Its exact upstream tag and commit, preserved history, removed surfaces, and modification policy are recorded in [UPSTREAM.md](UPSTREAM.md), [LICENSE](LICENSE), and [NOTICE](NOTICE).

CodexTheme is an independent project and is not affiliated with or endorsed by OpenAI. Codex and OpenAI are trademarks of their respective owners.
