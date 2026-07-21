# @codextheme/runtime

Auditable runtime primitives for applying and restoring CSS themes in Codex Desktop and other supported Chromium/Electron apps.

This package is the low-level engine used by `@codextheme/cli`. Most people should use the fixed-version one-command flow documented at [codextheme.tech](https://codextheme.tech), rather than call the runtime directly.

## Install

```sh
npm install @codextheme/runtime@0.1.2
```

## API

```js
import {
  applySkin,
  getAdapter,
  readThemePackage,
  resolveThemeTarget,
  restoreSkin,
} from "@codextheme/runtime";

const adapter = getAdapter("codex");
const theme = await readThemePackage("/absolute/theme.codextheme-theme");
const target = resolveThemeTarget(theme, adapter.id);

await applySkin({ adapter, target });
await restoreSkin({ adapter });
```

Type declarations are included for the root API and the `@codextheme/runtime/adapters` and `@codextheme/runtime/theme` subpath exports.

## Safety model

- Themes are data-only `.codextheme-theme` JSON packages containing CSS and embedded image assets; theme packages cannot execute JavaScript.
- Injection uses a loopback Chromium DevTools Protocol connection and does not modify the Codex application bundle or `app.asar`.
- Restore support is part of the runtime API.
- This package has no install scripts, postinstall hooks, update notifier, or standalone executable.

New packages are written as `codextheme-theme`, and new renderer state, DOM markers, CSS variables, errors, and backups use the CodexTheme namespace. Historical package files and backups remain readable through isolated migration adapters.

## Provenance

This runtime is derived from CodeDrobe Core `v0.3.0` under Apache-2.0. The upstream license, notice, history, and exact imported commit are preserved in the repository. See [`UPSTREAM.md`](../../UPSTREAM.md) for the provenance record and local modification policy.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
