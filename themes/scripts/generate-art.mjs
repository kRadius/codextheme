import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const themes = {
  "midnight-circuit": {
    dark: "#070812",
    deep: "#141329",
    accent: "#9b7bff",
    glow: "#5d39ff",
    cool: "#51a8ff",
  },
  "crimson-eclipse": {
    dark: "#09070a",
    deep: "#211016",
    accent: "#ff526a",
    glow: "#c10f36",
    cool: "#ff9b72",
  },
  "aurora-glass": {
    dark: "#061013",
    deep: "#0b2529",
    accent: "#55e5d7",
    glow: "#00a8b8",
    cool: "#77a8ff",
  },
};

function artwork(palette, width, height, variant) {
  const session = variant === "session";
  const cx = session ? width * .78 : width * .72;
  const cy = session ? height * .36 : height * .43;
  const radius = Math.min(width, height) * (session ? .29 : .36);
  const grid = Math.round(Math.min(width, height) / 20);
  const nodes = Array.from({ length: 18 }, (_, index) => {
    const x = ((index * 433) % width) + grid / 2;
    const y = ((index * 277) % height) + grid / 2;
    const size = 2 + (index % 4);
    return `<circle cx="${x}" cy="${y}" r="${size}" fill="${palette.accent}" opacity="${.12 + (index % 5) * .035}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.dark}"/>
        <stop offset="0.55" stop-color="${palette.deep}"/>
        <stop offset="1" stop-color="${palette.dark}"/>
      </linearGradient>
      <radialGradient id="halo">
        <stop offset="0" stop-color="${palette.accent}" stop-opacity=".48"/>
        <stop offset=".38" stop-color="${palette.glow}" stop-opacity=".21"/>
        <stop offset="1" stop-color="${palette.dark}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${palette.cool}" stop-opacity=".8"/>
        <stop offset=".5" stop-color="${palette.accent}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${palette.glow}" stop-opacity=".18"/>
      </linearGradient>
      <pattern id="grid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse">
        <path d="M ${grid} 0 L 0 0 0 ${grid}" fill="none" stroke="${palette.accent}" stroke-opacity=".065" stroke-width="1"/>
      </pattern>
      <filter id="blur"><feGaussianBlur stdDeviation="${Math.round(radius * .12)}"/></filter>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" seed="17"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#base)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${radius * 1.42}" ry="${radius * 1.18}" fill="url(#halo)" filter="url(#blur)"/>
    <rect width="100%" height="100%" fill="url(#grid)"/>
    <g transform="rotate(-13 ${cx} ${cy})" fill="none">
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="url(#arc)" stroke-width="${Math.max(7, radius * .018)}" opacity=".82"/>
      <circle cx="${cx}" cy="${cy}" r="${radius * .74}" stroke="${palette.accent}" stroke-width="2" stroke-dasharray="18 26" opacity=".42"/>
      <circle cx="${cx}" cy="${cy}" r="${radius * .48}" stroke="${palette.cool}" stroke-width="3" stroke-dasharray="4 19" opacity=".34"/>
      <path d="M ${cx - radius * 1.55} ${cy + radius * .62} C ${cx - radius * .45} ${cy - radius * .46}, ${cx + radius * .48} ${cy + radius * .78}, ${cx + radius * 1.65} ${cy - radius * .62}" stroke="url(#arc)" stroke-width="${Math.max(5, radius * .012)}" opacity=".48"/>
    </g>
    <g>${nodes}</g>
    <path d="M 0 ${height * .79} C ${width * .22} ${height * .69}, ${width * .44} ${height * .9}, ${width} ${height * .68} L ${width} ${height} L 0 ${height} Z" fill="${palette.dark}" opacity=".52"/>
    <rect width="100%" height="100%" filter="url(#grain)" opacity=".65"/>
  </svg>`;
}

for (const [slug, palette] of Object.entries(themes)) {
  const output = path.join(root, slug, "assets");
  await fs.mkdir(output, { recursive: true });
  await sharp(Buffer.from(artwork(palette, 3200, 2000, "hero")))
    .jpeg({ quality: 86, progressive: true, chromaSubsampling: "4:4:4" })
    .toFile(path.join(output, "hero.jpg"));
  await sharp(Buffer.from(artwork(palette, 2400, 1600, "session")))
    .jpeg({ quality: 86, progressive: true, chromaSubsampling: "4:4:4" })
    .toFile(path.join(output, "session.jpg"));
}

console.log(`Generated ${Object.keys(themes).length * 2} original raster assets.`);
