# Unified Private-Skin App-Chrome Interactions Design

## Problem

New private skins currently theme only a subset of Codex interaction roots. Project and session rows can receive a strong image-derived hover treatment, while top navigation, header controls, the Environment panel, Browser and Sources rows, menus, and some composer controls retain native gray hover or no visible feedback. The inconsistency makes the skin look partially applied.

The current accent can also be too close to gray. Increasing only the material opacity preserves that low chroma, so borders, labels, and icons remain visually weak even when hover coverage is expanded.

## Scope

This change applies to CSS and browser preview output generated for new private skins.

It covers Codex application chrome:

- the left-sidebar brand control, search, primary navigation, section actions, projects, folders, and sessions;
- top and header icon controls;
- Environment, Browser, Sources, and related summary-panel controls;
- verified menus and popovers;
- home suggestion cards;
- composer secondary controls.

It does not change:

- conversation content, links inside messages, code, diffs, file contents, or status-only elements;
- Send and other native primary actions;
- destructive, disabled, or `aria-disabled` controls;
- native geometry, hit targets, keyboard behavior, or control visibility;
- curated themes;
- private packages that have already been generated and stored.

Users must create a new private skin to receive this interaction system.

## Visual Direction

The approved direction is **B: medium-strong chroma correction**.

The generated accent remains traceable to the uploaded image. If the chosen image highlight is low-chroma, the generator raises it to a minimum useful chroma before applying the existing contrast correction against the skin surface. It does not replace the image hue with a fixed CodexTheme brand color.

The interaction system uses one semantic material across application chrome:

- an accent-tinted translucent surface;
- an accent edge;
- accent-colored text and glyphs;
- a bounded accent glow where the selected recipe permits it.

Compact icon-only controls use the same color and alpha tokens as rows, with a smaller glow footprint to respect their geometry. They are not given a separate visual language.

## Accent Derivation

`deriveSkinTokens` produces a contrast-safe interaction accent in this order:

1. Normalize the image profile.
2. Choose the image highlight as the preferred interaction hue.
3. If that highlight has HSL saturation below 4%, use the more saturated of the normalized secondary and primary colors as the hue source. If neither alternative reaches 4%, use the existing safe fallback highlight.
4. Raise HSL saturation only when it falls below the approved 42% medium-strong floor; already vivid colors remain unchanged.
5. Run the corrected candidate through the existing 4.5:1 foreground contrast correction against the derived surface.

The saturation floor is a generator constant rather than a user setting. The UI gains no new slider, API field, storage field, or installation step.

The existing recipe-specific hover alpha values remain:

| Recipe | Hover surface | Hover border | Hover glow |
| --- | ---: | ---: | ---: |
| Cinematic | 30% | 52% | 28% |
| Glass | 20% | 40% | 18% |
| Focus | 10% | 28% | 0% |

Chroma correction makes these alphas visibly useful without flattening the intended differences between recipes.

## Interaction State Contract

### Idle

Idle secondary controls retain native Codex foregrounds and surfaces. The generator does not paint every button or SVG by default.

### Hover

Every verified application-chrome interaction root receives the same semantic material:

- the whole hit target receives the surface and edge;
- its label and eligible interactive glyphs receive the interaction accent;
- recipe glow is bounded to the hit target;
- descendant action buttons are not given a second row-sized surface.

### Keyboard focus

`:focus-visible` receives the same material as hover plus the existing accessible two-pixel accent outline. Focus styling must remain visible when a control is also open or selected.

### Open

Controls with `[data-state="open"]` retain the hover material while their menu or popover is open. Verified menu and popover items use the same hover and focus material as the originating application-chrome controls.

### Selected

Selected or active navigation, project, folder, and session rows remain persistently themed. Selected state outranks hover so moving the pointer over a selected row cannot replace its state material with a weaker or different treatment.

### Disabled and dangerous

Disabled controls remain native and do not receive accent material. Destructive actions retain native danger semantics and are excluded from the generic application-chrome rule.

## Selector Architecture

The package builder groups selectors by verified interaction family instead of using a generic `button:hover`, `a:hover`, or `svg` rule:

1. `sidebar-chrome`: brand, search, primary navigation, section controls, projects, folders, and sessions.
2. `header-chrome`: verified top and header icon controls.
3. `summary-chrome`: verified Environment, Browser, Sources, and summary-panel rows and toggles.
4. `menu-chrome`: verified menu and popover item roots.
5. `home-chrome`: suggestion cards.
6. `composer-secondary`: verified secondary composer buttons.

Each family defines:

- its interactive root;
- its eligible label and glyph descendants;
- disabled and primary-action exclusions;
- selected or open-state ownership where applicable.

The interaction root owns the material. Native `::before` hover surfaces on verified summary rows are neutralized only for those rows before the shared material is applied. This prevents the right panel's gray pseudo-element from mixing with the theme surface.

Selectors fail closed: if a future Codex control does not match a verified family, it remains native rather than being caught by a broad fallback.

## Preview Parity

`CodexMockup` consumes the same corrected accent and semantic state tokens as the generated package.

The preview must demonstrate:

- a sidebar row;
- a project or session row;
- a header icon control;
- a summary-panel row;
- a menu item;
- a composer secondary control;
- a selected row beside a hovered row;
- an unchanged Send action.

All representative controls show the same material family. Geometry may change the glow footprint, but not the color, alpha, edge, or glyph contract.

## Compatibility and Failure Behavior

- Invalid image profiles continue to use the existing safe fallback colors.
- An achromatic image without a usable alternative image hue falls back to the existing safe highlight rather than inventing a random hue.
- Unmatched or newly introduced Codex controls remain native.
- Existing private links remain immutable.
- Reduced-motion behavior continues to reduce interaction transitions to effectively zero.
- Package schema, namespace, size limit, validation, and installation flow do not change.

## Verification

Automated tests must verify:

- low-chroma image profiles produce an accent at or above the approved saturation floor;
- already vivid image accents retain their hue and saturation;
- the corrected accent still meets the 4.5:1 contrast requirement against the derived surface;
- all six verified selector families are emitted;
- summary-panel native gray pseudo-material is neutralized only inside the verified family;
- hover, focus-visible, open, and selected states use the shared tokens;
- selected state outranks hover;
- Send, disabled, dangerous, content, code, diff, file, and status controls are excluded;
- no generic `button:hover`, `a:hover`, or global SVG material selector is emitted;
- preview and package use the same corrected accent and interaction tokens;
- existing security, namespace, schema, and size checks continue to pass.

Real-app QA must cover Home and a populated Session at desktop and narrow widths. The matrix includes the left sidebar, top controls, projects and sessions, Environment, Browser, Sources, menus, home cards, and composer secondary controls. For applicable controls, QA captures idle, hover, focus-visible, open, selected, disabled, and native-primary states.

Acceptance requires:

1. every verified application-chrome control has visible and consistent feedback;
2. left and right panels use the same theme material instead of theme color versus native gray;
3. low-chroma uploads still produce a recognizable image-derived accent;
4. icon and label colors synchronize with the interacted root;
5. selected state remains stable and stronger than hover;
6. no double surface, double border, clipped glow, exposed hidden action, geometry change, or content bleed appears;
7. website preview matches the generated private package.
