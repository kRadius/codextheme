# Cathedral Nocturne Icon Pack Design

## 1. Outcome

Cathedral Nocturne will become the first preset whose visual identity extends beyond wallpaper, color, and surface treatment. Eleven high-exposure native Codex icons will receive a coordinated **Cathedral Glyphs** set: antique-gold, illuminated-manuscript symbols designed specifically for this preset.

The installed theme and the website preview must use the same icon assets. The change must preserve Codex behavior, layout, labels, keyboard focus, accessible names, and click targets. If Codex changes a selector, the affected native icon remains visible rather than becoming blank or breaking its control.

This is a one-theme pilot. It establishes a safe and repeatable icon-pack pipeline before any equivalent work begins for the other presets.

## 2. Decisions

- Pilot only on `cathedral-nocturne`.
- Replace exactly 11 high-exposure icon shapes in Home and shared navigation surfaces.
- Ship theme-owned local image assets; do not fetch icons from the network.
- Use the existing native SVG box as the rendering host instead of injecting DOM or replacing buttons.
- Keep native Codex icons as the automatic fallback when a selector does not match.
- Target stable structural attributes discovered from current Home and Session DOM snapshots; do not select by localized visible text.
- Use the same generated icon files in the real theme package and the gallery/detail preview.
- Validate the installed result through the CodexTheme npm CLI and real Codex Home and Session screens before release.
- Treat icon replacement as visual enhancement. A missed decorative anchor produces a named verification warning, while the rest of the theme remains usable.

## 3. Visual System

The pack is **Cathedral Glyphs / Illuminated Manuscript**. It should feel authored for Cathedral Nocturne rather than like a generic icon library recolored gold.

### 3.1 Construction rules

- Master artwork uses a consistent 24-unit drawing grid.
- Primary strokes use rounded or gently tapered ends with the visual weight of a 1.75-unit line.
- Outer silhouettes reference lancet arches, rose windows, quatrefoils, manuscript flourishes, and masonry tools without reducing legibility at small sizes.
- Palette is fixed to Cathedral Nocturne: antique gold, pale candlelight, and restrained umber shadow.
- Navigation and action glyphs are predominantly outlined; the primary Send action is the only strongly filled treatment.
- Transparent padding is identical across the set so icons do not appear to jump in their native boxes.
- The perceived glyph size is 16–20 CSS pixels inside Codex's existing icon boxes.
- Decorative detail must survive at 1× display scale. Hairlines, tiny text, and photographic textures are prohibited.

### 3.2 Icon set

| Asset id | Codex surface | Cathedral metaphor | Treatment |
| --- | --- | --- | --- |
| `icon-new-chat` | New chat | Open manuscript with a small creation spark | Gold outline |
| `icon-pull-requests` | Pull requests | Branching tracery joining into one stem | Gold outline |
| `icon-scheduled` | Scheduled | Rose-window clock with one emphasized hand | Gold outline with candlelight center |
| `icon-plugins` | Plugins | Interlocking quatrefoil and plug prongs | Gold outline |
| `icon-project-folder` | Selected project/folder | Archive folio beneath a shallow cathedral arch | Gold outline |
| `icon-explore` | Explore action card | Astrolabe/compass star | Gold glyph on subtle dark-gold medallion |
| `icon-build` | Build action card | Crossed mason's hammer and chisel | Gold glyph on subtle dark-gold medallion |
| `icon-review` | Review action card | Illuminated eye with a check-shaped lower flourish | Gold glyph on subtle dark-gold medallion |
| `icon-fix` | Fix action card | Restoration key crossed with a small wrench | Gold glyph on subtle dark-gold medallion |
| `icon-add` | Composer add/local-workspace control | Compact quatrefoil plus | Gold outline |
| `icon-send` | Composer submit control | Ascending lancet arrow | Dark glyph inside the existing filled gold control |

The medallion treatment belongs inside the icon bitmap and must not add padding, margin, or a new wrapper to Codex controls.

## 4. Asset Architecture

Editable masters live with the preset under `themes/cathedral-nocturne/icons-src/`. A deterministic build step renders transparent PNG assets under `themes/cathedral-nocturne/assets/icons/` at a fixed square resolution suitable for 1× and 2× display rendering. The generated files are committed so package creation, website preview generation, and tests do not depend on a design service.

Cathedral Nocturne's theme manifest adds the 11 image ids from the table to its existing `hero` and `session-bg` entries. The package therefore contains 13 images, below the existing limit of 32. Other presets retain their current two-image contract during the pilot.

The packer must evolve from a global `hero,session-bg` equality check to a per-theme image contract:

- every theme must contain `hero` and `session-bg` exactly once;
- Cathedral Nocturne must additionally contain all 11 icon ids exactly once;
- non-pilot themes must not acquire Cathedral icon ids;
- every image must resolve to a local, packaged file;
- unknown, duplicate, external, or missing image references fail the build.

The runtime already exposes packaged image ids as CSS image variables. The icon CSS consumes those variables; it must not introduce data URLs by hand, remote URLs, filesystem paths, or runtime downloads.

## 5. Safe Native-icon Replacement

The pilot uses CSS replacement on the native Codex SVG element:

1. Scope every rule to the active Cathedral Nocturne theme root.
2. Match the stable structural anchor for one intended control.
3. Apply the corresponding packaged icon variable as the existing SVG element's centered, contained, non-repeating background image.
4. Make only the SVG's native drawing children transparent.
5. Leave the SVG box, button, link, wrapper, text label, focus ring, event handlers, and accessibility tree untouched.

Conceptually, each rule has this form:

