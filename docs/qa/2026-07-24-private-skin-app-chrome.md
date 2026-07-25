# Private skin app-chrome QA — 2026-07-25

## Result

Pass from one uninterrupted schema-v2 run covering the populated Codex Session and
Home at desktop (`1920 × 1055`, DPR 2) and narrow (`1100 × 800`, DPR 2)
viewports.

The run used the current `codex/private-skin-icon-hover` branch and the running Codex
renderer on CDP port `9335`; the app was not restarted. The private skin was built
from the repository-local `buildPrivateSkinPackage` and
`@codextheme/runtime` sources.

## Deterministic fixture

| Input | Value |
| --- | --- |
| id | `mqa20260725.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |
| exportedAt | `2026-07-25T00:00:00.000Z` |
| primary / secondary / highlight | `#3e372f` / `#8d6a45` / `#948475` |
| luminance / saturation / contrast / complexity | `38` / `12` / `24` / `18` |
| recipe | `cinematic` |
| visibility / overlay / blur / zoom | `92` / `28` / `0` / `108` |
| position | `50% 50%` |
| corrected accent | `#b88351` |
| surface | `#0f1012` |
| corrected accent saturation | `42.0408163265306%` |
| accent-to-surface contrast | `5.804589345079688:1` |

Root verification confirmed the `codextheme-codex-skin` namespace and corrected
accent before control sampling.

## Method

The QA script derives targets from `PRIVATE_SKIN_INTERACTION_FAMILIES`. Every
sampled control is center-hit-tested, receives a real CDP pointer move, and settles
for `220 ms`. It compares idle and hover geometry and computed root, `::before`, and
glyph properties. A passing interaction requires one qualifying material owner,
the corrected text/glyph accent, stable geometry, and no nested-action overlap or
viewport clipping.

Exclusion matches are resolved to their nearest interactive owner before testing.
The root, `::before`, and glyph must remain free of private accent text, text fill,
surface, border, shadow, glow, and filter effects, with no private material owner.
Send and disabled controls additionally require stable computed styling.

Menus were opened through a visible non-destructive sidebar menu trigger and closed
with Escape. Every viewport change settled for two animation frames, at least
`250 ms`, and stable root/body/main client and scroll widths. No message was sent
and Enter was never pressed.

The Browser panel was controlled only through the single visible semantic
`button[aria-label="显示/隐藏侧边栏"][aria-pressed]`; its pressed state was checked
against actual panel visibility before use.

The saved Home draft had a valid restorable ProseMirror selection before any draft
mutation. With explicit authorization, the run saved it in memory and in an
ephemeral mode-`0600` file, cleared it by keyboard input, verified the four Home
suggestion cards, and performed a reversible preflight. Final restoration verified
exact draft-value equality plus selection paths and offsets, direction, focus, and
editor scroll positions. An independent persisted-value reread also matched exactly
before the temporary backup was deleted. Draft contents and content-derived
metadata are absent from the report and console output.

## Interaction matrix

| View | Viewport | Sidebar | Header | Summary | Menu | Home cards | Composer secondary | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Session | desktop | Pass (7) | Pass (4) | Pass (6) | Pass (2) | N/A | Pass (4) | Pass |
| Session | narrow | Pass (7) | Pass (4) | N/A — responsive noninteractive | Pass (2) | N/A | Pass (4) | Pass |
| Home | desktop | Pass (7) | Pass (4) | N/A | Pass (2) | Pass (4) | Pass (4) | Pass |
| Home | narrow | Pass (7) | Pass (4) | N/A | Pass (2) | Pass (4) | Pass (4) | Pass |

All families had zero discarded samples. At desktop Session width, the exact
summary selector matched 12 eligible, visible, center-hittable roots; six sampled
controls passed, including native `::before` replacement.

At narrow Session width, the same selector still matched 12 eligible roots. Each
root independently had `pointer-events:none`, effective opacity `0`, and a confirmed
hidden ancestor state; there were zero visible or hittable roots. Offscreen position
alone is not accepted as N/A evidence. The desktop counterpart passed in this same
run, layout had settled, root/body/main had no horizontal overflow, and no control
crossed the viewport edge. Summary is therefore recorded as N/A with reason
`responsive-noninteractive-confirmed-by-desktop-counterpart`.

## Direct and exclusion probes

| Probe | Session desktop | Session narrow | Home desktop | Home narrow |
| --- | --- | --- | --- | --- |
| selected Session persistence | Pass | Pass | Not observed | Not observed |
| grouped row single owner / no overlap | Pass | Pass | Pass | Pass |
| summary native `::before` replacement | Pass (6) | N/A — responsive noninteractive | Not observed | Not observed |
| Send / primary unchanged | Pass | Pass | Pass | Pass |
| disabled unchanged | Pass | Pass | Pass | Pass |
| danger | Not observed | Not observed | Not observed | Not observed |
| status | Not observed | Not observed | Not observed | Not observed |
| content | Not observed | Not observed | Not observed | Not observed |
| code | Not observed | Not observed | Not observed | Not observed |
| diff | Not observed | Not observed | Not observed | Not observed |
| file | Not observed | Not observed | Not observed | Not observed |

Send, selected Session, grouped-owner, and desktop-summary probes are required and
fail closed when missing. Danger, status, content, code, diff, and file exclusions
are optional observations; they are explicitly reported as `Not observed` above.

## Restoration and privacy proof

The run reported Pass for:

- exact original populated Session selection and route;
- exact physical viewport;
- zero final open menus after an initial zero-menu preflight;
- original Browser panel and bottom-panel geometry;
- original Home project context;
- exact draft/editor state and independent persisted-value equality;
- deletion of the temporary draft backup;
- zero temporary QA attributes and pointer relocation.

The schema-v2 report redacts renderer title and URL and does not persist the selected
task identifier, project text, draft content, or draft-derived metadata. The
artifact directory is mode `0700`; its report and screenshots are mode `0600`.

## Verification

- `node --check scripts/qa-private-skin-app-chrome.mjs`
- `git diff --check`
- `npm test`: 13 root tests, 42 CLI tests, 45 runtime tests, and 97 site tests pass.

## Artifacts

- Full schema-v2 report:
  `/private/tmp/private-skin-app-chrome-v2-full-20260725/report.json`
- Session screenshots:
  `/private/tmp/private-skin-app-chrome-v2-full-20260725/private-skin-app-chrome-session-desktop-1920x1055.png`
  and
  `/private/tmp/private-skin-app-chrome-v2-full-20260725/private-skin-app-chrome-session-narrow-1100x800.png`
- Home screenshots:
  `/private/tmp/private-skin-app-chrome-v2-full-20260725/private-skin-app-chrome-home-desktop-1920x1055.png`
  and
  `/private/tmp/private-skin-app-chrome-v2-full-20260725/private-skin-app-chrome-home-narrow-1100x800.png`

Temporary reports and screenshots are intentionally not committed.
