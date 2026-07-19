# Adaptive Skin Recipes Design

## 1. Outcome

The private custom-skin studio will graduate from a wallpaper editor into an adaptive Codex skin generator. A visitor still uploads one image, but the result changes the visual system around that image: background treatment, sidebar, main surface, header, composer, selected states, code surfaces, borders, shadows, and accent hierarchy.

The product promise becomes:

> Upload any image, choose a visual system, and generate a complete Codex skin.

The release remains English-first, private, account-free, and local-preview-first. It does not generate arbitrary CSS, redesign Codex information architecture, or depend on an AI service.

## 2. Product Decision

The three styles are **prebuilt adaptive recipes**, not three fixed themes. Each recipe defines how Codex UI roles should respond to an image. The uploaded image supplies the colors and visual characteristics; the recipe supplies the composition rules.

The system recommends one recipe, but never locks the visitor into that choice. All three are visible and switchable in the browser preview before anything is uploaded.

This hybrid approach is selected over:

- fixed presets, which are fast but make different uploads look too similar;
- arbitrary sliders, which expose complexity without guaranteeing a good result;
- AI-generated CSS, which is slower, unpredictable, difficult to validate, and fragile across Codex updates.

## 3. User Journey

The existing private-skin path remains intact with one new decision layer:

1. The visitor uploads a JPEG, PNG, or WebP image.
2. The browser processes the image locally and derives an image profile.
3. The studio recommends one of three recipes and immediately renders it in the Codex Home preview.
4. The visitor switches among **Cinematic**, **Glass**, and **Focus** to compare the complete treatment.
5. Optional **Advanced adjustments** expose the existing visibility, overlay, blur, zoom, and image-position controls.
6. The visitor checks both Home and Session previews.
7. **Create private skin** uploads only the processed image and normalized settings, including the selected recipe.
8. The server independently rebuilds the image profile, applies the selected recipe, and creates the data-only package.
9. The existing pinned npm command applies, reapplies, verifies, and restores the skin without a new CLI command or protocol.

The dominant choice after upload is the style recipe. Crop and correction controls are secondary and collapsed by default.

## 4. Image Profile

The browser and server use the same pure image-analysis rules over a bounded 32 by 32 opaque RGB sample. The browser obtains pixels from canvas; the server obtains them from Sharp after orientation normalization. Decode and resize implementations may produce small channel differences, but the same classifier and palette functions run on both sides.

The profile contains only derived visual values and is never uploaded as user metadata:

- `primary`: saturation-weighted dominant color;
- `secondary`: the most distinct populated hue bucket from the primary;
- `highlight`: a readable brightened accent derived from the stronger of the primary and secondary colors;
- `luminance`: mean relative luminance from 0 to 100;
- `saturation`: mean channel spread from 0 to 100;
- `contrast`: luminance standard deviation normalized from 0 to 100;
- `complexity`: mean adjacent-pixel color distance normalized from 0 to 100;
- `recommendedRecipe`: `cinematic`, `glass`, or `focus`.

Transparent pixels are ignored. Near-black and near-white pixels remain part of luminance and complexity calculations but receive low weight when choosing chromatic colors. When no useful chromatic sample exists, the system uses a neutral blue-gray fallback rather than inventing a saturated color.

### 4.1 Recommendation rules

Recommendation is deterministic and intentionally simple:

1. Recommend **Focus** when `complexity >= 58`, `luminance >= 76`, or `contrast >= 72`. Busy, very bright, or extremely contrasty images need more opaque working surfaces.
2. Otherwise recommend **Glass** when `complexity <= 34` and `contrast <= 48`. Calm images can remain visible through lighter translucent surfaces.
3. Recommend **Cinematic** for the remaining images. It is also the fallback when analysis cannot produce a valid profile.

The recommendation is guidance, not an automated final choice. The UI labels it `Recommended for this image` and preserves any explicit user selection.

## 5. Adaptive Recipes

Each recipe converts the profile into semantic theme tokens. It does not target individual content strings or add decorative DOM. Values below are recipe baselines; automatic overlay correction may add up to 14 percentage points for bright images while remaining inside the public settings limits.

### 5.1 Cinematic

Purpose: strongest transformation and screenshot appeal without sacrificing legibility.

- Background visibility: 84%.
- Overlay baseline: 38%.
- Background blur: 0 px.
- Sidebar surface: 78% opaque, 20 px backdrop blur.
- Main surface: 32% opaque, 8 px backdrop blur.
- Header surface: 60% opaque, 18 px backdrop blur.
- Composer surface: 94% opaque, 22 px backdrop blur.
- Accent: high-energy highlight color with a visible selected-state wash.
- Border: 38% accent mix.
- Shadow: deep, wide, slightly tinted by the primary color.
- Shape: 12 px composer and selected-state radius.

### 5.2 Glass

Purpose: preserve more of calm artwork and produce an atmospheric, translucent workspace.

