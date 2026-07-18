import Image from "next/image";
import Link from "next/link";
import { ThemeCard } from "./components/ThemeCard";
import { SiteFooter, SiteHeader, SUBMIT_THEME_URL } from "./components/SiteChrome";
import { availableThemes } from "./lib/themes";

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodexTheme",
  alternateName: "Codex Skins & Themes",
  url: "https://codextheme.tech/",
};

export default function Home() {
  const flagship = availableThemes[0];

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <section className="flagship-hero section-wrap">
          <div className="flagship-copy">
            <p className="eyebrow"><span /> CODEX DESKTOP / SKINS &amp; THEMES</p>
            <h1>Codex skins that turn your workspace into a world.</h1>
            <p className="flagship-lead">Immersive skins go beyond a color preset: explore real Codex Desktop previews, choose a complete visual world, and install it with one command. Browse original themes now, with more on the way.</p>
            <div className="flagship-actions">
              <Link className="primary-link" href={`/themes/${flagship.slug}`}>Explore {flagship.name} <span aria-hidden="true">→</span></Link>
              <a className="text-link" href="#themes">Browse all themes ↓</a>
            </div>
          </div>
          <Link className="flagship-capture" href={`/themes/${flagship.slug}`} aria-label={`Explore the ${flagship.name} Codex theme`}>
            <div className="capture-label"><span>01 / GOTHIC WORLDS</span><b>Codex Home preview</b></div>
            <Image src={flagship.homePreview ?? ""} alt={`${flagship.name} Codex Home theme preview`} fill priority sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 1268px) calc(100vw - 48px), 1220px" />
            <div className="capture-caption"><span>{flagship.name}</span><strong>Featured theme</strong></div>
          </Link>
        </section>

        <section className="gallery-section section-wrap" id="themes">
          <header className="gallery-head">
            <div><p className="eyebrow"><span /> THEME GALLERY</p><h2>Three complete worlds,<br />not three recolored wallpapers.</h2></div>
            <p>Every theme has its own scene, palette, and Home and Session treatment. This collection will keep growing into a broader Codex Desktop theme repository.</p>
          </header>
          <div className="theme-grid">
            {availableThemes.map((theme, index) => <ThemeCard theme={theme} index={index} key={theme.slug} />)}
          </div>
        </section>

        <section className="install-strip section-wrap" aria-labelledby="install-title">
          <div className="install-title"><p className="eyebrow"><span /> SHORTEST PATH</p><h2 id="install-title">Choose a theme. Install it in 30 seconds.</h2></div>
          <ol>
            <li><b>01</b><span>See Home and Session previews</span></li>
            <li><b>02</b><span>Copy the pinned command</span></li>
            <li><b>03</b><span>Paste it into Terminal</span></li>
          </ol>
          <Link className="text-link" href="/help">Read installation and recovery help →</Link>
        </section>

        <section className="contribute section-wrap">
          <div><p className="eyebrow"><span /> COMMUNITY SUPPLY</p><h2>The next theme<br />could be yours.</h2></div>
          <div><p>Share the concept, asset sources, and license details through GitHub. No account or upload flow is required.</p><a className="primary-link" href={SUBMIT_THEME_URL} rel="noreferrer">Submit a theme proposal <span aria-hidden="true">↗</span></a></div>
        </section>

        <section className="safety-line section-wrap">
          <span>Pinned releases</span><span>Open source</span><span>Codex.app stays untouched</span><span>Restore the official appearance</span><Link href="/security">Read the security model →</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
