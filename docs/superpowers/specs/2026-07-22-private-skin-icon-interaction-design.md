# Private Skin Icon Interaction Design

## Problem

Custom private skins currently apply accent-colored circular material, border rings, and glow to every SVG inside the home page and composer. In a real Codex toolbar this turns secondary controls into a row of equally prominent badges. The effect competes with the uploaded image, obscures Codex's native action hierarchy, and makes a generated skin feel less polished.

Curated themes can use bespoke icon treatments because their complete visual system is designed around known artwork. Private skins cannot infer whether an uploaded image depicts a person, anime character, landscape, product, or brand. Their icon treatment therefore needs to be a stable, content-independent interaction system.

## Scope

This change applies only to CSS and preview output generated for new private skins.

It does not change:

- the curated theme packages or their shared CSS;
- native Codex geometry, hit targets, keyboard behavior, or control visibility;
- non-interactive, status, file-type, and content icons;
- private theme packages that have already been generated and stored.

Users must generate a new private skin to receive the new behavior.

## Interaction Contract

### Default state

Secondary controls keep their native Codex shape, foreground, and hierarchy. A private skin must not permanently add a circular surface, ring, border, or glow to every icon.

Primary actions such as Send retain Codex's native persistent emphasis. The private skin generator does not identify primary actions with positional or generic SVG selectors and does not add another ring around them.

### Hover and keyboard focus

Hover and `:focus-visible` reveal the uploaded image's derived accent on the control being interacted with:

- icon-only buttons receive a translucent accent surface, a one-pixel accent border, an accent-colored glyph, and a bounded glow;
- text-bearing navigation rows and cards receive material on the whole interactive container, while their icon and label shift to the accent;
- the effect appears on the button or row hit target, not as a permanent background painted directly onto the SVG viewport;
- keyboard focus includes the same material plus the existing accessible focus outline.

Transitions use 160 ms for color, background, border, filter, and shadow. Existing reduced-motion handling reduces those transitions to effectively zero.

### Selected and active state

Persistent state remains visible without matching the strength of a primary action:

- selected navigation rows keep the existing low-alpha accent surface and inset accent edge;
- the selected row icon and label remain accent-colored;
- inactive neighboring controls return to their native default appearance.

### Exclusions

The generator must not style every SVG under `aside`, `main`, or the composer. It may target only verified interactive button, link, row, and card roots. Decorative and status glyphs remain untouched.

## Recipe Strengths

All three private-skin recipes share the same state model. They differ only in interaction intensity:

| Recipe | Hover surface | Hover border | Hover glow | Character |
| --- | ---: | ---: | ---: | --- |
| Cinematic | 30% | 52% | 28% | Most expressive, still secondary to the artwork |
| Glass | 20% | 40% | 18% | Balanced translucent feedback |
| Focus | 10% | 28% | 0% | Quiet productivity treatment |

Selected-row strength continues to use the existing recipe values of 24%, 16%, and 10% respectively.

The existing generic names become `iconHoverSurfaceAlpha`, `iconHoverBorderAlpha`, `iconHoverGlowAlpha`, and `iconHoverGlyphOnAccent` so their purpose cannot be misread as a permanent default treatment. Cinematic uses the dark surface color for its glyph over the stronger hover fill; Glass and Focus use the derived accent for their glyph over lighter fills.

## Surface Rules

### Sidebar

- Idle navigation icons and labels use native foregrounds.
- Hover and `focus-visible` style the entire verified row and synchronize its icon and label color.
- Selected rows retain the recipe's selected material.
- Row actions that Codex reveals only on hover remain hidden until Codex reveals them; no descendant opacity override is allowed.

### Home suggestion controls

- The whole suggestion card receives hover or focus material.
- The card icon changes color with the card, but does not receive a separate permanent badge.
- Existing native card geometry remains unchanged.

### Composer toolbar

- Idle secondary icon buttons remain native.
- Hover and `focus-visible` style only the targeted icon-button container.
- Send and other native primary actions are excluded from the generated secondary-control rule and retain their native persistent emphasis.

### Assistant and content icons

Icons inside messages, output, files, diffs, code, and status content do not inherit the interactive accent rule.

## Data Flow

1. Browser image analysis produces the same bounded color profile.
2. The selected recipe maps that profile to semantic surface tokens and hover-specific icon tokens.
3. The private-skin package builder writes narrowly scoped default, hover, focus, and selected rules.
4. `CodexMockup` consumes the same tokens and state model so the live browser preview matches the generated package.
5. The server stores the resulting immutable private package as before.

No new user setting, API field, storage field, or upload step is introduced.

## Compatibility and Failure Behavior

- Invalid image profiles continue to use the existing safe color fallback.
- If a native control does not match a verified interactive selector, it stays native rather than receiving a broad fallback style.
- The generator never guesses primary actions using `:last-child`, generic `button svg`, or localized text.
- Existing private links remain immutable and continue to install their original package.

## Preview Requirements

The browser preview must demonstrate the same hierarchy as the generated skin:

- idle controls are native and quiet;
- one representative hovered or focused control shows recipe-specific material;
- selected navigation remains persistently visible;
- Send remains the most prominent toolbar action;
- no preview-only icon badge may appear if the package does not generate it.

## Verification

Automated tests must verify:

- the three recipes expose the approved hover strengths;
- generated CSS contains no permanent SVG background or multi-ring shadow for home and composer icons;
- generated CSS scopes hover and `focus-visible` to verified interactive roots;
- selected sidebar state remains persistent;
- primary and non-interactive icons are excluded from secondary-control selectors;
- preview token usage matches package token usage;
- reduced-motion behavior remains intact;
- private package size, schema, namespace, and security checks still pass.

Real-app QA must cover both Home and a populated Session at desktop and narrow widths. For sidebar, home cards, and composer controls, capture idle, hover, focus-visible, selected where applicable, and native primary-action states. Acceptance requires unchanged geometry, no clipped controls, no exposed hover-only actions, no icon/text overlap, and readable contrast over representative light and dark uploaded images.

## Acceptance Criteria

The feature is complete when a newly generated private skin:

1. no longer displays a row of permanently materialized circular icons;
2. reveals image-derived theme feedback only on the control being hovered or keyboard-focused;
3. preserves selected state and native primary-action hierarchy;
4. leaves non-interactive icons unchanged;
5. matches the website preview;
6. passes automated package checks and the real-app interaction matrix.
