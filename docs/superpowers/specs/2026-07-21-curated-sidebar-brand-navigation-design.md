# Curated Sidebar Brand and Navigation Design

**Date:** 2026-07-21  
**Status:** Approved visual direction; awaiting written-spec review

## Goal

Make the installed curated themes feel intentional in the real Codex sidebar by
carrying each preset's accent color into the permanent Codex brand lockup and the
primary navigation interaction states. The result should be visibly themed
without changing Codex's layout, icon artwork, hit targets, or information
hierarchy.

## Design Contract

- **Layout mode:** `native-immersive`; preserve Codex's native sidebar geometry
  and components while coordinating their visual states.
- **Background scope:** `workspace`; this work does not change the existing home
  and session artwork scope.
- **Decoration density:** `balanced`; this is a chrome and state-coordination
  improvement, not a new decorative layer.
- **Mode:** dark, matching all six current curated presets and their packaged
  dark artwork/surface palettes.
- **Artwork focal point and text-safe region:** unchanged from each preset; this
  work does not alter artwork, crop, veil, or background position.
- **Semantic palette:** use the packaged `--codextheme-accent` and derived
  `--codextheme-glow`; do not introduce a second sidebar accent.
- **Allowed changes:** Codex brand text and chevron color; primary sidebar
  navigation text, leading icon, and row-action icon color/filter during hover
  and selected states; their short color/filter transitions.
- **Preserved:** native wording, icon paths, stroke width, dimensions, spacing,
  row backgrounds, row borders, focus behavior, opacity behavior, pointer
  behavior, hidden actions, and every non-navigation sidebar control.
- **Verification viewports:** the current desktop renderer plus a narrow Codex
  window. The change must not create clipping or action overlap at either size.

## Approved Visual Behavior

### Permanent brand accent

The `Codex` wordmark at the top of the sidebar and its adjacent mode-switch
chevron always use the active theme's accent color. They receive the same
restrained theme-derived glow used by the curated row icons. The treatment is
permanent rather than hover-only so the active skin has an immediate, stable
identity.

The brand button remains fully native: no replacement logo, added badge,
background, border, size, spacing, or interaction change.

### Primary navigation states

For `New task`, `Pull requests`, `Sites`, `Scheduled`, and `Plugins`:

- Idle text and icons keep the native readable foreground color.
- On hover, the row label, leading icon, and any visible right-side row action
  change together to `--codextheme-accent`.
- On a supported selected/current state, the same elements remain accented.
- Icons receive a restrained `drop-shadow` derived from
  `--codextheme-glow`; text does not receive a glow.
- Color and filter changes use the existing 160 ms native-feeling transition.
- The existing B-strength hover/selected background, border, and accent edge are
  unchanged.

For the current `New task` structure, hovering either the main button or its
right-side quick-action area counts as hovering the row, so both the main label
and every visible row icon stay synchronized.

## Verified DOM Anchors

All selectors remain under `html.codextheme-codex-skin` and
`aside.app-shell-left-panel`.

### Brand

The live Codex renderer exposes a mode-switch button with two direct children:

- `span.font-openai-sans.font-semibold` containing the brand wordmark;
- the adjacent native chevron SVG.

The implementation will use this structural signature, including both direct
children, instead of the localized `aria-label` or visible `Codex` text.

### Navigation

The live renderer exposes the primary navigation content through a direct child
`div.text-token-foreground`:

- `Pull requests`, `Sites`, `Scheduled`, and `Plugins` are row buttons whose
  direct child is that content node.
- `New task` is a `div.group` row containing a main button with that content
  node plus a sibling action span/button.

The implementation will therefore use two narrow selector families:

1. row buttons that directly contain `div.text-token-foreground`;
2. the `div.group` row that directly contains a button with that same content
   node, including its direct sibling action icon.

No selector may depend on localized labels, arbitrary child indexes, or a broad
sidebar-wide SVG rule.

## Scope Boundaries

This change must not recolor or otherwise alter:

- the search button;
- the `Projects` section heading, collapse chevron, options button, or add
  button;
- idle project/session row icons or text;
- project/session behavior already covered by the prior curated icon interaction
  rules;
- profile/footer controls;
- composer, editor, header, settings, terminal, menus, or system-page icons;
- private uploaded themes.

The existing project/session icon hover and selected treatment remains intact
and independent. The new rules extend theme identity to the brand and top-level
navigation only.

## Implementation Shape

The change belongs in `themes/shared/codex.css`, which is the single source for
all bundled curated presets. The theme pack step must regenerate all six bundled
`.codextheme-theme` artifacts so each preset inherits its own packaged accent.

No runtime, CLI command, package schema, website layout, or image-generation
change is required. The visible theme version must still be incremented according
to the existing packaging workflow before release.

## Safety and Accessibility

- Do not set broad descendant `color`, `opacity`, `display`, `visibility`,
  `position`, or `overflow` properties.
- Do not reveal the quick-action icon outside Codex's native hover/focus rules.
- Do not change focus-visible outlines or keyboard behavior.
- Preserve contrast by keeping idle labels native and using only preset accents
  already selected for the dark curated palettes.
- Respect the existing `prefers-reduced-motion` override.
- Keep selection/hover specificity below any rule required for disabled states.

## Verification

1. Add failing CSS contract tests for the permanent brand text/chevron accent,
   standard navigation hover/selected states, and the grouped `New task` row
   including its action icon.
2. Add negative assertions that forbid a generic
   `aside.app-shell-left-panel svg` color rule and protect the search and section
   controls from the new selector family.
3. Implement the smallest shared-CSS change and rebuild all six bundled theme
   packages.
4. Run the complete repository check and namespace/package checks.
5. Reapply Cathedral Nocturne to the real local Codex renderer.
6. Inspect computed `color` and `filter` values for:
   - the brand span and chevron while idle;
   - one idle primary navigation item;
   - one hovered standard navigation item;
   - the grouped `New task` row with its visible quick-action icon;
   - one project/session row to confirm its prior behavior is unchanged;
   - the search and `Projects` controls to confirm they remain unchanged.
7. Capture a real Codex screenshot at desktop width and repeat a geometry check
   at narrow width. Required regressions are zero clipped controls, zero title/
   action overlap, and zero horizontal overflow.

## Out of Scope

- Replacing native navigation icons with custom SVG or bitmap assets.
- Making all sidebar icons permanently accented.
- Recoloring section headings or search controls.
- Changing hover-background strength, selected-background strength, borders,
  layout, typography, or artwork.
- Adding user controls for brand or navigation color.
- Publishing CLI `0.2.6`, merging, or deploying; those remain separate release
  steps after implementation and live verification.
