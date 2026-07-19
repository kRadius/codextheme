import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../public/brand-mark.svg", import.meta.url);
const destination = new URL("../public/apple-touch-icon.png", import.meta.url);
const svg = await readFile(source);

const png = await sharp(svg, { density: 192 })
  .resize(180, 180, { fit: "fill" })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

await writeFile(destination, png);
