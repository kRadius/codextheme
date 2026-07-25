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
const previewInteractionFamilies = [
  "mockup-sidebar-control",
  "mockup-header-control",
  "mockup-summary-control",
  "mockup-menu-control",
  "mockup-prompt-control",
  "mockup-composer-secondary",
];

function cssRules() {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectorList, declarations]) => ({
    selectors: selectorList.split(",").map((value) => value.trim()),
    declarations,
  }));
}

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

function assertAllowedIdleBorderValue(property, value, selector) {
  assert.doesNotMatch(value, /[a-z][\w-]*\s*\(/iu, `${selector} ${property} must not use a color-producing function`);
  const allowedValue = property === "border-color"
    ? /^transparent$/u
    : /^(?:0|none|1px solid transparent)$/u;
  assert.match(value, allowedValue, `${selector} ${property} must remain transparent`);
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
      assertAllowedIdleBorderValue(property, value, selector);
    }
  }
  for (const value of declarationValues(idleRules, "box-shadow")) {
    assert.equal(value, "none", `${selector} box-shadow must remain visually empty`);
  }
  assert.doesNotMatch(idleRules, /drop-shadow\s*\(/u, `${selector} must not have an idle drop-shadow`);
}

test("idle border validation rejects visible transparent color mixes", () => {
  for (const [property, value] of [
    ["border-color", "transparent"],
    ["border", "0"],
    ["border", "none"],
    ["border", "1px solid transparent"],
  ]) {
    assert.doesNotThrow(() => assertAllowedIdleBorderValue(property, value, ".synthetic-idle-icon"));
  }
  assert.throws(() => {
    assertAllowedIdleBorderValue(
      "border",
      "1px solid color-mix(in srgb, var(--studio-accent) 40%, transparent)",
      ".synthetic-idle-icon",
    );
  });
});

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

test("preview markup demonstrates every private skin interaction family", () => {
  for (const family of previewInteractionFamilies) {
    assert.match(
      mockup,
      new RegExp(`className="[^"]*\\b${family}\\b[^"]*"`),
      `mockup must include a ${family} representative`,
    );
  }

  assert.match(
    mockup,
    /className="[^"]*\bmockup-summary-control\b[^"]*\bis-hover-preview\b[^"]*"/,
    "a summary row must keep the interaction material visibly demonstrated",
  );
  assert.match(mockup, /className="[^"]*\bmockup-selected\b[^"]*"/);
  assert.match(mockup, /className="[^"]*\bmockup-composer-primary\b[^"]*"/);
});

test("preview interaction families share one material rule and exclude primary Send", () => {
  const rules = cssRules();
  const baseRules = rules.filter(({ selectors }) =>
    previewInteractionFamilies.every((family) => selectors.includes(`.${family}`)),
  );
  assert.equal(baseRules.length, 1, "all six preview families must share one base interaction rule");
  assert.match(baseRules[0].declarations, /border:\s*1px solid transparent/u);
  assert.match(baseRules[0].declarations, /transition:[^;}]*\.16s/u);

  const materialRules = rules.filter(({ declarations }) =>
    [
      "--studio-icon-hover-surface-alpha",
      "--studio-icon-hover-border-alpha",
      "--studio-icon-hover-glow-alpha",
    ].every((token) => declarations.includes(`var(${token})`)),
  );
  assert.equal(materialRules.length, 1, "all six preview families must share one material rule");
  const materialRule = materialRules[0];
  for (const family of previewInteractionFamilies) {
    for (const state of [":hover", ":focus-visible", ".is-hover-preview"]) {
      assert.ok(
        materialRule.selectors.includes(`.${family}${state}`),
        `${family}${state} must use the shared material`,
      );
    }
  }
  assert.match(materialRule.declarations, /color:\s*var\(--studio-accent\)/u);
  assert.match(materialRule.declarations, /background:\s*color-mix\(in srgb, var\(--studio-accent\) var\(--studio-icon-hover-surface-alpha\), transparent\)/u);
  assert.match(materialRule.declarations, /border-color:\s*color-mix\(in srgb, var\(--studio-accent\) var\(--studio-icon-hover-border-alpha\), transparent\)/u);
  assert.match(materialRule.declarations, /inset 0 0 0 1px[^;]*0 0 18px[^;]*var\(--studio-icon-hover-glow-alpha\)/su);

  const sharedInteractionSelectors = rules
    .filter(({ selectors }) => selectors.some((selector) =>
      previewInteractionFamilies.some((family) => selector.includes(`.${family}`)),
    ))
    .flatMap(({ selectors }) => selectors);
  assert.equal(
    sharedInteractionSelectors.some((selector) => selector.includes(".mockup-composer-primary")),
    false,
    "primary Send must stay outside shared interaction selectors",
  );
});

test("preview session rail constrains desktop and narrow layout overflow", () => {
  assert.match(
    css,
    /\.mockup-session-body \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(92px, 31%\);[^}]*overflow: hidden;/su,
  );
  assert.match(
    css,
    /\.mockup-summary-control b, \.mockup-summary-control small \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/su,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\) \{[\s\S]*?\.mockup-session-body \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(74px, 34%\);[^}]*gap: 6px;[^}]*\}/u,
  );
  assert.match(
    css,
    /@media \(max-width: 720px\) \{[\s\S]*?\.mockup-summary, \.mockup-menu \{[^}]*padding: 3px;[^}]*\}/u,
  );
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
  assert.match(mockup, /<i className="mockup-composer-secondary">⌁<\/i>/);
  assert.match(mockup, /<b className="mockup-composer-primary">↑<\/b>/);
  assert.match(css, /\.mockup-composer-primary \{[^}]*background: var\(--studio-ink\)/s);
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
    ".mockup-composer-secondary",
  ]) {
    assertNoPermanentIdleMaterial(selector);
  }
  assert.doesNotMatch(css, /\.mockup-agent > i \{[^}]*drop-shadow/s);
});
