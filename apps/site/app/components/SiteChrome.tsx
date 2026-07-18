import Link from "next/link";

export const SUBMIT_THEME_URL = "https://github.com/kRadius/codextheme/issues/new?title=Theme%20submission%3A%20&body=Theme%20name%3A%0AStyle%20description%3A%0AAsset%20sources%20and%20licenses%3A%0A";
export const SUPPORT_EMAIL = "codextheme@codextheme.tech";
const REPOSITORY_URL = "https://github.com/kRadius/codextheme";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/#themes">All themes</Link>
        <Link href="/help">Install help</Link>
        <a href={SUBMIT_THEME_URL} rel="noreferrer">Submit a theme</a>
        <a className="nav-github" href={REPOSITORY_URL} rel="noreferrer">GitHub ↗</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><Link className="brand" href="/"><span className="brand-mark" />codextheme.tech</Link><p>A growing repository of themes for Codex Desktop.</p></div>
      <nav className="footer-links" aria-label="Footer navigation"><Link href="/security">Security</Link><Link href="/help">Install help</Link><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><a href={SUBMIT_THEME_URL} rel="noreferrer">Submit a theme</a><a href={REPOSITORY_URL} rel="noreferrer">GitHub</a></nav>
      <span>Independent project · Apache-2.0 · Not affiliated with or endorsed by OpenAI</span>
    </footer>
  );
}
