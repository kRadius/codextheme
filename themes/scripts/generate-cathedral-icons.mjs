import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const CATHEDRAL_ICON_IDS = Object.freeze([
  "icon-new-chat",
  "icon-pull-requests",
  "icon-sites",
  "icon-scheduled",
  "icon-plugins",
  "icon-project-folder",
  "icon-explore",
  "icon-build",
  "icon-review",
  "icon-fix",
  "icon-add",
  "icon-send",
]);

const themeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceRoot = path.join(themeRoot, "cathedral-nocturne", "icons-src");
const defaultOutputRoot = path.join(themeRoot, "cathedral-nocturne", "assets", "icons");

export async function generateCathedralIcons({
  sourceRoot = defaultSourceRoot,
  outputRoot = defaultOutputRoot,
} = {}) {
  await fs.mkdir(outputRoot, { recursive: true });

  for (const id of CATHEDRAL_ICON_IDS) {
    const source = await fs.readFile(path.join(sourceRoot, `${id}.svg`), "utf8");
    const resourceScan = source.replace("http://www.w3.org/2000/svg", "");
    if (!/viewBox="0 0 24 24"/.test(source) || /https?:|<script|@import|url\(/i.test(resourceScan)) {
      throw new Error(`${id} is not a safe 24-unit local SVG master.`);
    }

    await sharp(Buffer.from(source))
      .resize(96, 96)
      .png({ compressionLevel: 9 })
      .toFile(path.join(outputRoot, `${id}.png`));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generateCathedralIcons({
    outputRoot: process.env.CODEXTHEME_ICON_OUTPUT_ROOT
      ? path.resolve(process.env.CODEXTHEME_ICON_OUTPUT_ROOT)
      : defaultOutputRoot,
  });
  console.log(`Generated ${CATHEDRAL_ICON_IDS.length} Cathedral Glyph PNG assets.`);
}
