import type { Theme } from "../lib/themes";

export function ThemePreview({ theme, mode }: { theme: Theme; mode: "home" | "session" }) {
  const isHome = mode === "home";
  return <div className="preview-block" style={{ "--accent": theme.accent } as React.CSSProperties}>
    <div className="preview-label"><span>{isHome ? "HOME PREVIEW" : "SESSION PREVIEW"}</span><span>{isHome ? "Home 预览" : "Session 预览"}</span></div>
    <div className="preview-frame"><div className={`preview-canvas ${isHome ? "home-canvas" : "session-canvas"}`} style={{ backgroundImage: `url(${isHome ? theme.hero : theme.session})` }}>
      <div className="preview-ui"><aside className="preview-sidebar"><b /><i /><i /><i /></aside><div className="preview-main">
        {isHome ? <><p>CODEX DESKTOP</p><h3>What are we building tonight?</h3><div className="preview-composer"><span>Ask Codex anything</span><b>↗</b></div></> : <><p>SESSION / RUNNING</p><span className="message-line" /><span className="message-line short" /><span className="message-line" /><div className="preview-composer"><span>Continue the conversation</span><b>↗</b></div></>}
      </div></div>
    </div></div>
  </div>;
}
