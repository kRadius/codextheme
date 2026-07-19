import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(
  new URL("../app/components/CustomSkinStudio.tsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("recipe material slices use the current image and focal treatment", () => {
  assert.match(component, /imageUrl=\{imageUrl\}/);
  assert.match(component, /JSON\.stringify\(imageUrl\)/);
  assert.match(css, /linear-gradient\(135deg, var\(--recipe-primary\)/);
  assert.match(component, /"--recipe-position": `\$\{tokens\.positionX\}% \$\{tokens\.positionY\}%`/);
  assert.match(css, /\.recipe-art \{[^}]*background-position: var\(--recipe-position\)/s);
});

test("studio owns object URLs outside React state updaters and resets file selection", () => {
  assert.doesNotMatch(component, /setImage\(\(current\)/);
  assert.match(component, /asyncCoordinator\.dispose\(\)/);
  assert.match(component, /committedImageUrl/);
  assert.match(component, /event\.currentTarget\.value = ""/);
});

test("preview code inherits readable ink instead of forcing the adaptive accent", () => {
  assert.match(css, /\.mockup-thread pre \{[^}]*color: var\(--studio-ink\)/s);
});