```css
html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]
  <stable-control-anchor> svg {
  background-image: var(--codedrobe-image-icon-example);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

html.codedrobe-codex-skin[data-codedrobe-theme="cathedral-nocturne"]
  <stable-control-anchor> svg > * {
  opacity: 0 !important;
}
```

This approach is intentionally narrower than pseudo-element injection or DOM mutation. If the structural anchor stops matching, neither rule applies and the native glyph remains. If an icon image is missing, packaging fails before publication.

Per-theme rules remain in `themes/shared/codex.css` for the pilot, guarded by the Cathedral theme id. Introducing a new CSS composition system for one preset would add migration risk without improving the first release. The location should be reconsidered after three or more presets own independent icon packs.

## 6. Selector Discovery and Compatibility

Implementation starts by capturing fresh live DOM snapshots from both Codex Home and Session views. For each icon, selectors are chosen in this order:

1. stable `data-*` identifiers intended for feature or test ownership;
2. semantic `href`, `role`, or durable control attributes;
3. structural classes already included in the supported Codex compatibility surface;
4. positional structure only when no safer anchor exists and a match-count assertion can contain it.

Localized labels such as `New chat`, `新建任务`, or any theme title must never appear in production selectors. Hashed build classes and brittle complete class chains are also prohibited.

Each selected anchor records its expected surface and match count in a compatibility fixture. Automated snapshot probes must detect both failure modes:

- **under-match:** an expected icon anchor is absent;
- **over-match:** an icon selector affects more controls than its recorded contract.

Under-match is a non-destructive compatibility warning because the native icon remains visible. Over-match blocks release because the wrong control could receive the wrong symbol.

## 7. Website Preview Parity

The Cathedral gallery card and theme detail preview must read the same generated icon PNG files used by the installed package. The preview generator embeds those assets into its synthetic Codex frame instead of drawing generic squares, circles, folders, or plus marks.

Preview composition may position the icons to simulate Codex, but it must not redraw or substitute them. A deterministic preview build test verifies that all 11 asset ids appear in the Cathedral preview input and that repeated builds produce identical output.

The detail page should show enough resolution to inspect the sidebar, four Home action cards, folder state, composer Add control, and Send control. Marketing screenshots must be taken from either the parity preview or a real installed-theme capture; hand-enhanced icon artwork that cannot be installed is not allowed.

## 8. Failure and Fallback Behavior

- Selector no longer matches: keep the native Codex icon and report the named compatibility warning.
- Selector matches too broadly: fail verification and block publication.
- Icon asset is absent, duplicated, external, malformed, or not declared: fail packing and tests.
- Packaged image cannot resolve at runtime: restore/fallback validation fails; the release does not proceed.
- One decorative icon warning does not disable background, colors, surfaces, or other theme behavior.
- Theme restore removes all Cathedral icon rules with the rest of the active theme and returns to native Codex appearance.

No icon failure may hide labels, remove focus indicators, change a click target, shift surrounding layout, or make a control unusable.

## 9. Testing and Acceptance

### 9.1 Build and contract tests

- Cathedral manifest contains the 13 expected image ids and no duplicates.
- Every other preset continues to satisfy its existing image contract.
- All icon sources are local and package inspection reports no external resource.
- Package limits remain within 32 images and 30 MB.
- CSS rules are scoped to Cathedral Nocturne and use only the approved background properties plus native-child opacity.
- No icon selector contains localized visible text or hashed build-only classes.
- Preview generation consumes all 11 shared icon files and remains deterministic.

### 9.2 Real Codex verification

Apply the packed Cathedral Nocturne preset through the current `@codextheme/cli` workflow and verify:

- Home displays all 11 intended glyphs where those controls are present;
- Session keeps shared navigation/composer glyphs aligned and does not apply Home-only icons to unrelated controls;
- sidebar rows, action cards, composer controls, and selected project retain their native dimensions;
- button hit areas, labels, hover, focus-visible, disabled, and selected states still work;
- background anchoring does not shift while navigating between Home and Session;
- restore returns every icon to the native Codex glyph;
- a deliberately unmatched compatibility fixture leaves a native icon visible;
- screenshots at 1× and 2× show crisp glyphs with no clipping or unexpected blur.

### 9.3 Release gate

The release is accepted only when the repository test suite, type checks, lint/build, theme packing/inspection, DOM compatibility probes, and the real Home/Session smoke test all pass. Visual similarity in the website preview alone is not sufficient.

## 10. Release Sequence

1. Capture and commit sanitized Home and Session compatibility fixtures.
2. Add the 11 Cathedral Glyph source assets and deterministic rendered assets.
3. Extend manifest and packer contracts for per-theme optional icon sets.
4. Add guarded icon CSS and automated selector probes.
5. Update the Cathedral preview generator and website imagery from the shared assets.
6. Pack and inspect Cathedral Nocturne as theme version `1.1.0`.
7. Run full automated verification and real Codex Home/Session apply-and-restore smoke tests.
8. Rebuild the bundled theme distribution and publish the backward-compatible `@codextheme/cli@0.2.4` patch through the CodexTheme npm organization.
9. Update the website install command and deploy the verified preview/detail pages to production.
10. Monitor apply failures and named selector warnings before approving icon packs for additional presets.

No package protocol change or migration is required for existing users. Older presets and restore behavior remain compatible.

## 11. Out of Scope

- Replacing every icon in Codex.
- Customizing labels, typography, component order, navigation structure, or interaction behavior.
- Creating icon packs for the other presets in this release.
- Generating icons dynamically from user-uploaded images.
- Using character/IP artwork, web fonts, external icon CDNs, runtime SVG injection, or network design services.
- Hiding native icons globally when an exact Cathedral replacement is unavailable.
