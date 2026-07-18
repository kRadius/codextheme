# Upstream provenance

`packages/runtime` is derived from [CodeDrobe Core](https://github.com/CodeDrobe/core), licensed under Apache-2.0.

- Imported tag: `v0.3.0`
- Imported commit: `3e4d1c808d03e8cb87a7febbef64d60b34477090`
- Import date: `2026-07-18`
- Original package: `@codedrobe/core@0.3.0`
- Derived package: `@codextheme/runtime@0.1.0`

The import preserves the upstream Git history, LICENSE, and NOTICE. The first CodexTheme refactor moves the runtime into a workspace, renames the package and release identity, removes the standalone CodeDrobe CLI/update notifier, and adds a separate CodexTheme CLI and curated themes.

The `upstream` remote is read-only reference material. Changes are never merged automatically. Each selected upstream change must be reviewed, tested, attributed, and committed explicitly.

## Selected upstream fixes

- `47b36d062cddd2d3cd69d3079be00c31566947d1` — terminate the restored
  `[desktop]` table body so the following TOML table header remains valid.
