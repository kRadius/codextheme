import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header"><Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link><nav className="site-nav" aria-label="主导航"><Link href="/#themes">主题</Link><Link href="/security">安全边界</Link><Link href="/help">帮助</Link></nav></header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div><Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link><p>独立项目，与 OpenAI 无隶属或背书关系。</p></div><nav className="footer-links" aria-label="页脚导航"><Link href="/security">安全</Link><Link href="/help">帮助</Link><a href="https://github.com/kRadius/codextheme" rel="noreferrer">GitHub</a></nav><span>Apache-2.0 · 2026</span></footer>;
}
