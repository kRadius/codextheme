import { MAX_PRIVATE_PACKAGE_BYTES, normalizePrivateSkinSettings } from "./private-skin-schema.mjs";

const HEX = /^#[0-9a-f]{6}$/;

function requireHex(value, label) {
  if (typeof value !== "string" || !HEX.test(value)) {
    throw new TypeError(`${label} must be a lowercase six-digit hex color.`);
  }
  return value;
}

function buildCss(settings, palette) {
  const visibility = (settings.visibility / 100).toFixed(2);
  const overlay = (settings.overlay / 100).toFixed(2);
  const zoom = (settings.zoom / 100).toFixed(2);
  return `:root.codedrobe-codex-skin {
  color-scheme: dark !important;
  --codextheme-accent: ${palette.accent};
  --codextheme-surface: ${palette.surface};
  --codextheme-panel: color-mix(in srgb, ${palette.surface} 92%, white 8%);
  --codextheme-line: color-mix(in srgb, ${palette.accent} 34%, transparent);
}

html.codedrobe-codex-skin body {
  background: #07080d !important;
  color: ${palette.ink} !important;
}

html.codedrobe-codex-skin body::before {
  content: "";
  position: fixed;
  inset: -5%;
  z-index: 0;
  pointer-events: none;
  opacity: ${visibility};
  background-image: linear-gradient(rgba(5, 6, 10, ${overlay}), rgba(5, 6, 10, ${overlay})), var(--codedrobe-image-session-bg);
  background-position: ${settings.positionX}% ${settings.positionY}%;
  background-size: cover;
  filter: blur(${settings.blur}px) saturate(.96) contrast(1.04);
  transform: scale(${zoom});
}

html.codedrobe-codex-skin body > * {
  position: relative;
  z-index: 1;
}

html.codedrobe-codex-skin aside.app-shell-left-panel {
  background: color-mix(in srgb, ${palette.surface} 84%, transparent) !important;
  border-color: var(--codextheme-line) !important;
  backdrop-filter: blur(18px) saturate(1.08) !important;
}

html.codedrobe-codex-skin main.main-surface {
  background: color-mix(in srgb, ${palette.surface} 38%, transparent) !important;
  border-color: var(--codextheme-line) !important;
  backdrop-filter: blur(14px) saturate(1.03) !important;
}

html.codedrobe-codex-skin main.main-surface > header.app-header-tint {
  background: color-mix(in srgb, ${palette.surface} 64%, transparent) !important;
  border-bottom-color: var(--codextheme-line) !important;
  backdrop-filter: blur(18px) !important;
}

html.codedrobe-codex-skin .composer-surface-chrome {
  background: color-mix(in srgb, ${palette.surface} 92%, transparent) !important;
  border: 1px solid var(--codextheme-line) !important;
  box-shadow: 0 18px 50px rgba(0, 0, 0, .28) !important;
  backdrop-filter: blur(20px) saturate(1.08) !important;
}

html.codedrobe-codex-skin :is(pre, code, [data-language]) {
  background-color: color-mix(in srgb, ${palette.surface} 97%, black 3%) !important;
}

html.codedrobe-codex-skin :is(button, a, input, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--codextheme-accent) !important;
  outline-offset: 2px !important;
}

html.codedrobe-codex-skin .dream-home {
  position: relative;
  isolation: isolate;
  background-image: linear-gradient(rgba(5, 6, 10, ${overlay}), rgba(5, 6, 10, ${overlay})), var(--codedrobe-image-hero) !important;
  background-position: ${settings.positionX}% ${settings.positionY}% !important;
  background-size: cover !important;
}

#codedrobe-codex-skin-chrome {
  pointer-events: none;
  color: ${palette.ink};
}

#codedrobe-codex-skin-chrome .dream-brand,
#codedrobe-codex-skin-chrome .dream-signature {
  color: var(--codextheme-accent);
  text-shadow: 0 2px 18px rgba(0, 0, 0, .75);
}

#codedrobe-codex-skin-chrome .dream-polaroid,
#codedrobe-codex-skin-chrome .dream-ribbon,
#codedrobe-codex-skin-chrome .dream-sparkles {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  html.codedrobe-codex-skin *,
  html.codedrobe-codex-skin *::before,
  html.codedrobe-codex-skin *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;
}

export function buildPrivateSkinPackage({ id, exportedAt, image, settings, palette }) {
  if (typeof id !== "string" || !id.includes(".")) throw new TypeError("id must be a private skin id.");
  if (typeof exportedAt !== "string" || !exportedAt) throw new TypeError("exportedAt is required.");
  if (!(image instanceof Uint8Array) || image.byteLength === 0) throw new TypeError("image is required.");
  const normalized = normalizePrivateSkinSettings(settings);
  const safePalette = {
    accent: requireHex(palette?.accent, "palette.accent"),
    surface: requireHex(palette?.surface, "palette.surface"),
    ink: requireHex(palette?.ink, "palette.ink"),
    contrast: Math.round(Math.min(100, Math.max(0, Number(palette?.contrast) || 74))),
  };
  const base64 = Buffer.from(image).toString("base64");
  const randomPart = id.split(".")[1].slice(0, 20).toLowerCase();
  const bundle = {
    format: "codedrobe-theme",
    schemaVersion: 1,
    exportedAt,
    theme: {
      id: `private-${randomPart}`,
      displayName: "Private Custom Skin",
      version: "1.0.0",
      copy: {
        brandTitle: "PRIVATE SKIN",
        brandSubtitle: "codextheme.tech",
        signature: "CUSTOM / PRIVATE",
        tagline: "Your image. Your Codex.",
        projectPrefix: "WORKSPACE / ",
        projectLabel: "Select a project",
        ribbon: "◆",
      },
    },
    targets: {
      codex: {
        css: buildCss(normalized, safePalette),
        options: {
          rendererProfile: "codex-theme-v1",
          baseTheme: {
            mode: "dark",
            codeTheme: "codex",
            accent: safePalette.accent,
            contrast: safePalette.contrast,
            ink: safePalette.ink,
            surface: safePalette.surface,
            opaqueWindows: true,
          },
        },
        verification: {
          recommended: [
            { name: "session-surface", any: ["main.main-surface"] },
            { name: "composer-surface", any: [".composer-surface-chrome"] },
          ],
        },
      },
    },
    assets: {
      images: {
        hero: { filename: "custom-skin.webp", mimeType: "image/webp", base64 },
        "session-bg": { filename: "custom-skin.webp", mimeType: "image/webp", base64 },
      },
    },
  };
  const serialized = `${JSON.stringify(bundle)}\n`;
  if (Buffer.byteLength(serialized) > MAX_PRIVATE_PACKAGE_BYTES) {
    throw Object.assign(new Error("Private skin package exceeds the response limit."), { code: "E_PACKAGE_TOO_LARGE" });
  }
  return serialized;
}
