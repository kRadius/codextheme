import Link from "next/link";
import { CustomSkinStudio } from "./components/CustomSkinStudio";
import { ThemeCard } from "./components/ThemeCard";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { availableThemes } from "./lib/themes";

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodexTheme",
  alternateName: "Codex Skins & Themes",
  url: "https://codextheme.tech/",
};

export default function Home() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <div className="section-wrap"><CustomSkinStudio /></div>

        <section className="gallery-section section-wrap" id="themes">
          <header className="gallery-head">
            <div><p className="eyebrow"><span /> READY-MADE SKINS</p><h2>Need inspiration?<br />Start with a ready-made skin.</h2></div>
            <p>Prefer not to upload an image? These complete Codex themes include a scene, a readable palette, and verified Home and Session treatments.</p>
          </header>
          <div className="theme-grid">
            {availableThemes.map((theme, index) => <ThemeCard theme={theme} index={index} key={theme.slug} />)}
          </div>
        </section>

        <section className="install-strip section-wrap" aria-labelledby="install-title">
          <div className="install-title"><p className="eyebrow"><span /> SHORTEST PATH</p><h2 id="install-title">See it. Create it. Apply it.</h2></div>
          <ol>
            <li><b>01</b><span>Choose an image and preview locally</span></li>
            <li><b>02</b><span>Create a private 24-hour skin</span></li>
            <li><b>03</b><span>Paste one command into Terminal</span></li>
          </ol>
          <Link className="text-link" href="/help">Read installation and recovery help →</Link>
        </section>

        <section className="safety-line section-wrap">
          <span>No account</span><span>Private Blob storage</span><span>Codex.app stays untouched</span><span>Restore the official appearance</span><Link href="/security">Read the privacy and security model →</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
