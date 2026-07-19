import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const publicAsset = (name) => new URL(`../public/${name}`, import.meta.url);

test("brand assets share the selected blue-node C identity", async () => {
  const svg = await readFile(publicAsset("brand-mark.svg"), "utf8");
  assert.match(svg, /fill="#171512"/);
  assert.match(svg, /stroke="#f3eee4"/);
  assert.match(svg, /fill="#2354ff"/);
  assert.doesNotMatch(svg, /#c7a45a/i);

  const png = await readFile(publicAsset("apple-touch-icon.png"));
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 180);
  assert.equal(metadata.height, 180);
});
