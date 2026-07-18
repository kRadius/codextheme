import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://codextheme.tech"),
  title: {
    default: "CodexTheme — Codex Desktop 主题仓库",
    template: "%s · CodexTheme",
  },
  description: "持续增长的 Codex Desktop 主题仓库。看真实效果，复制一条固定版本命令应用。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "CodexTheme",
    title: "CodexTheme — Codex Desktop 主题仓库",
    description: "浏览真实 Codex 主题效果，一条命令应用，可验证、可恢复。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CodexTheme — Codex Desktop 主题仓库" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodexTheme — Codex Desktop 主题仓库",
    description: "浏览真实 Codex 主题效果，一条命令应用，可验证、可恢复。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
