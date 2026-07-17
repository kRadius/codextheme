import { fileURLToPath } from "node:url";

export const CATALOG = Object.freeze({
  "midnight-circuit": Object.freeze({ slug: "midnight-circuit", name: "Midnight Circuit" }),
  "crimson-eclipse": Object.freeze({ slug: "crimson-eclipse", name: "Crimson Eclipse" }),
  "aurora-glass": Object.freeze({ slug: "aurora-glass", name: "Aurora Glass" }),
});

export function getCatalogEntry(slug) {
  return CATALOG[slug] ?? null;
}

export function themeFilename(slug) {
  const entry = getCatalogEntry(slug);
  if (!entry) return null;
  return fileURLToPath(new URL(`../themes/${entry.slug}.codedrobe-theme`, import.meta.url));
}
