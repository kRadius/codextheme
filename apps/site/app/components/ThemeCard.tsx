"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Theme } from "../lib/themes";

export function ThemeCard({ theme, index }: { theme: Theme; index: number }) {
  const [view, setView] = useState<"home" | "session">("home");
  const preview = view === "home" ? theme.homePreview : theme.sessionPreview;

  return (
    <article className="theme-card" style={{ "--accent": theme.accent, "--theme-surface": theme.surface } as React.CSSProperties}>
      <div className="card-preview">
        <div className="card-preview-top">
          <span>{String(index + 1).padStart(2, "0")} / {theme.series}</span>
          <span className="status-badge is-available">已可安装</span>
        </div>
        <Image
          src={preview ?? ""}
          alt={`${theme.nameZh} Codex ${view === "home" ? "Home" : "Session"} 主题效果预览`}
          fill
          sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 980px) 50vw, 33vw"
        />
        <div className="card-view-toggle" aria-label={`${theme.nameZh}预览视图`}>
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} type="button">Home</button>
          <button className={view === "session" ? "active" : ""} onClick={() => setView("session")} type="button">Session</button>
        </div>
      </div>
      <div className="card-body">
        <div className="card-title-row">
          <div><h3><Link href={`/themes/${theme.slug}`}>{theme.nameZh}</Link></h3><p>{theme.name}</p></div>
          <span className="accent-chip"><i />{theme.accent.toUpperCase()}</span>
        </div>
        <p className="card-description">{theme.descriptionZh}</p>
        <div className="card-foot">
          <ul>{theme.tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul>
          <Link href={`/themes/${theme.slug}`}>查看并安装 →</Link>
        </div>
      </div>
    </article>
  );
}