- Background visibility: 76%.
- Overlay baseline: 44%.
- Background blur: 1 px.
- Sidebar surface: 62% opaque, 26 px backdrop blur.
- Main surface: 20% opaque, 14 px backdrop blur.
- Header surface: 44% opaque, 24 px backdrop blur.
- Composer surface: 76% opaque, 28 px backdrop blur.
- Accent: softer secondary-to-highlight gradient used only where supported by stable selectors.
- Border: 30% highlight mix plus a restrained inner light edge.
- Shadow: medium neutral shadow.
- Shape: 16 px composer and selected-state radius.

### 5.3 Focus

Purpose: make a bright, busy, or high-contrast upload comfortable for long work sessions.

- Background visibility: 48%.
- Overlay baseline: 60%.
- Background blur: 6 px.
- Sidebar surface: 94% opaque, 10 px backdrop blur.
- Main surface: 82% opaque, 6 px backdrop blur.
- Header surface: 92% opaque, 10 px backdrop blur.
- Composer surface: 98% opaque, 12 px backdrop blur.
- Accent: primary accent used sparingly for focus, selection, and the submit control.
- Border: 18% neutral/highlight mix.
- Shadow: compact neutral shadow.
- Shape: 8 px composer and selected-state radius.

## 6. Theme Token Model

`deriveSkinRecipe(profile, recipeId)` returns a closed token object. The package builder consumes tokens rather than containing recipe conditionals throughout the CSS string.

The public token roles are:

- palette: `accent`, `accentSoft`, `surface`, `surfaceRaised`, `ink`, `mutedInk`;
- artwork: `visibility`, `overlay`, `blur`, `saturation`, `contrast`;
- chrome opacity: `sidebarAlpha`, `mainAlpha`, `headerAlpha`, `composerAlpha`, `codeAlpha`, `selectionAlpha`;
- chrome effects: `sidebarBlur`, `mainBlur`, `headerBlur`, `composerBlur`, `borderAlpha`, `shadow`, `radius`.
- icon material: `iconSurfaceAlpha`, `iconBorderAlpha`, `iconGlowAlpha`, and `iconGlyphOnAccent`.

The four blur roles remain separate because the recipe hierarchy depends on them: the sidebar, work surface, header, and composer should not collapse into one generic glass treatment. Before tokens reach the preview or generated package, the accent is adjusted only when necessary so it keeps at least a 4.5:1 contrast ratio against the derived surface.

The generated CSS maps those roles only to the stable compatibility selectors already used by the private skin package:

- `aside.app-shell-left-panel`;
- `main.main-surface`;
- `main.main-surface > header.app-header-tint`;
- `.composer-surface-chrome`;
- selected and interactive states under the owned root class;
- `pre`, `code`, and `[data-language]`;
- focus-visible controls;
- `.dream-home` and the fixed window background layer.

Native Codex icon shapes remain intact. The recipe changes their material treatment instead: navigation icons inherit the adaptive accent, while Home action icons receive a non-layout-shifting circular surface, border, and glow. Cinematic uses the strongest filled treatment, Glass uses a translucent ring, and Focus uses a restrained low-glow treatment. The browser mockup uses the same icon-material tokens as the generated package. The implementation must not select icons by localized labels, inject replacement SVG, change hit targets, or add padding that shifts native layout.

The feature will not replace icon shapes, fonts, navigation labels, component order, or Codex-owned interaction behavior. Missing recommended selectors remain non-fatal under the existing verification contract.

## 7. Settings and Reset Behavior

The closed settings schema adds one field:

```text
recipe: cinematic | glass | focus
```

The image profile is not accepted from the client. The server derives it again from the normalized image. Unknown recipes fall back to `cinematic`; unknown settings remain discarded.

When a recipe is selected:

- visual defaults for visibility, overlay, blur, and zoom update to that recipe;
- `positionX` and `positionY` are preserved;
- later manual adjustments are preserved while switching Home and Session;
- **Reset automatic settings** reapplies defaults for the current recipe and image profile;
- uploading a new image clears explicit recipe selection and uses the new recommendation.

## 8. Studio Interface

After image processing, a `Skin style` group appears before Advanced adjustments. It contains three equal recipe cards:

- name and one-sentence intent;
- a material slice that uses the current local image, focal position, artwork filters, and recipe-derived surfaces, with the derived palette as a fallback;
- selected state;
- one `Recommended for this image` label on the classifier choice.

Recipe selection updates the existing Codex mockup without a network request. Differences must remain visible at the current preview size in both Home and Session modes: sidebar opacity, main surface, composer weight, selected state, border, shadow, and background treatment all change together.

The existing sliders move into a native disclosure labeled **Advanced adjustments**. The upload and create buttons remain the only dominant actions. Mobile presents recipe cards in a horizontal scroll or single-column stack without shrinking tap targets below 44 px.

