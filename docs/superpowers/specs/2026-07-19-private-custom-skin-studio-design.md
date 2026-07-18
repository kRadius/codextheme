# Private Custom Skin Studio Design

## 1. Outcome

CodexTheme's home page will lead with a private custom-skin generator instead of asking visitors to choose among three ready-made themes. The primary promise is:

> Turn any image into a Codex skin, preview it instantly, and apply it with one command.

The three existing themes remain below the studio as ready-made inspiration, SEO landing pages, and a no-upload alternative. They are no longer the product's main attraction.

The first release is English-first, supports Codex Desktop on macOS, requires no account, and does not publish user uploads to a gallery.

## 2. User Journey

The complete path stays on the home page:

1. The visitor sees a polished sample image rendered inside a realistic Codex Home preview.
2. They drag or choose a JPEG, PNG, or WebP image.
3. The browser strips orientation metadata through canvas rendering, creates a local preview, and derives a safe dark palette.
4. The visitor can switch between Home and Session previews and optionally adjust:
   - background visibility;
   - overlay darkness;
   - blur;
   - image position and zoom.
5. Clicking **Create private skin** uploads only the processed image and normalized settings.
6. The service returns an unguessable temporary ID and a pinned command.
7. The site copies the command and shows the expiry and recovery instructions.
8. The CLI downloads, validates, caches, applies, and verifies the theme.

The command shape is:

```bash
npx --yes @codextheme/cli@0.2.0 apply-private <temporary-id>
```

The temporary link stops working 24 hours after creation. The CLI cache means an already-applied private skin can still be reapplied after the remote copy expires.

## 3. Home-page Structure

The existing featured-theme hero is replaced by a studio-first hero:

1. Header navigation: `Create a skin`, `Gallery`, `Install help`, `GitHub`.
2. Hero copy: `Turn any image into a Codex skin.`
3. Studio: upload control and compact editor beside a realistic Codex preview.
4. Trust line visible before upload: `No account · Private temporary upload · One-command install`.
5. Ready-made gallery introduced as: `Need inspiration? Start with a ready-made skin.`
6. Three-step installation explanation.
7. Privacy, security, restore, and support links.

There is one dominant action in each state:

- before selection: **Choose an image**;
- after selection: **Create private skin**;
- after creation: **Copy apply command**.

The gallery remains server-rendered and crawlable. The hero contains natural phrases such as `custom Codex skin`, `Codex theme generator`, and `Codex Desktop theme` without keyword stuffing.

## 4. Browser Studio

`CustomSkinStudio` is a client component with three explicit states: `sample`, `editing`, and `ready`.

### 4.1 Local image handling

- Accepted inputs: JPEG, PNG, and WebP.
- Maximum source size: 10 MB.
- The browser decodes the source and draws it to canvas at no more than 2560 by 1600 pixels.
- The processed upload is WebP or JPEG at a bounded quality and maximum size of 4 MB.
- The original filename, EXIF, GPS, and other source metadata are never uploaded.
- Animated images, SVG, GIF, HEIC, malformed images, and dimensions below 800 by 500 are rejected with a specific message.

### 4.2 Automatic palette

The browser samples a downscaled canvas, rejects near-white and near-black outliers, and chooses a dominant accent. It then derives dark surfaces and foreground colors with fixed contrast floors. Palette generation is deterministic so the preview matches the generated theme.

The visitor does not edit individual colors in version one. This avoids turning the home page into a design application and protects readability.

### 4.3 Controls

The editor exposes only:

- Background visibility: 20–100%, default 72%.
- Overlay darkness: 0–80%, default chosen from image luminance.
- Blur: 0–16 px, default 2 px.
- Position and zoom: focal point plus 100–160% zoom.

Controls update Home and Session previews immediately. A `Reset` action returns to the automatic values.

## 5. Temporary Storage and API

The production implementation uses a private Vercel Blob store connected to the existing Vercel project.

### 5.1 Creation endpoint

`POST /api/private-skins` accepts multipart form data containing the processed image and normalized settings. It:

1. enforces content length and request time limits;
2. decodes the image with `sharp`, rejects malformed content, strips metadata, resizes again, and re-encodes it;
3. validates every numeric setting against a closed schema;
4. re-derives the palette server-side;
5. creates a cryptographically random ID with at least 192 bits of entropy;
6. builds a data-only `.codextheme-theme` package;
7. records SHA-256 hashes, creation time, and expiry time;
8. stores the package in private Blob storage;
9. returns only the ID, expiry, and pinned CLI command.

The endpoint never returns the private Blob URL.

### 5.2 Retrieval endpoint

`GET /api/private-skins/<id>` validates the ID and expiry, fetches the private blob, and returns a bounded package with `Cache-Control: no-store`. Expired IDs return `410 Gone`; unknown IDs return `404` without disclosing which part was invalid.

### 5.3 Expiry and deletion

- Logical access expires exactly 24 hours after creation.
- A protected Vercel Cron endpoint deletes expired blobs once per day.
- On Vercel Hobby, physical deletion may occur in the following daily cleanup window, so the public copy says: `The link expires after 24 hours; the stored file is deleted during the next cleanup window.`
- Retrieval and creation also opportunistically delete expired records encountered during normal traffic.

No upload appears in a public list, sitemap, analytics payload, log message, or predictable URL.

## 6. CLI 0.2.0

The CLI adds `apply-private <id>` without changing existing `apply`, `reapply`, or `restore` behavior.

### 6.1 Download and validation

