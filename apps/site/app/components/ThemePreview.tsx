import Image from "next/image";
import type { Theme } from "../lib/themes";

export function ThemePreview({ theme, mode }: { theme: Theme; mode: "home" | "session" }) {
  const source = mode === "home" ? theme.homePreview : theme.sessionPreview;
  const label = mode === "home" ? "HOME" : "SESSION";
  const caption = mode === "home" ? "HOME / VERIFIED THEME PREVIEW" : "SESSION / VERIFIED THEME PREVIEW";

  return (
    <figure className="detail-preview" style={{ "--accent": theme.accent, "--theme-surface": theme.surface } as React.CSSProperties}>
      <figcaption><span>{caption}</span><b>{mode === "home" ? "Home" : "Session"}</b></figcaption>
      <Image src={source ?? ""} alt={`${theme.name} Codex ${label} theme preview`} width={1600} height={1000} sizes="(max-width: 1268px) calc(100vw - 48px), 1220px" />
    </figure>
  );
}
