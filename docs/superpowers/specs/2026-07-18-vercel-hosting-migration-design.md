# Vercel Hosting Migration Design

## Goal

Make `apps/site` deployable as a standard Next.js application on Vercel while preserving the existing UI, routes, downloadable theme assets, and current OpenAI Sites deployment as a rollback target.

## Chosen approach

Use the existing Next.js App Router source directly and replace only the hosting-specific build layer:

- run development, production builds, and local production serving with the standard `next` CLI;
- remove Vinext, Vite, Wrangler, and Cloudflare Worker build dependencies from the site package;
- remove build files that exist solely to produce an OpenAI Sites/Cloudflare Worker artifact;
- use the repository-level npm lockfile and explicitly set the Turbopack filesystem root to the monorepo root;
- keep `.openai/hosting.json` so the existing Sites deployment remains identifiable and reversible, but do not load it in the Vercel build;
- connect Vercel to the existing GitHub repository with `apps/site` as the project root.

This is preferred over wrapping the Cloudflare Worker output for Vercel because native Next.js is the shortest supported deployment path and minimizes hosting-specific code.

## Alternatives considered

1. Deploy the current Vinext output to Vercel as a custom runtime. This preserves more build files but introduces an unnecessary compatibility layer and is harder to operate.
2. Export the site as fully static HTML. This would be simple to host, but it narrows future use of Next.js server features and image handling without providing a meaningful speed advantage for this migration.

## Runtime and data flow

GitHub remains the source of truth. Vercel builds `apps/site` with `next build`, creates preview deployments for branch changes, and serves the production deployment after promotion. Cloudflare remains authoritative DNS for `codextheme.tech`; SpaceShip remains the registrar.

No DNS record changes are part of this code migration. The existing `chatgpt.site` URL stays live during Vercel validation. After the Vercel preview is accepted, the apex DNS record can be switched to the exact target Vercel reports.

## Compatibility requirements

- All existing routes must render successfully in a production Next.js build.
- Theme artwork and `.codedrobe-theme` downloads under `public/` must remain present in the generated site.
- Existing page behavior and copy must not change.
- The site package must no longer require Cloudflare or Vinext packages to build.
- Native Next.js builds must not emit an ambiguous-workspace-root warning.
- Vercel must be able to detect the app as Next.js with `apps/site` selected as Root Directory and no custom build or output commands.

## Error handling and rollback

The DNS cutover is deferred until a Vercel production URL passes browser verification. If Vercel deployment fails, `codextheme.tech` continues pointing at Sites. If a problem is found after cutover, restoring the previous two Sites apex A records returns traffic to the current deployment.

## Verification

Automated verification will assert the Vercel-oriented package configuration, run the existing rendered-HTML tests, run TypeScript checks, and produce a fresh standard Next.js production build. The migration is complete only after those commands pass and the branch is pushed for Vercel to consume.
