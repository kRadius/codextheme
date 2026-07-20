import { THEME_FORMAT } from "@codextheme/runtime";
import { MAX_PRIVATE_PACKAGE_BYTES, normalizePrivateSkinSettings } from "./private-skin-schema.mjs";
import { deriveSkinTokens } from "./private-skin-profile.mjs";

const SAFE_HEX = /^#[0-9a-f]{6}$/iu;

function legacyPaletteToProfile(palette) {
  if (!palette || typeof palette !== "object" || Array.isArray(palette)) return undefined;
  if (typeof palette.accent !== "string" || typeof palette.surface !== "string") return undefined;
  if (!SAFE_HEX.test(palette.accent) || !SAFE_HEX.test(palette.surface)) return undefined;
  const accent = palette.accent.toLowerCase();
  const surface = palette.surface.slice(1).match(/../gu).map((value) => Number.parseInt(value, 16));
  const primary = `#${surface
    .map((value) => Math.min(255, Math.max(0, Math.round((value - 5.04) / 0.16))))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
  return {
    primary,
    secondary: accent,
    highlight: accent,
    contrast: Number.isFinite(palette.contrast) ? palette.contrast : 74,
  };
}

function buildCss(tokens) {
  const visibility = (tokens.visibility / 100).toFixed(2);
  const overlay = (tokens.overlay / 100).toFixed(2);
  const zoom = (tokens.zoom / 100).toFixed(2);
  const saturation = (tokens.saturation / 100).toFixed(2);
  const imageContrast = (tokens.imageContrast / 100).toFixed(2);
  return `:root.codextheme-codex-skin {
  color-scheme: dark !important;
  --codextheme-accent: ${tokens.accent};
  --codextheme-accent-soft: ${tokens.accentSoft};
  --codextheme-surface: ${tokens.surface};
  --codextheme-surface-raised: ${tokens.surfaceRaised};
  --codextheme-ink: ${tokens.ink};
  --codextheme-muted-ink: ${tokens.mutedInk};
  --codextheme-line: color-mix(in srgb, ${tokens.accent} ${tokens.borderAlpha}%, transparent);
  --codextheme-radius: ${tokens.radius}px;
  --codextheme-icon-surface-alpha: ${tokens.iconSurfaceAlpha}%;
  --codextheme-icon-border-alpha: ${tokens.iconBorderAlpha}%;
  --codextheme-icon-glow-alpha: ${tokens.iconGlowAlpha}%;
  --codextheme-icon-glyph: ${tokens.iconGlyphOnAccent ? "var(--codextheme-surface)" : "var(--codextheme-accent)"};
}

html.codextheme-codex-skin body {
  background: var(--codextheme-surface) !important;
  color: var(--codextheme-ink) !important;
}

html.codextheme-codex-skin body::before {
  content: "";
  position: fixed;
  inset: -5%;
  z-index: 0;
  pointer-events: none;
  opacity: ${visibility};
  background-image: linear-gradient(rgba(5, 6, 10, ${overlay}), rgba(5, 6, 10, ${overlay})), var(--codextheme-image-session-bg);
  background-position: ${tokens.positionX}% ${tokens.positionY}%;
  background-size: cover;
  filter: blur(${tokens.blur}px) saturate(${saturation}) contrast(${imageContrast});
  transform: scale(${zoom});
}

html.codextheme-codex-skin body:has(.dream-home)::before {
  background-image: linear-gradient(rgba(5, 6, 10, ${overlay}), rgba(5, 6, 10, ${overlay})), var(--codextheme-image-hero);
}

html.codextheme-codex-skin body > * {
  position: relative;
  z-index: 1;
}

html.codextheme-codex-skin aside.app-shell-left-panel {
  background: color-mix(in srgb, var(--codextheme-surface) ${tokens.sidebarAlpha}%, transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  backdrop-filter: blur(${tokens.sidebarBlur}px) saturate(1.08) !important;
}

html.codextheme-codex-skin main.main-surface {
  background: color-mix(in srgb, var(--codextheme-surface) ${tokens.mainAlpha}%, transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  backdrop-filter: blur(${tokens.mainBlur}px) saturate(1.03) !important;
}

html.codextheme-codex-skin main.main-surface > header.app-header-tint {
  background: color-mix(in srgb, var(--codextheme-surface-raised) ${tokens.headerAlpha}%, transparent) !important;
  border-bottom-color: color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  backdrop-filter: blur(${tokens.headerBlur}px) !important;
}

html.codextheme-codex-skin .composer-surface-chrome {
  background: color-mix(in srgb, var(--codextheme-surface-raised) ${tokens.composerAlpha}%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--codextheme-accent) ${tokens.borderAlpha}%, transparent) !important;
  border-radius: var(--codextheme-radius) !important;
  box-shadow: ${tokens.shadow} !important;
  backdrop-filter: blur(${tokens.composerBlur}px) saturate(1.08) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel :is([aria-current="page"], [aria-selected="true"], [data-state="active"]) {
  background: color-mix(in srgb, var(--codextheme-accent-soft) ${tokens.selectionAlpha}%, transparent) !important;
  border-color: color-mix(in srgb, var(--codextheme-accent) 44%, transparent) !important;
  border-radius: var(--codextheme-radius) !important;
  box-shadow: inset 3px 0 0 var(--codextheme-accent) !important;
}

html.codextheme-codex-skin aside.app-shell-left-panel :is(button, a, [role="button"]) svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent));
}

