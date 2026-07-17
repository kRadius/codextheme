import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyCommand } from "../../components/CopyCommand";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";
import { ThemePreview } from "../../components/ThemePreview";
import { findTheme, themes } from "../../lib/themes";

export function generateStaticParams() { return themes.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const theme = findTheme((await params).slug);
  if (!theme) return {};
  return {
    title: `${theme.nameZh} / ${theme.name}`,
    description: `${theme.descriptionZh} 一条固定版本命令应用到 Codex Desktop。`,
    alternates: { canonical: `/themes/${theme.slug}` },
  };
}

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const theme = findTheme((await params).slug);
  if (!theme) notFound();
  const index = themes.findIndex((item) => item.slug === theme.slug) + 1;
  return <div className="site-shell" style={{ "--accent": theme.accent } as React.CSSProperties}>
    <SiteHeader /><main className="subpage section-wrap">
      <Link className="back-link" href="/#themes">← 返回全部主题</Link>
      <header className="detail-head"><div><span className="detail-index">0{index} / CURATED THEME</span><h1>{theme.nameZh}</h1><p className="detail-en">{theme.name}</p></div><p className="detail-intro">{theme.descriptionZh} 同时覆盖 Codex 首页与对话 Session，输入和代码区域保持高可读性。</p></header>
      <div className="preview-stack"><ThemePreview theme={theme} mode="home" /><ThemePreview theme={theme} mode="session" /></div>
      <section className="apply-panel" aria-labelledby="apply-title"><div><h2 id="apply-title">一条命令应用</h2><p>复制后打开 Terminal，粘贴并回车。命令固定到可审计的 0.1.0，不会静默切换到 latest。</p><div className="command-box">{theme.command}</div><div style={{ marginTop: 12 }}><CopyCommand command={theme.command} /></div><ul className="command-disclosure"><li>需要 macOS 与 Node.js 22.4+</li><li>无需管理员权限，不修改 Codex 安装包</li><li>需要重新打开 Codex 时会先询问，只有输入 y 才继续</li></ul></div><aside className="apply-side"><h3>生效范围</h3><p>主题随当前 Codex 进程生效。重开 Codex 后运行 reapply；恢复官方外观运行 restore。两个命令都会由成功结果直接显示。</p><p>主题包内置在固定版本 CLI 中，不从本网站动态下载，不包含主题 JavaScript。</p><Link className="secondary-link" href="/security">完整安全说明 →</Link></aside></section>
    </main><SiteFooter />
  </div>;
}
