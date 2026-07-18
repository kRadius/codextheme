import Image from "next/image";
import type { Theme } from "../lib/themes";

export function ThemePreview({ theme, mode }: { theme: Theme; mode: "home" | "session" }) {
  const source = mode === "home" ? theme.homePreview : theme.sessionPreview;
  const label = mode === "home" ? "HOME" : "SESSION";

  return (
    <figure className="detail-preview" style={{ "--accent": theme.accent, "--theme-surface": theme.surface } as React.CSSProperties}>
      <figcaption><span>{label} / REAL CODEX CAPTURE</span><b>{mode === "home" ? "首页" : "对话"}</b></figcaption>
      {source ? (
        <Image src={source} alt={`${theme.nameZh} Codex ${label} 真实截图`} width={1600} height={1000} sizes="(max-width: 1268px) calc(100vw - 48px), 1220px" />
      ) : (
        <div className="detail-preview-empty" data-preview-state="pending">
          <i aria-hidden="true" />
          <span>{label} CAPTURE SLOT</span>
          <strong>真实截图待补齐</strong>
          <p>这里以后只放主题实际应用到 Codex 后的截图。</p>
        </div>
      )}
    </figure>
  );
}
