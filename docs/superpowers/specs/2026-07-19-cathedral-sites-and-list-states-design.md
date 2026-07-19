# Cathedral Sites Icon and List States Design

## Outcome

Cathedral Nocturne will complete its primary sidebar icon set by replacing the native Sites glyph, and will carry its antique-gold visual system into project-folder and session-row interaction states. The change remains specific to Cathedral Nocturne and must not alter Codex layout, hit targets, labels, navigation, or accessibility behavior.

## Root Cause

The first icon-pack release deliberately skipped the second scrolling navigation button because current Codex inserted Sites between Pull requests and Scheduled. The compatibility contract therefore mapped buttons 1, 3, and 4 and left button 2 native. That safety decision prevented semantic icon shifting, but it also left one high-exposure white icon inside an otherwise coordinated gold set.

The current theme also styles the sidebar surface and project-folder glyph without defining Cathedral-specific list hover and selected-state tokens. Project and session rows therefore continue to use the host application's neutral interaction colors.

## Decisions

- Add one `icon-sites` asset, increasing Cathedral Glyphs from 11 to 12 icons.
- Use a rose-window four-cell grid as the Sites metaphor, rendered with the same antique-gold stroke system as the existing navigation glyphs.
- Target the confirmed second scrolling navigation button with a named, bounded compatibility contract.
- Preserve the native Sites SVG element, button, label, focus behavior, and click target; only its drawing children become transparent when the Cathedral replacement matches.
- Scope list interaction colors to Cathedral Nocturne only.
- Style project folders and individual session rows through Codex's existing semantic list interaction tokens where available, with narrowly scoped structural fallbacks only when live DOM evidence requires them.
- Keep normal rows transparent. Use a restrained gold-tinted surface for hover and a stronger gold-tinted surface plus inset gold line for the current selection.
- Do not add animation, layout shifts, new wrappers, or JavaScript-driven hover behavior.

## Visual Treatment

### Sites glyph

The glyph is a compact rose window divided into four readable cells. It uses the existing Cathedral navigation palette and transparent padding, and remains legible at the native 16–20 CSS-pixel size. It must look related to the Scheduled rose-window clock without becoming visually identical to it.

### Project and session rows

- Default: retain the native transparent or inherited surface.
- Hover: blend the Cathedral accent into the dark sidebar surface at 16%, with no external shadow.
- Selected/current: blend the accent into the dark sidebar surface at 24% and add a one-pixel inset line using a 42% accent blend.
- Focus-visible: retain the global Cathedral two-pixel gold focus ring; hover/selected styling must not obscure it.
- Text and icons: retain native readable foreground colors. The feature changes surface and border treatment only.

Hover must remain visibly quieter than the selected state. Any later visual adjustment requires updating this specification and the CSS contract together.

## Architecture

The new SVG master and deterministic PNG follow the existing Cathedral asset pipeline. `theme.json`, the generated icon list, package contract, preview generator, and website screenshot all consume the same `icon-sites` file.

The live selector contract records `icon-sites` in Home and Session with an exact match count of one. The shipped CLI's audited catalog warning allow-list receives the same named selector so a known decorative warning remains bounded without weakening private-theme validation.

List states are CSS-only and remain under the active Cathedral theme root. Token overrides are preferred because they follow Codex's own hover/selected application logic. A structural rule is acceptable only for a live-confirmed row type that does not consume the semantic tokens, and must be covered by a selector or CSS contract test.

## Failure Behavior

- If the Sites selector no longer matches, Codex keeps its native Sites icon and reports a named compatibility warning.
- If the selector matches more than one control, verification fails and release is blocked.
- Missing or malformed `icon-sites` fails asset generation or packing.
- If a row class changes, native Codex hover remains available; no row becomes noninteractive or invisible.
- Restore removes the Sites replacement and all Cathedral list-state overrides with the rest of the theme.

## Testing and Acceptance

Implementation follows test-first development:

1. Add failing asset and manifest-contract expectations for `icon-sites`.
2. Add a failing selector-contract expectation for the second navigation button and verify the live probe reports one match.
3. Add failing CSS-contract expectations for Cathedral-scoped project/session hover and selected states.
4. Implement the smallest asset, manifest, selector, and CSS changes that satisfy those tests.
5. Regenerate the packed theme and website preview from the shared assets.
6. Run focused tests, full repository checks, and production build.
7. Apply through the CodexTheme local workflow and visually verify Home and Session: Sites is gold, project/session hover is gold-tinted, current selection is distinct, keyboard focus remains visible, and no other navigation icon changes semantics.

## Out of Scope

- Replacing secondary icons outside the established Cathedral pack.
- Applying the interaction palette to Crimson Procession, Silver Reliquary, or private uploaded themes.
- Changing list spacing, typography, row height, labels, ordering, or navigation behavior.
- Introducing runtime DOM mutation or JavaScript hover handlers.
