"use client";

import type { CSSProperties } from "react";
import { deriveSkinTokens } from "../lib/private-skin-profile.mjs";

type RecipeId = "cinematic" | "glass" | "focus";

type SkinSettings = {
  recipe: RecipeId;
  visibility: number;
  overlay: number;
  blur: number;
  zoom: number;
  positionX: number;
  positionY: number;
};

type ImageProfile = {
  primary: string;
  secondary: string;
  highlight: string;
  luminance: number;
  saturation: number;
  contrast: number;
  complexity: number;
  recommendedRecipe: RecipeId;
};

export function CodexMockup({
  imageUrl,
  profile,
  settings,
  mode,
  onModeChange,
}: {
  imageUrl: string;
  profile: ImageProfile;
  settings: SkinSettings;
  mode: "home" | "session";
  onModeChange: (mode: "home" | "session") => void;
}) {
  const tokens = deriveSkinTokens(profile, settings);
  const style = {
    "--studio-accent": tokens.accent,
    "--studio-accent-soft": tokens.accentSoft,
    "--studio-surface": tokens.surface,
    "--studio-surface-raised": tokens.surfaceRaised,
    "--studio-ink": tokens.ink,
    "--studio-muted-ink": tokens.mutedInk,
    "--studio-visibility": tokens.visibility / 100,
    "--studio-overlay": tokens.overlay / 100,
    "--studio-blur": `${tokens.blur}px`,
    "--studio-zoom": tokens.zoom / 100,
    "--studio-position": `${tokens.positionX}% ${tokens.positionY}%`,
    "--studio-sidebar-alpha": `${tokens.sidebarAlpha}%`,
    "--studio-main-alpha": `${tokens.mainAlpha}%`,
    "--studio-header-alpha": `${tokens.headerAlpha}%`,
    "--studio-composer-alpha": `${tokens.composerAlpha}%`,
    "--studio-code-alpha": `${tokens.codeAlpha}%`,
    "--studio-selection-alpha": `${tokens.selectionAlpha}%`,
    "--studio-sidebar-blur": `${tokens.sidebarBlur}px`,
    "--studio-main-blur": `${tokens.mainBlur}px`,
    "--studio-header-blur": `${tokens.headerBlur}px`,
    "--studio-composer-blur": `${tokens.composerBlur}px`,
    "--studio-border-alpha": `${tokens.borderAlpha}%`,
    "--studio-radius": `${tokens.radius}px`,
    "--studio-icon-hover-surface-alpha": `${tokens.iconHoverSurfaceAlpha}%`,
    "--studio-icon-hover-border-alpha": `${tokens.iconHoverBorderAlpha}%`,
    "--studio-icon-hover-glow-alpha": `${tokens.iconHoverGlowAlpha}%`,
    "--studio-shadow": tokens.shadow,
    "--studio-saturation": tokens.saturation / 100,
    "--studio-image-contrast": tokens.imageContrast / 100,
  } as CSSProperties;

  return (
    <figure className="codex-mockup" style={style} aria-label={`Codex ${mode === "home" ? "Home" : "Session"} skin preview`}>
      <div className="mockup-mode" aria-label="Preview screen">
        <button type="button" aria-pressed={mode === "home"} onClick={() => onModeChange("home")}>Home</button>
        <button type="button" aria-pressed={mode === "session"} onClick={() => onModeChange("session")}>Session</button>
      </div>
      <div
        className="codex-mockup-art"
        aria-hidden="true"
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` }}
      />
      <div className="codex-mockup-shade" aria-hidden="true" />
      <div className="mockup-window-bar" aria-hidden="true">
        <span className="traffic-light is-red" /><span className="traffic-light is-amber" /><span className="traffic-light is-green" />
        <i>‹</i><i>›</i>
      </div>
      <aside className="mockup-sidebar" aria-hidden="true">
        <strong className="mockup-sidebar-control">Codex <small>⌄</small></strong>
        <nav>
          <span className="mockup-sidebar-control"><i>＋</i> New chat</span>
          <span className="mockup-sidebar-control"><i>⌘</i> Commands</span>
          <span className="mockup-sidebar-control"><i>◴</i> Scheduled</span>
          <span className="mockup-sidebar-control"><i>◇</i> Plugins</span>
        </nav>
        <p>Projects</p>
        <b className="mockup-sidebar-control mockup-project mockup-selected"><i>□</i> codextheme</b>
        <span className="mockup-project">Private skin studio</span>
        <span className="mockup-project">Launch notes</span>
        <p>Chats</p>
        <span className="mockup-muted">No chats</span>
        <footer>⚙ custom <i>?</i></footer>
      </aside>
      <main className="mockup-main" aria-hidden="true">
        {mode === "home" ? (
          <div className="mockup-home">
            <header><span className="mockup-sigil">⌁</span><h3>What should we build?</h3><p>Your image becomes the atmosphere. Codex stays the workspace.</p></header>
            <div className="mockup-prompts">
              <span className="mockup-prompt-control"><i>⌕</i>Explore and understand code</span>
              <span className="mockup-prompt-control"><i>⌁</i>Build a new feature or tool</span>
              <span className="mockup-prompt-control"><i>↻</i>Review code and suggest changes</span>
            </div>
          </div>
        ) : (
          <div className="mockup-session">
            <header>
              <b>Private skin studio</b>
              <span className="mockup-header-control"><i>•••</i></span>
            </header>
            <div className="mockup-session-body">
              <div className="mockup-thread">
                <p className="mockup-user">Build a calmer first-run experience for the theme creator.</p>
                <div className="mockup-agent"><i>⌁</i><span><b>Editing the upload flow</b><br />I’ll keep preview local until the user creates a private skin.</span></div>
                <pre><code>+ preview locally{`\n`}+ upload on create{`\n`}+ expire after 24h</code></pre>
              </div>
              <aside className="mockup-session-rail">
                <section className="mockup-summary">
                  <span>Session context</span>
                  <div className="mockup-summary-control is-hover-preview">
                    <i>⌘</i><span><b>Environment</b><small>Local workspace</small></span>
                  </div>
                  <div className="mockup-summary-control">
                    <i>≡</i><span><b>Sources</b><small>3 files</small></span>
                  </div>
                </section>
                <div className="mockup-menu">
                  <span className="mockup-menu-control"><i>↗</i> Open in editor</span>
                  <span className="mockup-menu-control"><i>□</i> Copy task link</span>
                </div>
              </aside>
            </div>
          </div>
        )}
        <div className="mockup-composer">
          <span>Ask Codex anything</span>
          <span className="mockup-composer-actions">
            <i className="mockup-composer-secondary">⌁</i>
            <b className="mockup-composer-primary">↑</b>
          </span>
        </div>
      </main>
      <figcaption><span>LIVE BROWSER PREVIEW · {tokens.recipe.toUpperCase()} SKIN</span><b>{mode === "home" ? "CODEX HOME" : "CODEX SESSION"}</b></figcaption>
    </figure>
  );
}
