import type { MetadataRoute } from "next";
import { themes } from "./lib/themes";
export default function sitemap(): MetadataRoute.Sitemap { const base = "https://codextheme.tech"; return ["", "/security", "/help", ...themes.map((theme) => `/themes/${theme.slug}`)].map((path) => ({ url: `${base}${path}`, changeFrequency: path ? "monthly" : "weekly", priority: path ? .8 : 1 })); }
