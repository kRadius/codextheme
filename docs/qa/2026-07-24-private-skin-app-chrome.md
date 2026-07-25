# Private skin app-chrome QA — 2026-07-24

## Result

Pass for the applicable Codex Home and populated Session interaction matrix at desktop
(`1920 × 1055`, DPR 2) and narrow (`1100 × 800`, DPR 2) viewports.

The audit used the running Codex renderer on CDP port `9335` without restarting the
application. It built and applied the private skin from the repository-local
`buildPrivateSkinPackage` and `@codextheme/runtime` sources on branch
`codex/private-skin-icon-hover`, with the product source baseline at commit
`bb2a833`.

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

Root verification confirmed the `codextheme-codex-skin` namespace and the corrected
accent before sampling any controls.

## Method

The repository QA script derives its targets from
`PRIVATE_SKIN_INTERACTION_FAMILIES`. Every sampled control is center-hit-tested, then
receives a real CDP pointer move and a `220 ms` hover settle. The script compares idle
and hover geometry plus computed root, `::before`, text-fill, glyph, background,
border, shadow, and filter values. Material is accepted only on one qualifying
control owner; nested action overlap and viewport clipping fail closed.

Menus were opened through a visible non-destructive sidebar menu trigger and closed
with Escape. The narrow viewport used CDP device metrics and was cleared afterward.
After every viewport change, the script waited for two animation frames, at least
`250 ms`, and stable root/body/main client/scroll-width readings before probing.
No message was sent and Enter was never pressed.

If React replaces a tagged control between idle and hover reads, the script reselects
once by the same selector, normalized text/attributes, and original candidate
ordinal. Every discarded attempt is recorded, and the family still fails unless its
minimum stable-sample requirement is met. The final Session run had zero discarded
attempts.

The Home suggestion section was initially hidden by a saved draft. With explicit
authorization, the script:

1. backed up the ProseMirror draft in memory and in a mode-`0600` temporary file;
2. cleared it through `Meta+A` and Backspace;
3. verified exactly four
   `.dream-home section[class~="group/home-suggestions"] button` controls and zero
   matching composer utility pills;
4. performed a reversible clear/restore preflight;
5. ran both Home cells;
6. restored through CDP `Input.insertText`, checked exact text and SHA-256, revisited
   Home for an independent persisted-value check, and only then deleted the backup.

The draft SHA-256 before, after, and on the independent re-read was
`631d15fc9704aa8bcb7681f85f35cf35a94790f22920d1de1ff124a502402e3e`.
The draft contents are intentionally absent from all QA artifacts.

The checked-in script additionally snapshots a contenteditable Selection as
editor-relative anchor/focus node paths, offsets, and direction. A future draft
mutation fails restoration if that valid snapshot cannot be reconstructed exactly.
The successful Home artifact predates this added selection assertion, so it is cited
only for its demonstrated exact text/hash and UI restoration evidence.

## Interaction matrix

| View | Viewport | Sidebar | Header | Summary | Menu | Home cards | Composer secondary | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Session | desktop | Pass (7) | Pass (4) | Pass (6) | Pass (2) | N/A | Pass (4) | Pass |
| Session | narrow | Pass (7) | Pass (4) | N/A — responsive noninteractive counterpart | Pass (2) | N/A | Pass (4) | Pass |
| Home | desktop | Pass (7) | Pass (4) | N/A | Pass (2) | Pass (4) | Pass (4) | Pass |
| Home | narrow | Pass (7) | Pass (4) | N/A | Pass (2) | Pass (4) | Pass (4) | Pass |

At desktop Session width, the exact summary selector matched 12 eligible, visible,
and center-hittable roots. Six stable controls were sampled and passed; idle native
gray `::before` surfaces were transparent and the hover owner used the corrected
accent.

At narrow Session width, the same selector still matched 12 eligible roots, which
rules out selector drift. After responsive layout settled, all 12 had
`pointer-events:none`, effective opacity `0`, zero viewport intersection, and failed
center hit-testing; all were fully outside the `1100 × 800` viewport. Root, body, and
main had no horizontal overflow, and the settled layout had zero clipped controls.
Because the desktop counterpart passed in the same run, summary and its direct
`::before` probe are explicitly recorded as N/A with reason
`responsive-noninteractive-confirmed-by-desktop-counterpart`, never as Pass.

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

All applicable sampled interactions had a material background, border, or shadow
owner and corrected visual text/glyph accent. The text assertion uses
`-webkit-text-fill-color` when Chromium uses it instead of the nominal computed
`color`.

No cell had horizontal root/body/main overflow or a control crossing the viewport
edge. Visual inspection found no clipped Home cards or composer actions.

## Restoration proof

The final Session-only run and successful bounded Home run reported Pass for:

- original populated Session and selected thread;
- physical viewport `1920 × 1055` at DPR 2;
- original `scripts` project context;
- original topmost Browser side panel;
- closed bottom panel (composer bottom restored);
- zero open menus and zero temporary QA attributes;
- pointer relocation;
- exact draft value/hash and independent persisted-value verification;
- removal of the mode-`0600` backup after equality.

The Session-only rerun did not navigate Home or read, clear, or rewrite the draft.

## Artifacts

- Session report:
  `/private/tmp/private-skin-app-chrome-session-reviewfix-20260725-r5/report.json`
- Home report:
  `/private/tmp/private-skin-app-chrome-home-final/report.json`
- Session screenshots:
  `/private/tmp/private-skin-app-chrome-session-reviewfix-20260725-r5/private-skin-app-chrome-session-desktop-1920x1055.png`
  and
  `/private/tmp/private-skin-app-chrome-session-reviewfix-20260725-r5/private-skin-app-chrome-session-narrow-1100x800.png`
- Home screenshots:
  `/private/tmp/private-skin-app-chrome-home-final/private-skin-app-chrome-home-desktop-1920x1055.png`
  and
  `/private/tmp/private-skin-app-chrome-home-final/private-skin-app-chrome-home-narrow-1100x800.png`

Temporary reports and screenshots are intentionally not committed.
