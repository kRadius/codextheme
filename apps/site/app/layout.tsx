import type { Metadata } from "next";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import "./globals.css";

const siteTitle = "Codex Skins & Themes for Codex Desktop | CodexTheme";
const siteDescription = "Discover immersive Codex skins and themes with real Home and Session previews, then install a pinned release with one command.";

export const metadata: Metadata = {
  metadataBase: new URL("https://codextheme.tech"),
  title: {
    default: siteTitle,
    template: "%s | CodexTheme",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CodexTheme",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CodexTheme — skins and themes for Codex Desktop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<GoogleAnalytics /></body></html>;
}
