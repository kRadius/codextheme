# Curated Theme Interaction Design

**Date:** 2026-07-21  
**Status:** Approved visual direction; awaiting written-spec review

## Goal

Make every bundled CodexTheme preset feel more distinctive by strengthening its
theme-colored borders, hover states, and selected states without obscuring the
background artwork or reducing text readability.

## Selected Direction

Use the approved **B · Noticeable** interaction treatment. All curated themes
share the same interaction hierarchy while inheriting their own existing accent
color. Cathedral Nocturne remains gold, Crimson themes remain red, Silver
Reliquary remains silver-blue, and the remaining presets keep their catalog
accents.

## Visual Tokens

The shared curated-theme CSS will expose three derived interaction tokens:

- `--codextheme-line-strong`: 48% accent, used for prominent
  structural and interactive borders.
- `--codextheme-hover`: 16% accent, used for hover backgrounds.
- `--codextheme-selected`: 21% accent, used for selected or active
  backgrounds.
- `--codextheme-glow`: 14% accent, used for restrained hover and
  selected-state glow.

The existing 32% line token remains for low-priority separators. Main
panel boundaries, the composer, home cards, and interactive rows use the stronger
line where that distinction improves hierarchy.

## Interaction Scope

The shared Codex stylesheet will style only stable, observed Codex surfaces:

- Project rows and conversation/task rows in the left sidebar.
- Their current/selected states.
- Home action cards.
- Composer and primary themed container borders.

Hover states receive the hover background, stronger border, subtle glow, and a
3px accent edge implemented with an inset shadow. Selected states
use the selected background and a clearer version of the same treatment. The
rules must not broadly recolor every button, link, or arbitrary focusable element
in Codex.

Keyboard focus continues to use the existing explicit accent outline. Motion is
limited to short color, border, shadow, and transform transitions and remains
disabled by the existing `prefers-reduced-motion` rule.

## Preview Parity

Generated website previews must display the same B-level hierarchy:

- stronger theme-colored container and composer borders;
- one visibly hovered sidebar row and one selected row;
- one visibly hovered home card;
- restrained glow rather than neon bloom.

Preview-only decoration must not imply an interaction that the installed theme
does not provide.

## Compatibility and Safety

- The change applies only to bundled curated themes. Private uploaded themes keep
  their recipe-specific interaction system.
- Selectors must be based on the current verified Codex DOM and remain scoped
  under `html.codextheme-codex-skin`.
- Theme application, restoration, package format, and image handling are
  unchanged.
- Existing text contrast and background sharpness remain unchanged.

## Verification

1. Add a failing CSS contract test for the new interaction tokens and scoped
   hover/selected rules.
2. Add or update preview-generation assertions so the previews reflect the
   stronger border hierarchy.
3. Rebuild all bundled theme packages.
4. Run the complete repository check.
5. Reapply one bundled theme locally and inspect computed styles in the live Codex
   renderer for default, hover, and selected states.
6. Compare the live result against the approved B visual direction before
   release.

## Out of Scope

- Replacing icons or changing the Codex layout.
- Adding user-adjustable hover-strength controls.
- Changing uploaded private-theme recipes.
- Introducing animations beyond short native-feeling state transitions.
