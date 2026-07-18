import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SUPPORT_EMAIL } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Install Help", description: "How to apply, reapply, and restore CodexTheme themes safely.", alternates: { canonical: "/help" } };

export default function HelpPage() { return <div className="site-shell"><SiteHeader /><main className="subpage section-wrap"><article className="article-page"><Link className="back-link" href="/">← Back to the home page</Link><p className="eyebrow"><span /> QUICK HELP</p><h1>Install help</h1><p className="article-lead">The launch version keeps the path deliberately short. Before troubleshooting, make sure macOS, Node.js 22.4+, and Codex Desktop are ready.</p>
  <section className="article-block"><h2>Apply a theme for the first time</h2><p>Open a theme marked Ready to install, copy its single apply command, paste it into Terminal, and press Return. Do not use commands copied from edited chat logs or third-party posts.</p></section>
  <section className="article-block"><h2>Reapply after reopening Codex</h2><code className="inline-code">npx --yes @codextheme/cli@0.1.1 reapply</code><p>reapply reads the saved theme slug and the theme bundle built into the CLI. It does not need to access codextheme.tech.</p></section>
  <section className="article-block"><h2>Restore the official appearance</h2><code className="inline-code">npx --yes @codextheme/cli@0.1.1 restore</code><p>restore is safe to run more than once. Local state is removed after a complete restore or after confirming that no active injection remains.</p></section>
  <section className="article-block"><h2>Why does the CLI ask to reopen Codex?</h2><p>Some themes also adjust Codex appearance settings. Reopening keeps the renderer and those settings in sync. The CLI never makes that choice for you; it continues only after you enter y.</p></section>
  <section className="article-block"><h2>Still not working?</h2><p>Do not use sudo or modify the Codex application bundle. Run restore first. For installation or compatibility help, contact <a className="article-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with only the error code and Codex version. Never send conversations, tokens, or personal paths.</p></section>
  </article></main><SiteFooter /></div>; }
