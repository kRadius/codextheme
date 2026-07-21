# Curated Theme Icon Interaction Design

## Goal

Make curated Codex themes feel more cohesive by changing the icon in the currently hovered or selected sidebar project/session row to that theme's packaged accent color.

## Approved Direction

- Strength: B.
- Hovered row icon: theme accent plus a restrained same-color glow.
- Selected row icon: theme accent plus the same restrained glow.
- Text remains on the native readable foreground color.
- Idle icons remain unchanged.
- Each bundled theme uses its packaged accent: Cathedral gold, Crimson red, Silver blue-gray, and the corresponding compatibility-theme accent.

## Scope

Apply only below the verified Codex sidebar row anchors:

- `aside.app-shell-left-panel [role="listitem"] [role="button"].group:hover`
- `aside.app-shell-left-panel [role="listitem"] [role="button"].group[aria-current="page"]`

Within those rows, color the native icon SVG without changing its geometry, visibility, hit target, or surrounding text. Do not target generic SVG elements outside these row states.

## Visual Treatment

- `color: var(--codextheme-accent)` on the row's icon SVG.
- A restrained `drop-shadow` derived from `var(--codextheme-glow)`.
- A short color/filter transition matching the existing 160 ms row transition.
- No icon background disk, replacement asset, animation, or text recoloring.

## Safety and Compatibility

- Preserve native icon shape, size, stroke width, and interaction behavior.
- Preserve hidden hover actions; do not use broad opacity or visibility overrides.
- Keep all selectors under `html.codextheme-codex-skin`.
- Uploaded private themes remain unchanged; this applies only to bundled curated themes.
- The rule must work for both project and session rows represented by the verified list-item/button structure.

## Verification

1. Add a failing CSS contract test for hover and selected icon selectors.
2. Implement the smallest scoped CSS rules.
3. Rebuild all bundled theme packages.
4. Run the complete repository check.
5. Reapply Cathedral locally without restarting Codex.
6. Verify computed icon color/filter in the live renderer and capture a real screenshot before publishing CLI 0.2.6.

## Out of Scope

- Replacing Codex's native icon artwork.
- Recoloring header, navigation, composer, editor, terminal, or action icons.
- Changing icon color in idle or disabled rows.
- Adding user-adjustable icon controls.
