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

function cssRules(source = css) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectorList, declarations]) => ({
    selectors: selectorList.split(",").map((value) => value.trim()),
    declarations,
  }));
}

function atRuleBody(source, header) {
  const headerIndex = source.indexOf(header);
  assert.notEqual(headerIndex, -1, `${header} must exist`);
  const openIndex = source.indexOf("{", headerIndex);
  let depth = 1;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }
  assert.fail(`${header} must have a closing brace`);
}

function declarationsForSelector(source, selector) {
  return cssRules(source)
    .filter(({ selectors }) => selectors.includes(selector))
    .map(({ declarations }) => declarations)
    .join("\n");
}

function pixelEdges(value) {
  const values = value.split(/\s+/u).map((part) => {
    assert.match(part, /^(?:0|\d+px)$/u);
    return Number.parseInt(part, 10);
  });
  const [top, right = top, bottom = top, left = right] = values;
  return { top, right, bottom, left };
}

function selectorSpecificity(selector) {
  const ids = (selector.match(/#[\w-]+/gu) ?? []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/gu) ?? []).length;
  const withoutCountedParts = selector
    .replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?/gu, " ")
    .replace(/[>+~*]/gu, " ");
  const elements = (withoutCountedParts.match(/\b[a-z][\w-]*\b/gu) ?? []).length;
  return [ids, classes, elements];
}

function compareSpecificity(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function rightmostTargetCompound(selector) {
  let parentheses = 0;
  let brackets = 0;
  for (let index = selector.length - 1; index >= 0; index -= 1) {
    const character = selector[index];
    if (character === ")") parentheses += 1;
    if (character === "(") parentheses -= 1;
    if (character === "]") brackets += 1;
    if (character === "[") brackets -= 1;
    if (
      parentheses === 0 &&
      brackets === 0 &&
      (/\s/u.test(character) || [">", "+", "~"].includes(character))
    ) {
      const target = selector.slice(index + 1).trim();
      if (target !== "") return target;
    }
  }
  return selector.trim();
}

function assertPrimaryRemainsNative(source) {
  for (const { selectors, declarations } of cssRules(source)) {
    const usesInteractionMaterial =
      /--studio-icon-hover-(?:surface|border|glow)-alpha|0 0 18px/u.test(declarations);
    for (const selector of selectors) {
      const isTransient = /:(?:hover|focus-visible)|\.is-hover-preview/u.test(selector);
      const targetsPrimaryClass = selector.includes(".mockup-composer-primary");
      if (targetsPrimaryClass) {
        assert.equal(isTransient, false, "primary Send must not have a transient interaction selector");
        assert.equal(usesInteractionMaterial, false, "primary Send must not use shared interaction material");
      }

      const isComposerDescendant =
        selector.includes(".mockup-composer-actions") &&
        selector.trim() !== ".mockup-composer-actions";
      if (isComposerDescendant && isTransient) {
        assert.match(
          rightmostTargetCompound(selector),
          /^\.mockup-composer-secondary(?::(?:hover|focus-visible)|\.is-hover-preview)$/u,
          "primary Send must not inherit transient composer action material",
        );
      }
    }
  }
}

function assertSelectedOutranksTransient(source) {
  const rules = cssRules(source);
  const transientIndexes = rules
    .map(({ selectors }, index) => selectors.some((selector) =>
      [
        ".mockup-sidebar-control:hover",
        ".mockup-sidebar-control:focus-visible",
        ".mockup-sidebar-control.is-hover-preview",
      ].includes(selector),
    ) ? index : -1)
    .filter((index) => index >= 0);
  const selectedIndex = rules.findIndex(({ selectors }) =>
    selectors.includes(".mockup-sidebar-control.mockup-selected"),
  );
  assert.ok(transientIndexes.length > 0, "sidebar transient material rule must exist");
  assert.ok(selectedIndex > Math.max(...transientIndexes), "selected material must follow sidebar transient material");

  const selected = rules[selectedIndex].declarations;
  assert.match(selected, /background:\s*color-mix\(in srgb, var\(--studio-accent-soft\) var\(--studio-selection-alpha\), transparent\)/u);
  assert.match(selected, /border-color:\s*color-mix\(in srgb, var\(--studio-accent\) 44%, transparent\)/u);
  assert.match(selected, /box-shadow:\s*inset 3px 0 0 var\(--studio-accent\)/u);
  assert.doesNotMatch(selected, /--studio-icon-hover-glow-alpha|0 0 18px/u);
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

test("preview interaction audit rejects primary transient material and selected cascade regressions", () => {
  assert.doesNotThrow(() => assertPrimaryRemainsNative(css));
  assert.throws(
    () => assertPrimaryRemainsNative(`${css}
.mockup-composer-primary:hover {
  background: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-surface-alpha), transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-glow-alpha), transparent);
}`),
    /primary Send must not have a transient interaction selector/u,
  );
  for (const selector of [
    ".mockup-composer-actions b:hover",
    ".mockup-composer-actions b:focus-visible",
    ".mockup-composer-actions b.is-hover-preview",
    ".mockup-composer-actions > :last-child:hover",
  ]) {
    assert.throws(
      () => assertPrimaryRemainsNative(`${css}
${selector} {
  background: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-surface-alpha), transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-glow-alpha), transparent);
}`),
      /primary Send/u,
      `${selector} must be recognized as a primary Send mutation`,
    );
  }
  for (const [selector, declaration] of [
    [".mockup-composer-actions b:hover", "opacity: .5;"],
    [".mockup-composer-actions b:focus-visible", "background: red;"],
    [".mockup-composer-actions .mockup-composer-secondary + b:hover", "opacity: .5;"],
    [".mockup-composer-actions .mockup-composer-secondary + b:focus-visible", "background: red;"],
  ]) {
    assert.throws(
      () => assertPrimaryRemainsNative(`${css}
${selector} {
  ${declaration}
}`),
      /primary Send/u,
      `${selector} must be rejected without relying on interaction tokens`,
    );
  }
  assert.doesNotThrow(() => assertPrimaryRemainsNative(`${css}
.mockup-composer-actions > .mockup-composer-secondary:hover {
  opacity: .5;
}`));

  assert.doesNotThrow(() => assertSelectedOutranksTransient(css));
  const selectedFixture = `.mockup-sidebar-control.mockup-selected {
  background: color-mix(in srgb, var(--studio-accent-soft) var(--studio-selection-alpha), transparent);
  border-color: color-mix(in srgb, var(--studio-accent) 44%, transparent);
  box-shadow: inset 3px 0 0 var(--studio-accent);
}`;
  const transientFixture = `.mockup-sidebar-control:hover {
  background: color-mix(in srgb, var(--studio-accent) var(--studio-icon-hover-surface-alpha), transparent);
}`;
  assert.throws(
    () => assertSelectedOutranksTransient(`${selectedFixture}\n${transientFixture}`),
    /selected material must follow sidebar transient material/u,
  );
  assert.throws(
    () => assertSelectedOutranksTransient(`${transientFixture}\n${selectedFixture.replace(
      "box-shadow: inset 3px 0 0 var(--studio-accent);",
      "box-shadow: 0 0 18px var(--studio-icon-hover-glow-alpha);",
    )}`),
    /box-shadow/u,
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

test("preview sidebar fits a bounded 320px and 375px vertical budget", () => {
  const sidebarMarkup = mockup.match(/<aside className="mockup-sidebar"[\s\S]*?<\/aside>/u)?.[0] ?? "";
  assert.match(sidebarMarkup, /className="mockup-sidebar-control">Codex/u);
  assert.match(sidebarMarkup, /className="mockup-sidebar-control mockup-project mockup-selected"/u);
  assert.match(sidebarMarkup, /<p>Projects<\/p>/u);
  assert.ok(
    [...sidebarMarkup.matchAll(/className="[^"]*\bmockup-sidebar-optional\b[^"]*"/gu)].length >= 6,
    "nonessential sidebar preview rows must be explicitly marked",
  );

  const smallWidthCss = atRuleBody(css, "@media (max-width: 480px)");
  const hideRule = cssRules(smallWidthCss).find(({ declarations }) =>
    declarationValues(declarations, "display").includes("none"),
  );
  assert.ok(hideRule, "small breakpoint must include a display:none hide rule");
  const hideSelector = hideRule.selectors.find((selector) =>
    selector.includes(".mockup-sidebar-optional"),
  );
  assert.ok(hideSelector, "small breakpoint hide rule must target optional sidebar rows");
  for (const competingSelector of [".mockup-sidebar nav span", ".mockup-sidebar footer"]) {
    assert.ok(
      compareSpecificity(
        selectorSpecificity(hideSelector),
        selectorSpecificity(competingSelector),
      ) >= 0,
      `${hideSelector} must outrank ${competingSelector}`,
    );
  }

  const navMarkup = sidebarMarkup.match(/<nav>([\s\S]*?)<\/nav>/u)?.[1] ?? "";
  const navRows = [...navMarkup.matchAll(/<span className="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gu)]
    .map(([, className, contents]) => ({
      className,
      label: contents.replace(/<i>[\s\S]*?<\/i>/gu, "").replace(/<[^>]+>/gu, "").trim(),
    }));
  const retainedNavRows = navRows.filter(({ className }) =>
    !className.split(/\s+/u).includes("mockup-sidebar-optional"),
  );
  const hiddenNavRows = navRows.filter(({ className }) =>
    className.split(/\s+/u).includes("mockup-sidebar-optional"),
  );
  assert.deepEqual(retainedNavRows.map(({ label }) => label), ["New chat", "Commands"]);
  assert.deepEqual(hiddenNavRows.map(({ label }) => label), ["Scheduled", "Plugins"]);
  assert.match(sidebarMarkup, /<footer className="mockup-sidebar-optional">/u);

  const sidebarPadding = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar"),
    "padding",
  )[0]);
  const brandPadding = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar strong"),
    "padding",
  )[0]);
  const brandMargin = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar strong"),
    "margin-bottom",
  )[0]);
  const navPadding = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar nav span"),
    "padding",
  )[0]);
  const navGap = Number.parseInt(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar nav"),
    "gap",
  )[0], 10);
  const headingMargin = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar > p"),
    "margin",
  )[0]);
  const projectPadding = pixelEdges(declarationValues(
    declarationsForSelector(smallWidthCss, ".mockup-sidebar > b"),
    "padding",
  )[0]);

  const conservativeLineHeight = 10;
  const onePixelBorderPair = 2;
  const visibleNavRows = retainedNavRows.length;
  const estimatedDemand =
    sidebarPadding.top + sidebarPadding.bottom +
    conservativeLineHeight + brandPadding.top + brandPadding.bottom + onePixelBorderPair + brandMargin.top +
    visibleNavRows * (conservativeLineHeight + navPadding.top + navPadding.bottom + onePixelBorderPair) +
    navGap * (visibleNavRows - 1) +
    conservativeLineHeight + headingMargin.top + headingMargin.bottom +
    conservativeLineHeight + projectPadding.top + projectPadding.bottom + onePixelBorderPair;
  assert.ok(estimatedDemand <= 96, `compressed sidebar demand ${estimatedDemand}px must stay bounded`);

  for (const viewportWidth of [320, 375]) {
    const mockupWidth = viewportWidth - 28;
    const sidebarInnerHeight = mockupWidth * (10 / 16) * (1 - .078);
    assert.ok(
      estimatedDemand + 8 <= sidebarInnerHeight,
      `${viewportWidth}px viewport must retain at least 8px of sidebar vertical slack`,
    );
  }
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