The sample state uses a representative image and defaults to Cinematic so first-time visitors see the strongest transformation before uploading.

While a replacement image is being decoded, recipe, adjustment, reset, and creation actions are disabled. Overlapping image decodes and theme-creation requests use revision gates so stale success or error responses cannot replace the current preview or command. Choosing the same source file again remains supported.

## 9. Preview and Final-output Parity

`CodexMockup` consumes the same `ImageProfile`, `recipeId`, and derived token object used by package construction. CSS custom properties carry the token values into the mockup. It must not maintain a separate set of hand-tuned recipe values.

Object URLs belong to the mounted studio rather than React state updaters. Replacing an image, abandoning a stale decode, or unmounting the studio revokes the corresponding Blob URL without allowing post-unmount state or analytics work.

The server remains authoritative for the final package. Because image decoders can differ slightly, exact hex equality between browser and server is not promised; recipe identity, opacity, hierarchy, and contrast behavior must match. The acceptable visual difference is a small color-channel variation, not a different recommended style or surface hierarchy for normal images.

## 10. Privacy, Security, and Compatibility

- Image analysis and all recipe previews happen locally before creation.
- The request continues to contain only `image` and normalized `settings` form fields. The API route uses the same closed recipe/settings allowlist and rejects malformed settings with a client error before invoking storage.
- Filename, profile, palette, dimensions, and source metadata are not uploaded as fields.
- The package remains data-only and rejects external CSS resources, executable content, and unknown manifest fields.
- The existing temporary ID, 24-hour expiry, private Blob storage, cache, reapply, restore, and safe error behavior do not change.
- No CLI release is required because the current CLI already validates and applies data-only theme packages with custom CSS.
- Existing Home/Session fixed-window background anchoring remains unchanged.
- Browser and server sampling are both bounded to 32 by 32 pixels; the service snapshots validated byte views before analysis and rejects oversized or spoofed sample buffers.

## 11. Analytics

Add one coarse event:

```text
custom_recipe_select { recipe: cinematic | glass | focus, recommended: yes | no }
```

No image profile, palette, filename, ID, dimensions, slider values, or temporary URL enters analytics. Existing upload, preview, creation, copy, and normalized error events remain unchanged.

Analytics is non-critical: every helper catches provider failures and returns `false`, so a missing or throwing `gtag` cannot interrupt upload, preview, creation, or clipboard behavior.

## 12. Testing and Release Gates

### 12.1 Pure contract tests

- Synthetic pixel grids produce deterministic profiles and stable recommendations at all three thresholds.
- Neutral, transparent, bright, dark, calm, and busy inputs produce bounded, readable tokens.
- All three recipe IDs normalize correctly; unknown values fall back safely.
- Each recipe produces materially different surface, background, and composer tokens.
- Manual controls clamp to their current limits and preserve focal position on recipe change.

### 12.2 Package tests

- All three generated packages pass the existing runtime validator and safety lint.
- CSS contains no remote URL, import, script, or unowned global selector.
- Every recipe maps the same stable selector set with different semantic token values.
- Final CSS retains the fixed Home/Session background coordinate system.
- The selected recipe is represented in the saved theme only through normalized settings and generated CSS; no executable recipe engine ships inside the theme package.

### 12.3 UI and build tests

- The sample renders Cinematic.
- A processed upload shows three keyboard-selectable recipe cards, all using the current local image, and exactly one recommendation.
- Switching recipes updates the same Home/Session preview without upload.
- Advanced adjustments are secondary and reset to current recipe defaults.
- Creation submits the selected recipe and no derived profile fields.
- Stale image/create results, unmount cleanup, throwing analytics, and same-file reselection fail safely.
- Existing crawlable home content, gallery, security, help, sitemap, GA4, responsive, and reduced-motion behavior stay intact.

### 12.4 Production smoke test

1. Upload one warm, moderately detailed image and compare all three recipes in Home and Session.
2. Confirm each result looks like a distinct complete skin rather than a different background opacity.
3. Create and apply the recommended recipe through the production command.
4. Verify the real Codex sidebar, header, composer, selected states, code surfaces, and background treatment match the preview hierarchy.
5. Switch between Home and Session and confirm the artwork does not shift.
6. Reapply offline, then restore twice.
7. Confirm GA4 receives only the coarse recipe event.

The release is not complete if a side-by-side screenshot of the official appearance and generated result can be explained only as a wallpaper change.

## 13. Explicitly Out of Scope

- AI-generated CSS or remote image classification;
- arbitrary user CSS;
- font, icon-shape, copy, or layout replacement;
- public upload gallery, accounts, or saved projects;
- manual color editing and multi-layer composition;
- object detection, face detection, or automatic focal-point detection;
- animation systems, particle effects, and decorative DOM injection;
- Windows and non-Codex targets;
- changes to the private storage or CLI lifecycle protocol.