html.codextheme-codex-skin [data-message-author-role="assistant"] svg {
  color: var(--codextheme-accent) !important;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent));
}

html.codextheme-codex-skin .dream-home :is(button, [role="button"]) svg {
  color: var(--codextheme-icon-glyph) !important;
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent) !important;
  border-radius: 50% !important;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent),
    0 0 0 5px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent) !important;
}

html.codextheme-codex-skin .composer-surface-chrome :is(button, [role="button"]) svg {
  color: var(--codextheme-icon-glyph) !important;
  background-color: color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent) !important;
  border-radius: 50% !important;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-surface-alpha), transparent),
    0 0 0 5px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-border-alpha), transparent),
    0 0 18px color-mix(in srgb, var(--codextheme-accent) var(--codextheme-icon-glow-alpha), transparent) !important;
}

html.codextheme-codex-skin :is(pre, code, [data-language]) {
  background-color: color-mix(in srgb, var(--codextheme-surface) ${tokens.codeAlpha}%, transparent) !important;
}

html.codextheme-codex-skin :is(button, a, input, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--codextheme-accent) !important;
  outline-offset: 2px !important;
}

html.codextheme-codex-skin .dream-home {
  position: relative;
  isolation: isolate;
  background: transparent !important;
}

#codextheme-codex-skin-chrome {
  pointer-events: none;
  color: var(--codextheme-ink);
}

#codextheme-codex-skin-chrome .dream-brand,
#codextheme-codex-skin-chrome .dream-signature {
  color: var(--codextheme-accent);
  text-shadow: 0 2px 18px rgba(0, 0, 0, .75);
}

#codextheme-codex-skin-chrome .dream-polaroid,
#codextheme-codex-skin-chrome .dream-ribbon,
#codextheme-codex-skin-chrome .dream-sparkles {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  html.codextheme-codex-skin *,
  html.codextheme-codex-skin *::before,
  html.codextheme-codex-skin *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;
}

export function buildPrivateSkinPackage({ id, exportedAt, image, settings, profile, palette }) {
  if (typeof id !== "string" || !id.includes(".")) throw new TypeError("id must be a private skin id.");
  if (typeof exportedAt !== "string" || !exportedAt) throw new TypeError("exportedAt is required.");
  if (!(image instanceof Uint8Array) || image.byteLength === 0) throw new TypeError("image is required.");
  const normalized = normalizePrivateSkinSettings(settings);
  const safeProfile = profile === undefined ? legacyPaletteToProfile(palette) : profile;
  const tokens = deriveSkinTokens(safeProfile, normalized);
  const contrast = Math.round(Math.min(
    100,
    Math.max(60, Number.isFinite(safeProfile?.contrast) ? safeProfile.contrast : 74),
  ));
  const base64 = Buffer.from(image).toString("base64");
  const randomPart = id.split(".")[1].slice(0, 20).toLowerCase();
  const bundle = {
    format: THEME_FORMAT,
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
        css: buildCss(tokens),
        options: {
          rendererProfile: "codex-theme-v1",
          baseTheme: {
            mode: "dark",
            codeTheme: "codex",
            accent: tokens.accent,
            contrast,
            ink: tokens.ink,
            surface: tokens.surface,
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
