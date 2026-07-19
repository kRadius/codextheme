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
    title: `${theme.name} Codex Theme`,
    description: `${theme.description} Preview and install this Codex Desktop theme.`,
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
        <Link className="back-link" href="/#themes">← All themes</Link>
        <header className="detail-head">
          <div>
            <span className="detail-index">{String(index).padStart(2, "0")} / {theme.series}</span>
            <h1>{theme.name}</h1>
            <p className="detail-en">Codex Desktop theme · {theme.series}</p>
          </div>
          <div className="detail-summary">
            <span className="status-badge is-available">Ready to install</span>
            <p>{theme.description}</p>
            <dl><div><dt>Author</dt><dd>{theme.author}</dd></div><div><dt>Compatibility</dt><dd>{theme.compatibility}</dd></div><div><dt>Updated</dt><dd>{theme.updatedAt}</dd></div></dl>
          </div>
        </header>

        <div className="preview-stack"><ThemePreview theme={theme} mode="home" /><ThemePreview theme={theme} mode="session" /></div>

        {theme.command && <section className="apply-panel" aria-labelledby="apply-title">
          <div>
            <p className="eyebrow"><span /> AVAILABLE NOW</p>
            <h2 id="apply-title">Apply with one command</h2>
            <p>Copy the command, open Terminal, paste it, and press Return. It is pinned to the auditable @codextheme/cli 0.2.0 release and never follows latest silently.</p>
            <div className="command-box">{theme.command}</div>
            <div className="copy-row"><CopyCommand command={theme.command} themeSlug={theme.slug} /></div>
          </div>
          <aside className="apply-side"><h3>Installation boundaries</h3><ul><li>macOS and Node.js 22.4+</li><li>Does not modify Codex.app or its signature</li><li>Asks before a restart when one is required</li><li>Run restore to recover the official appearance</li></ul><Link className="text-link" href="/security">View the complete security model →</Link></aside>
        </section>}
      </main>
      <SiteFooter />
    </div>
  );
}
