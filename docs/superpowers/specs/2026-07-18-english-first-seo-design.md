# CodexTheme English-First SEO Design

## Goal

Make `codextheme.tech` an English-first theme repository for international Codex Desktop users. The first release must improve search relevance for queries such as `codex theme`, `codex themes`, and `Codex Desktop themes` without adding keyword-stuffed copy or a multilingual routing system.

## Chosen approach

Convert the existing site to English and complete the missing technical SEO foundations. This sits between a metadata-only patch, which would leave the landing page inconsistent with English search intent, and a full localization system, which would add `hreflang`, translation, and duplicate-page maintenance before there is enough traffic to justify it.

The current visual system, theme artwork, URL structure, installation flow, analytics, robots rules, and sitemap remain unchanged.

## Language and content

- Set the document language to `en`.
- Translate the home page, theme detail pages, Help, Security, navigation, footer, and 404 page into natural English.
- Use English theme names and descriptions as the primary display and metadata values. Chinese theme names remain available in the catalog data but are not presented as the primary public copy.
- Keep the visual headline concise while naturally using the phrase `Codex themes` in the home-page H1.
- Describe the product as a growing repository of complete Codex Desktop themes with real Home and Session previews and one-command installation.
- Do not add filler copy, an arbitrary word-count target, or repeated exact-match keywords.

## Metadata and discovery

- Use the home-page title `Codex Themes for Codex Desktop | CodexTheme`.
- Write an English description focused on browsing real previews and installing a pinned release with one command.
- Add a self-referencing canonical URL for the home page while retaining the existing canonicals on theme, Help, and Security pages.
- Add a stable, square favicon and declare it through Next.js metadata.
- Add a `WebSite` JSON-LD block on the home page with the canonical URL, `CodexTheme` name, and `Codex Themes` alternate name.
- Retain existing Open Graph and Twitter images, but translate their title, description, and alt text.

## Page behavior and architecture

- No new routes, client-side data flow, account system, or localization layer are introduced.
- Theme preview toggles, install command copying, GA4 conversion events, GitHub submission, support email, and restoration instructions continue to work as before.
- The GitHub issue template URL is changed to an English title and body so international contributors land on an understandable form.
- Existing Next.js `Image` components continue using `fill`; their fixed-aspect-ratio containers already reserve layout space.

## Reliability and safety

- Installation and security copy must continue to state that the pinned CLI version is used, Codex.app is not modified, administrator access is not required, remote JavaScript is not accepted, and the official appearance can be restored.
- The independent-project and OpenAI non-affiliation notice remains visible in English.
- Structured data is static and contains no user-controlled values.

## Testing

Automated site tests will assert:

- the rendered document uses `lang="en"`;
- the home page includes the English title, description, H1, and a self-referencing canonical;
- a declared favicon is present and its asset is included in the build output;
- the home page contains valid `WebSite` JSON-LD with the expected name and canonical URL;
- core public pages no longer expose the previous Chinese navigation and headings;
- theme pages use English names and descriptions while retaining install commands;
- existing analytics, rendered-HTML, type-check, lint, and production build checks continue to pass.

## Out of scope

- Chinese/English language switching or `/zh` and `/en` routes;
- `hreflang` support;
- blog or SEO article generation;
- search, tags, pagination, accounts, or user uploads;
- redesigning the current visual language;
- changing the CLI, theme packages, or installation commands.

## Success criteria

The production build emits an English-first, crawlable site whose home page has a descriptive English title and H1, canonical URL, declared favicon, and `WebSite` structured data. Existing theme browsing, preview, installation, analytics, safety, and recovery flows remain functional.
