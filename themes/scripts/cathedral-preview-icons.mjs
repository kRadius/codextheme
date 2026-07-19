import fs from "node:fs/promises";
import path from "node:path";
import { CATHEDRAL_ICON_IDS } from "./generate-cathedral-icons.mjs";

export async function loadCathedralPreviewIcons({ themeRoot, slug, manifest }) {
  if (slug !== "cathedral-nocturne") return {};

  const entries = await Promise.all(CATHEDRAL_ICON_IDS.map(async (id) => {
    const assetPath = manifest?.images?.[id];
    if (typeof assetPath !== "string" || !assetPath) {
      throw new Error(`Cathedral preview is missing the packaged ${id} image.`);
    }
    const image = await fs.readFile(path.join(themeRoot, slug, assetPath));
    return [id, `data:image/png;base64,${image.toString("base64")}`];
  }));

  return Object.fromEntries(entries);
}

export function previewIconImage(iconData, id, { x, y, size }) {
  const href = iconData?.[id];
  if (!href) return "";
  return `<image href="${href}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
}
