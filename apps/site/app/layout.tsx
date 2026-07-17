import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://codextheme.tech"),
  title: {
    default: "CodexTheme — 一条命令，为 Codex 换主题",
    template: "%s · CodexTheme",
  },
  description: "精选 Codex Desktop 主题。一条固定版本命令应用，可验证、可恢复、不修改 Codex 安装包。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "CodexTheme",
    title: "CodexTheme — 一条命令，为 Codex 换主题",
    description: "精选 Codex Desktop 主题。一条命令应用，可验证、可恢复。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CodexTheme — 一条命令，为 Codex 换主题" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodexTheme — 一条命令，为 Codex 换主题",
    description: "精选 Codex Desktop 主题。一条命令应用，可验证、可恢复。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
