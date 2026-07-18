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

await fs.mkdir(outputRoot, { recursive: true });

for (const entry of catalog.filter((theme) => theme.status === "available")) {
  const manifest = path.join(repo, entry.source);
  const output = path.join(outputRoot, `${entry.slug}.codextheme-theme`);
  await writeThemePackage(manifest, output, { force: true, exportedAt });
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

console.log(`Packed and verified ${catalog.filter((theme) => theme.status === "available").length} available Codex themes.`);
