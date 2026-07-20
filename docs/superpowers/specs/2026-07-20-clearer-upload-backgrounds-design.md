# Clearer Upload Backgrounds Design

## Goal

Make uploaded idol, character, and portrait artwork visibly recognizable in every automatic skin recipe without adding subject detection or another user step.

## Scope

Change only the automatic recipe defaults used by the custom skin studio and generated private skins. Keep the existing three recipes, controls, image processing, API format, and manual adjustment ranges.

## Default Recipe Changes

| Recipe | Background visibility | Overlay darkness | Image blur |
| --- | ---: | ---: | ---: |
| Cinematic | 92% | 28% | 0px |
| Glass | 90% | 30% | 0px |
| Focus | 78% | 44% | 1px |

Brightness correction may still increase overlay darkness for unusually bright uploads, using the existing bounded correction. It must not change visibility or blur.

## Behavior

- New uploads receive the clearer defaults for their recommended recipe.
- Switching recipes applies the clearer defaults for the selected recipe.
- Reset automatic settings restores the clearer defaults.
- Preview cards, the full Codex mockup, and the generated private theme use the same normalized settings.
- Existing sliders remain available so users can darken, blur, zoom, or reposition the image manually.
- No face detection, focal-point detection, or new UI is introduced.

## Verification

- Unit tests assert the exact defaults for all three recipes and confirm brightness correction still works.
- Site tests confirm recipe switching and reset use the updated values.
- Runtime/package generation tests confirm the chosen settings are preserved in the generated theme.
- A local preview verifies that uploaded character artwork remains sharp while Codex controls remain readable.
