import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  lintThemePackage,
  readThemePackage,
  resolveThemeTarget,
  writeThemePackage,
} from "@codextheme/runtime";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "..");
const catalog = JSON.parse(await fs.readFile(path.join(root, "catalog.json"), "utf8"));
const outputRoot = path.join(repo, "packages", "cli", "themes");
const exportedAt = "2026-07-18T00:00:00.000Z";
const compatibilitySlugs = ["aurora-glass", "crimson-eclipse", "midnight-circuit"];
const packageEntries = [
  ...catalog.filter((theme) => theme.status === "available"),
  ...compatibilitySlugs.map((slug) => ({ slug, source: `themes/${slug}/theme.json` })),
];

async function lockBundledAccent(output) {
  const bundle = JSON.parse(await fs.readFile(output, "utf8"));
  const target = bundle.targets?.codex;
  const accent = target?.options?.baseTheme?.accent;
  if (!/^#[0-9a-f]{6}$/iu.test(accent ?? "")) {
    throw new Error(`${path.basename(output)} must define a six-digit Codex base-theme accent.`);
  }
  const source = target.css;
  target.css = source.replace(
    /--codextheme-accent:\s*var\(--color-token-primary,\s*#[0-9a-f]{6}\);/iu,
    `--codextheme-accent: ${accent};`,
  );
  if (target.css === source) {
    throw new Error(`${path.basename(output)} could not lock its packaged Codex accent.`);
  }
  await fs.writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`);
}

await fs.mkdir(outputRoot, { recursive: true });

for (const entry of packageEntries) {
  const manifest = path.join(repo, entry.source);
  const output = path.join(outputRoot, `${entry.slug}.codextheme-theme`);
  await writeThemePackage(manifest, output, { force: true, exportedAt });
  await lockBundledAccent(output);
  const bundle = await readThemePackage(output);
  const warnings = lintThemePackage(bundle);
  if (warnings.length) {
    throw new Error(`${entry.slug} has theme lint warnings: ${JSON.stringify(warnings)}`);
  }
  const target = resolveThemeTarget(bundle, "codex");
  const imageIds = Object.keys(target.imageDataUrls).sort();
  if (imageIds.join(",") !== "hero,session-bg") {
    throw new Error(`${entry.slug} must embed exactly hero and session-bg images.`);
  }
}

console.log(`Packed and verified ${packageEntries.length} Codex themes.`);
