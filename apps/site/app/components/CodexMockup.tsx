"use client";

import type { CSSProperties } from "react";

type SkinSettings = {
  visibility: number;
  overlay: number;
  blur: number;
  zoom: number;
  positionX: number;
  positionY: number;
};

type Palette = { accent: string; surface: string; ink: string };

export function CodexMockup({
  imageUrl,
  settings,
  palette,
  mode,
  onModeChange,
}: {
  imageUrl: string;
  settings: SkinSettings;
  palette: Palette;
  mode: "home" | "session";
  onModeChange: (mode: "home" | "session") => void;
}) {
  const style = {
    "--studio-accent": palette.accent,
    "--studio-surface": palette.surface,
    "--studio-ink": palette.ink,
    "--studio-visibility": settings.visibility / 100,
    "--studio-overlay": settings.overlay / 100,
    "--studio-blur": `${settings.blur}px`,
    "--studio-zoom": settings.zoom / 100,
    "--studio-position": `${settings.positionX}% ${settings.positionY}%`,
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
        <strong>Codex <small>⌄</small></strong>
        <nav><span>＋ New chat</span><span>⌘ Commands</span><span>◴ Scheduled</span><span>◇ Plugins</span></nav>
        <p>Projects</p>
        <b><i>□</i> codextheme</b>
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
              <span><i>⌕</i>Explore and understand code</span>
              <span><i>⌁</i>Build a new feature or tool</span>
              <span><i>↻</i>Review code and suggest changes</span>
            </div>
          </div>
        ) : (
          <div className="mockup-session">
            <header><b>Private skin studio</b><span>•••</span></header>
            <div className="mockup-thread">
              <p className="mockup-user">Build a calmer first-run experience for the theme creator.</p>
              <div className="mockup-agent"><i>⌁</i><span><b>Editing the upload flow</b><br />I’ll keep preview local until the user creates a private skin.</span></div>
              <pre><code>+ preview locally{`\n`}+ upload on create{`\n`}+ expire after 24h</code></pre>
            </div>
          </div>
        )}
        <div className="mockup-composer"><span>Ask Codex anything</span><b>↑</b></div>
      </main>
      <figcaption><span>LIVE BROWSER PREVIEW</span><b>{mode === "home" ? "CODEX HOME" : "CODEX SESSION"}</b></figcaption>
    </figure>
  );
}
