import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyCommand } from "../../components/CopyCommand";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";
import { ThemePreview } from "../../components/ThemePreview";
import { findTheme, themes } from "../../lib/themes";

export function generateStaticParams() {
  return themes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const theme = findTheme((await params).slug);
  if (!theme) return {};
  return {
    title: `${theme.nameZh} / ${theme.name}`,
    description: `${theme.descriptionZh} 可安装 Codex 主题。`,
    alternates: { canonical: `/themes/${theme.slug}` },
  };
}

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const theme = findTheme((await params).slug);
  if (!theme) notFound();
  const index = themes.findIndex((item) => item.slug === theme.slug) + 1;

  return (
    <div className="site-shell" style={{ "--accent": theme.accent } as React.CSSProperties}>
      <SiteHeader />
      <main className="subpage section-wrap">
        <Link className="back-link" href="/#themes">← 返回全部主题</Link>
        <header className="detail-head">
          <div>
            <span className="detail-index">{String(index).padStart(2, "0")} / {theme.series}</span>
            <h1>{theme.nameZh}</h1>
            <p className="detail-en">{theme.name}</p>
          </div>
          <div className="detail-summary">
            <span className="status-badge is-available">已可安装</span>
            <p>{theme.descriptionZh}</p>
            <dl><div><dt>作者</dt><dd>{theme.author}</dd></div><div><dt>兼容</dt><dd>{theme.compatibility}</dd></div><div><dt>更新</dt><dd>{theme.updatedAt}</dd></div></dl>
          </div>
        </header>

        <div className="preview-stack"><ThemePreview theme={theme} mode="home" /><ThemePreview theme={theme} mode="session" /></div>

        {theme.command && <section className="apply-panel" aria-labelledby="apply-title">
          <div>
            <p className="eyebrow"><span /> AVAILABLE NOW</p>
            <h2 id="apply-title">一条命令应用</h2>
            <p>复制后打开 Terminal，粘贴并回车。命令固定到我们可审计的 @codextheme/cli 0.1.1，不会静默跟随 latest。</p>
            <div className="command-box">{theme.command}</div>
            <div className="copy-row"><CopyCommand command={theme.command} /></div>
          </div>
          <aside className="apply-side"><h3>安装边界</h3><ul><li>macOS 与 Node.js 22.4+</li><li>不修改 Codex.app 或官方签名</li><li>需要重开时会先征求确认</li><li>运行 restore 可恢复官方外观</li></ul><Link className="text-link" href="/security">查看完整安全说明 →</Link></aside>
        </section>}
      </main>
      <SiteFooter />
    </div>
  );
}
