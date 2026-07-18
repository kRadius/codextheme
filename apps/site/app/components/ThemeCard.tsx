"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Theme } from "../lib/themes";

export function ThemeCard({ theme, index }: { theme: Theme; index: number }) {
  const [view, setView] = useState<"home" | "session">("home");
  const preview = view === "home" ? theme.homePreview : theme.sessionPreview;
  const hasAnyPreview = Boolean(theme.homePreview || theme.sessionPreview);
  const available = theme.status === "available";

  return (
    <article className="theme-card" style={{ "--accent": theme.accent, "--theme-surface": theme.surface } as React.CSSProperties}>
      <div className="card-preview">
        <div className="card-preview-top">
          <span>{String(index + 1).padStart(2, "0")} / {theme.series}</span>
          <span className={`status-badge ${available ? "is-available" : "is-coming"}`}>
            {available ? "已可安装" : "制作中"}
          </span>
        </div>
        {hasAnyPreview ? (
          <>
            <Image
              src={preview ?? theme.homePreview ?? theme.sessionPreview ?? ""}
              alt={`${theme.nameZh} Codex ${view === "home" ? "Home" : "Session"} 真实截图`}
              fill
              sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 980px) 50vw, 33vw"
            />
            <div className="card-view-toggle" aria-label={`${theme.nameZh}预览视图`}>
              <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} type="button" disabled={!theme.homePreview}>Home</button>
              <button className={view === "session" ? "active" : ""} onClick={() => setView("session")} type="button" disabled={!theme.sessionPreview}>Session</button>
            </div>
          </>
        ) : (
          <div className="preview-placeholder" data-preview-state="pending">
            <i aria-hidden="true" />
            <span>CODEX / HOME + SESSION</span>
            <b>真实截图待补齐</b>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="card-title-row">
          <div><h3><Link href={`/themes/${theme.slug}`}>{theme.nameZh}</Link></h3><p>{theme.name}</p></div>
          <span className="accent-chip"><i />{theme.accent.toUpperCase()}</span>
        </div>
        <p className="card-description">{theme.descriptionZh}</p>
        <div className="card-foot">
          <ul>{theme.tags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}</ul>
          <Link href={`/themes/${theme.slug}`}>{available ? "查看并安装" : "查看主题计划"} →</Link>
        </div>
      </div>
    </article>
  );
}
