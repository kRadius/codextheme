import Link from "next/link";

export const SUBMIT_THEME_URL = "https://github.com/kRadius/codextheme/issues/new?title=%E4%B8%BB%E9%A2%98%E6%8F%90%E4%BA%A4%EF%BC%9A&body=%E4%B8%BB%E9%A2%98%E5%90%8D%E7%A7%B0%EF%BC%9A%0A%E9%A3%8E%E6%A0%BC%E8%AF%B4%E6%98%8E%EF%BC%9A%0A%E7%B4%A0%E6%9D%90%E6%9D%A5%E6%BA%90%E4%B8%8E%E8%AE%B8%E5%8F%AF%EF%BC%9A";
const REPOSITORY_URL = "https://github.com/kRadius/codextheme";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link>
      <nav className="site-nav" aria-label="主导航">
        <Link href="/#themes">全部主题</Link>
        <Link href="/help">安装帮助</Link>
        <a href={SUBMIT_THEME_URL} rel="noreferrer">提交主题</a>
        <a className="nav-github" href={REPOSITORY_URL} rel="noreferrer">GitHub ↗</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link><p>持续增长的 Codex Desktop 主题仓库。</p></div>
      <nav className="footer-links" aria-label="页脚导航"><Link href="/security">安全边界</Link><Link href="/help">安装帮助</Link><a href={SUBMIT_THEME_URL} rel="noreferrer">提交主题</a><a href={REPOSITORY_URL} rel="noreferrer">GitHub</a></nav>
      <span>独立项目 · Apache-2.0 · 与 OpenAI 无隶属关系</span>
    </footer>
  );
}
