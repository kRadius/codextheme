import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(
  new URL("../app/components/CustomSkinStudio.tsx", import.meta.url),
  "utf8",
);
const mockup = await readFile(
  new URL("../app/components/CodexMockup.tsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

function idleRulesFor(selector) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectorList]) => selectorList.split(",").map((value) => value.trim()).includes(selector))
    .map(([, , declarations]) => declarations)
    .join("\n");
}

function declarationValues(ruleText, property) {
  const pattern = new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;}]+)`, "g");
  return [...ruleText.matchAll(pattern)].map((match) => match[1].trim());
}

function assertNoPermanentIdleMaterial(selector) {
  const idleRules = idleRulesFor(selector);
  assert.notEqual(idleRules, "", `${selector} must have an idle rule`);
  for (const property of ["background", "background-color"]) {
    for (const value of declarationValues(idleRules, property)) {
      assert.match(value, /^(?:none|transparent)$/u, `${selector} ${property} must remain visually empty`);
    }
  }
  for (const property of ["border", "border-color"]) {
    for (const value of declarationValues(idleRules, property)) {
      assert.match(value, /^(?:0|none)$|transparent/u, `${selector} ${property} must remain transparent`);
    }
  }
  for (const value of declarationValues(idleRules, "box-shadow")) {
    assert.equal(value, "none", `${selector} box-shadow must remain visually empty`);
  }
  assert.doesNotMatch(idleRules, /drop-shadow\s*\(/u, `${selector} must not have an idle drop-shadow`);
}

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

test("preview mirrors private icon interaction states", () => {
  for (const mapping of [
    '"--studio-icon-hover-surface-alpha": `${tokens.iconHoverSurfaceAlpha}%`',
    '"--studio-icon-hover-border-alpha": `${tokens.iconHoverBorderAlpha}%`',
    '"--studio-icon-hover-glow-alpha": `${tokens.iconHoverGlowAlpha}%`',
  ]) {
    assert.ok(mockup.includes(mapping), `mockup must expose the exact ${mapping} mapping`);
  }
  for (const removed of [
    "--studio-icon-surface-alpha",
    "--studio-icon-border-alpha",
    "--studio-icon-glow-alpha",
  ]) {
    assert.equal(mockup.includes(`\"${removed}\"`), false, `${removed} must be removed`);
  }

  assert.doesNotMatch(mockup, /iconHoverGlyphOnAccent/);
  assert.match(mockup, /className="mockup-composer-actions"/);
  assert.match(mockup, /<i>⌁<\/i><b>↑<\/b>/);
  assert.match(
    css,
    /\.mockup-sidebar nav span:hover,\s*\.mockup-prompts > span:hover,\s*\.mockup-composer-actions i:hover\s*\{[^}]*background:/s,
  );
  assert.match(css, /\.mockup-composer-actions b \{[^}]*background: var\(--studio-ink\)/s);
  const sigilIdleRules = idleRulesFor(".mockup-sigil");
  assert.match(sigilIdleRules, /display:\s*grid/u);
  assert.match(sigilIdleRules, /place-items:\s*center/u);
  assert.match(sigilIdleRules, /width:\s*29px/u);
  assert.match(sigilIdleRules, /height:\s*29px/u);
  const promptIdleRules = idleRulesFor(".mockup-prompts i");
  assert.match(promptIdleRules, /display:\s*grid/u);
  assert.match(promptIdleRules, /place-items:\s*center/u);
  assert.match(promptIdleRules, /width:\s*26px/u);
  assert.match(promptIdleRules, /height:\s*26px/u);
  assert.match(
    css,
    /@media \(max-width: 720px\) \{[\s\S]*?\.mockup-prompts i \{[^}]*width: 18px;[^}]*height: 18px;[^}]*margin-bottom: 7px;[^}]*\}/u,
  );
  for (const selector of [
    ".mockup-sidebar nav i",
    ".mockup-prompts i",
    ".mockup-sigil",
    ".mockup-composer-actions i",
  ]) {
    assertNoPermanentIdleMaterial(selector);
  }
  assert.doesNotMatch(css, /\.mockup-agent > i \{[^}]*drop-shadow/s);
});