The CLI accepts only IDs matching the documented base64url format and downloads only from the fixed `https://codextheme.tech/api/private-skins/` origin. It applies strict response-size and timeout limits, parses the theme with the existing runtime, runs the existing safety lint, and verifies the package hash before any Codex operation.

Remote CSS, JavaScript, external asset URLs, redirects to other origins, and unknown manifest fields are rejected.

### 6.2 Local cache and state

After validation, the CLI atomically stores the private package under:

```text
~/Library/Application Support/codextheme/private/<sha256>.codextheme-theme
```

Files and directories use owner-only permissions. State schema version two records the source type and local package hash, never the temporary ID or remote URL. `reapply` loads the cached package. `restore` removes the active state but keeps the cached package until a later bounded cache cleanup, allowing safe retry after a partial restore.

Existing schema-version-one states remain readable and are migrated only on the next successful apply.

### 6.3 Errors

New stable public errors are:

- `E_PRIVATE_NOT_FOUND` for an invalid or unknown ID;
- `E_PRIVATE_EXPIRED` for a 24-hour expiry;
- `E_PRIVATE_DOWNLOAD` for timeout or unavailable service;
- `E_PRIVATE_INVALID` for hash, schema, lint, or size failure;
- `E_PRIVATE_CACHE` for local persistence failure.

Errors do not print the ID, Blob URL, user path, stack, image metadata, or response body.

## 7. Privacy, Abuse, and Safety

- No account, cookies for identity, public gallery, or sharing page.
- GA4 records only coarse events: `custom_upload_selected`, `custom_preview_ready`, `custom_create_success`, `custom_command_copy`, and normalized error categories. It never receives IDs, colors, filenames, image data, or dimensions.
- The API accepts only processed raster images and data-only settings.
- Server re-encoding prevents polyglot files and removes metadata.
- Small upload and output limits cap storage and transfer exposure.
- The UI asks the visitor to upload only images they have permission to use.
- The security and help pages explain temporary retention, local caching, restore, and support at `codextheme@codextheme.tech`.
- The feature fails closed: if private storage, validation, or package creation fails, no command is shown.

Durable per-IP rate limiting and public-content moderation are intentionally out of scope because uploads are private and unlisted. If traffic or abuse justifies it, Turnstile and a durable rate-limit store are the next controls.

## 8. Components and Boundaries

The implementation is divided into focused units:

- `CustomSkinStudio`: state machine and accessible UI.
- `image-processing`: browser decode, crop, palette, and export.
- `CodexMockup`: Home and Session preview shell driven by normalized theme settings.
- `private-skin-schema`: shared closed validation schema and defaults.
- `private-skin-package`: server-side data-only package builder.
- private-skin API routes: transport, storage, expiry, and safe errors.
- CLI private source: fixed-origin download, validation, cache, and lifecycle integration.

The preview never talks directly to storage. The API never applies themes. The CLI never receives raw source uploads. Each boundary can therefore be tested independently.

## 9. Test and Release Gates

### 9.1 Site and browser

- Upload validation covers type, byte size, dimensions, malformed files, and metadata removal.
- Palette output is deterministic and meets contrast floors.
- Every control updates both preview modes and reset restores automatic defaults.
- No upload occurs before **Create private skin**.
- Success shows one pinned command; failure shows no executable command.
- Keyboard upload, control labels, focus states, mobile layout, and reduced-motion behavior work.
- Server-rendered home content, gallery links, canonical URL, structured data, sitemap, GA4, and existing SEO tests remain intact.

### 9.2 API

- Closed schema and image re-decode reject hostile and oversized input.
- IDs are random and validated before storage access.
- Retrieval returns only valid unexpired packages with no-store headers.
- Expired retrieval returns 410 and cleanup is idempotent.
- Blob errors are mapped to safe responses.

### 9.3 CLI

- Existing curated apply, reapply, and restore tests remain green.
- Download uses only the fixed HTTPS origin and rejects redirects or oversized responses.
- Package lint and hash verification happen before detection or Codex restart prompts.
- Cache writes and state writes are atomic and owner-only.
- Private reapply works with the network disabled after the first successful apply.
- Restore remains idempotent.

### 9.4 Production smoke test

1. Upload a disposable image on `codextheme.tech`.
2. Confirm Home and Session preview changes.
3. Create the private skin and copy the production command.
4. Run it on the current Mac and approve restart only when prompted.
5. Confirm the real Codex visual result.
6. Close Codex, disconnect the network, and run `reapply`.
7. Run `restore` twice and confirm the official appearance.
8. Confirm GA4 events contain no private fields.

The site is not presented as functional until the production command passes this smoke test.

## 10. Deployment and Operational Requirements

The release requires:

- a private Vercel Blob store linked to `codextheme-site`;
- `BLOB_READ_WRITE_TOKEN` and a random `CRON_SECRET` in Vercel production;
- one daily cleanup entry in `vercel.json`;
- `@codextheme/cli@0.2.0` published before the site exposes its command;
- the application changes merged to the branch used by the Vercel production project.

If npm security-key approval blocks publication while the owner is away, the production deployment keeps the creator behind a non-indexed readiness flag and continues to show the current site. Once the package is published, enabling the studio requires only a normal redeploy; the site must never display a command for an unpublished package.

## 11. Explicitly Out of Scope

- accounts and saved projects;
- public sharing or gallery submission from uploads;
- AI image generation;
- manual color editing, text styling, or arbitrary CSS;
- multi-layer composition and advanced crop tools;
- Windows or non-Codex targets;
- permanent cloud retention;
- billing, quotas, and team workspaces.

