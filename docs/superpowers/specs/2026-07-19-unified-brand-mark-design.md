# Unified Brand Mark Design

## Problem

The public site currently presents two unrelated identity marks. The header and footer use a plain blue dot, while browser metadata points to a dark rounded-square C icon with a gold node. A visitor cannot reliably connect the browser tab, site chrome, and saved mobile shortcut to the same product.

## Decision

CodexTheme will use the selected Option A as its single brand mark: a dark rounded square containing an open cream C and one blue node. The node will use the existing site accent `#2354ff`; the old gold node will be removed.

The wordmark remains `codextheme.tech`. This change does not rename the product, alter typography, or start a broader brand redesign.

## Asset architecture

- Keep one canonical SVG asset at `apps/site/public/brand-mark.svg` and reference it from both visible site chrome and Next.js metadata.
- Render that SVG at exactly 22px beside the header and footer wordmark, replacing the current CSS blue dot.
- Produce a 180x180 Apple Touch Icon from the same geometry for platforms that require a raster icon.
- Keep explicit dimensions on visible images to prevent layout movement and use an empty `alt` value because the adjacent wordmark already names the destination.
- Use the new `/brand-mark.svg` asset URL so browsers do not keep showing the previous cached `/favicon.svg` after deployment.

## Scope

- Update the canonical brand-mark SVG to the chosen blue-node design.
- Replace both visible blue-dot marks in `SiteHeader` and `SiteFooter`.
- Update favicon and Apple Touch Icon metadata.
- Preserve the current wordmark, header height, navigation, footer structure, palette, and responsive breakpoints.
- Do not add animation, a PWA manifest, a new logo lockup, or additional branding sections.

## Expected behavior

- The browser tab, header, footer, and saved mobile shortcut visibly belong to the same site.
- The mark remains recognizable at 16px and clean at its 22px site size.
- Header and footer alignment remain stable on desktop and mobile.
- Screen readers announce the linked `codextheme.tech` wordmark once rather than repeating the decorative icon.

## Testing

- Add rendered-HTML assertions for the shared brand asset in the header and footer.
- Assert that metadata exposes the SVG favicon and Apple Touch Icon.
- Run the site test suite, type check, production build, and full monorepo check.
- Inspect the header at desktop and mobile widths and verify the deployed favicon from a fresh request.
