import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRIVATE_SKIN_SETTINGS,
  MAX_PROCESSED_IMAGE_BYTES,
  PRIVATE_SKIN_RECIPES,
  createPrivateSkinId,
  normalizePrivateSkinRecipe,
  normalizePrivateSkinSettings,
  parsePrivateSkinId,
} from "../app/lib/private-skin-schema.mjs";
import { derivePalette } from "../app/lib/private-skin-palette.mjs";
import {
  analyzeImagePixels,
  deriveRecipeDefaults,
} from "../app/lib/private-skin-profile.mjs";
import { buildPrivateSkinPackage } from "../app/lib/private-skin-package.mjs";
import {
  lintThemePackage,
  resolveThemeTarget,
  validateThemePackage,
} from "@codextheme/runtime";
import {
  buildPrivateSkinForm,
  processBrowserImage,
  sampledPixels,
  validateSourceFile,
} from "../app/lib/browser-image.mjs";

function splitSelectorList(prelude) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < prelude.length; index += 1) {
    const character = prelude[index];
    if (quote) {
      if (character === quote && prelude[index - 1] !== "\\") quote = "";
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === "(" || character === "[") {
      depth += 1;
    } else if (character === ")" || character === "]") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      selectors.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors;
}

function assertOwnedCssSelectors(css, label) {
  const allowed = /^(?::root\.codextheme-codex-skin|html\.codextheme-codex-skin|#codextheme-codex-skin-chrome)/u;
  for (const match of css.matchAll(/([^{}]+)\{/gu)) {
    const prelude = match[1].trim();
    if (prelude.startsWith("@media")) continue;
    for (const selector of splitSelectorList(prelude)) {
      assert.match(selector, allowed, `${label} CSS contains an unowned selector: ${selector}`);
    }
  }
}

function declarationNames(block) {
  return [...new Set(block
    .split(";")
    .map((declaration) => declaration.match(/^\s*([a-z-]+)\s*:/u)?.[1])
    .filter(Boolean))].sort();
}

function cssRuleBlockForSelector(css, selector) {
  const ownedSelector = `html.codextheme-codex-skin ${selector}`;
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectors = splitSelectorList(match[1].trim()).map((item) => item.replace(/\s+/gu, " "));
    if (selectors.includes(ownedSelector)) return match[2];
  }
  return null;
}

const PRIVATE_SKIN_BASE_ICON_SELECTORS = [
  "aside.app-shell-left-panel button:has(> .text-token-foreground)",
  "aside.app-shell-left-panel .group:has(> button > .text-token-foreground)",
  "aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group",
  ".dream-home button:not(header *, .composer-surface-chrome *)",
  ".composer-surface-chrome button.border-token-border",
];

const PRIVATE_SKIN_BASE_GLYPH_SELECTORS = PRIVATE_SKIN_BASE_ICON_SELECTORS.map((selector, index) => (
  `${selector}${index < 2 ? " :is(.text-token-foreground, svg)" : " svg"}`
));

const PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS = [
  "aside.app-shell-left-panel :is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]):not(:where(.group > button))",
  "aside.app-shell-left-panel .group:has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground)",
];

const PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS = [
  "aside.app-shell-left-panel button:has(> .text-token-foreground):not(:where(.group > button)):is(:hover, :focus-visible):not(:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"])):not(:disabled, [aria-disabled=\"true\"])",
  "aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is(:hover, :focus-visible):not(:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"])):not(:has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground)):not(:disabled, [aria-disabled=\"true\"]):not(:has(> button:is(:disabled, [aria-disabled=\"true\"]) > .text-token-foreground)):not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))",
  "aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group:is(:hover, :focus-visible):not(:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"])):not(:has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground)):not(:disabled, [aria-disabled=\"true\"]):not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))",
  ".dream-home button:not(header *, .composer-surface-chrome *):is(:hover, :focus-visible):not(:disabled, [aria-disabled=\"true\"])",
  ".composer-surface-chrome button.border-token-border:is(:hover, :focus-visible, [data-state=\"open\"]):not(:disabled, [aria-disabled=\"true\"])",
  ".composer-surface-chrome button.border-token-border[data-state=\"open\"]",
  "aside.app-shell-left-panel .group:has(> button > .text-token-foreground):has(button:focus-visible):not(:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"])):not(:has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground)):not(:disabled, [aria-disabled=\"true\"]):not(:has(> button:is(:disabled, [aria-disabled=\"true\"]) > .text-token-foreground)):not(:has(button:focus-visible:is(:disabled, [aria-disabled=\"true\"])))",
];

const PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS = [
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[0]} :is(.text-token-foreground, svg)`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[1]} :is(.text-token-foreground, button:not(:disabled, [aria-disabled="true"]) svg)`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[2]} svg:not(button:is(:disabled, [aria-disabled="true"]) *)`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[3]} svg`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[4]} svg`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[5]} svg`,
  `${PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[6]} :is(.text-token-foreground, button:not(:disabled, [aria-disabled="true"]) svg)`,
];

const PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS = [
  "aside.app-shell-left-panel button:has(> .text-token-foreground):not(:where(.group > button)):is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) :is(.text-token-foreground, svg)",
  "aside.app-shell-left-panel .group:has(> button > .text-token-foreground):is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) :is(.text-token-foreground, svg)",
  "aside.app-shell-left-panel .group:has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground) :is(.text-token-foreground, svg)",
  "aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) svg",
];

function assertPrivateSkinIconRuleScopes(css, label) {
  const prefix = "html.codextheme-codex-skin ";
  const baseIconSelectors = new Set(PRIVATE_SKIN_BASE_ICON_SELECTORS.map((selector) => `${prefix}${selector}`));
  const baseGlyphSelectors = new Set(PRIVATE_SKIN_BASE_GLYPH_SELECTORS.map((selector) => `${prefix}${selector}`));
  const selectedSurfaceSelectors = new Set(PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS.map((selector) => `${prefix}${selector}`));
  const transientIconSelectors = new Set(PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS.map((selector) => `${prefix}${selector}`));
  const transientGlyphSelectors = new Set(PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS.map((selector) => `${prefix}${selector}`));
  const persistentGlyphSelectors = new Set(PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS.map((selector) => `${prefix}${selector}`));
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const block = match[2];
    for (const selector of splitSelectorList(match[1].trim())) {
      const targetsPrivateIcon = /aside\.app-shell-left-panel .*(?:text-token-foreground|\[role="listitem"\] \[role="button"\]\.group)|\.dream-home button|\.composer-surface-chrome button/u.test(selector);
      if (baseIconSelectors.has(selector)) {
        assert.deepEqual(declarationNames(block), ["transition"], `${label} base icon roots must be transition-only.`);
        assert.match(block, /transition:\s*color \.16s ease, background-color \.16s ease, border-color \.16s ease, box-shadow \.16s ease;/u);
      } else if (baseGlyphSelectors.has(selector)) {
        assert.deepEqual(declarationNames(block), ["transition"], `${label} base glyph rules must be transition-only.`);
        assert.match(block, /transition:\s*color \.16s ease, filter \.16s ease;/u);
      } else if (selectedSurfaceSelectors.has(selector)) {
        assert.deepEqual(
          declarationNames(block),
          ["background", "border-color", "border-radius", "box-shadow", "color"],
          `${label} selected roots must contain only selection material.`,
        );
      } else if (transientIconSelectors.has(selector)) {
        assert.deepEqual(
          declarationNames(block),
          ["background-color", "border-color", "box-shadow", "color"],
          `${label} transient icon roots must contain only interaction material.`,
        );
      } else if (transientGlyphSelectors.has(selector)) {
        assert.deepEqual(declarationNames(block), ["color", "filter"], `${label} transient glyph rules must contain only accent material.`);
      } else if (persistentGlyphSelectors.has(selector)) {
        assert.deepEqual(declarationNames(block), ["color"], `${label} persistent glyph rules must contain only selected accent color.`);
      } else if (/\bsvg\b/u.test(selector) || targetsPrivateIcon) {
        assert.fail(`${label} CSS contains an unapproved private icon selector: ${selector}`);
      } else if (/var\(--codextheme-icon-hover-(?:surface|border|glow)-alpha\)/u.test(block)) {
        assert.fail(`${label} CSS contains icon material outside an approved state selector: ${selector}`);
      }
    }
  }
}

function assertPrivateSkinLint(bundle) {
  const prefix = "html.codextheme-codex-skin ";
  const expectedPreludes = [
    ...PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS.map((selector) => [selector]),
    PRIVATE_SKIN_BASE_ICON_SELECTORS,
    PRIVATE_SKIN_BASE_GLYPH_SELECTORS,
    PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS,
    PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS,
    PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS,
  ].map((selectors) => selectors.map((selector) => `${prefix}${selector}`).join(", "));
  const actualPreludes = [...bundle.targets.codex.css.matchAll(/([^{}]+)\{/gu)]
    .map((match) => match[1].trim().replace(/\s+/gu, " "));
  for (const prelude of expectedPreludes) {
    assert.ok(actualPreludes.includes(prelude), `Private skin CSS must retain the exact selector prelude: ${prelude}`);
  }
  assert.equal(
    expectedPreludes[4].slice(0, 240),
    expectedPreludes[5].slice(0, 240),
    "Transient material and glyph preludes must retain the exact shared lint display selector.",
  );
  const expected = [expectedPreludes[2], expectedPreludes[3], expectedPreludes[5], expectedPreludes[6]].flatMap((prelude) => [
    {
      code: "long-selector",
      appId: "codex",
      location: "targets.codex.css",
      selector: prelude.slice(0, 240),
      message: `Selector is ${prelude.length} characters long and may be coupled to DOM structure.`,
    },
    {
      code: "deep-child-chain",
      appId: "codex",
      location: "targets.codex.css",
      selector: prelude.slice(0, 240),
      message: "Deep direct-child chains are sensitive to wrapper changes.",
    },
  ]);
  assert.deepEqual(lintThemePackage(bundle), expected);
}

function isMaterialPaintDeclaration(name) {
  return name === "background"
    || name.startsWith("background-")
    || name === "border"
    || (name.startsWith("border-") && name !== "border-radius")
    || name === "box-shadow";
}

function privateSkinLayerSelectors(css, layer) {
  const selectors = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const declarations = declarationNames(match[2]);
    const containsLayer = layer === "material"
      ? declarations.some(isMaterialPaintDeclaration)
      : declarations.some((declaration) => declaration === "color" || declaration === "filter");
    if (!containsLayer) continue;
    selectors.push(...splitSelectorList(match[1].trim()).map((selector) => selector.replace(/^html\.codextheme-codex-skin /u, "")));
  }
  return selectors;
}

function cssDeclarations(block) {
  return [...block.matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;]+)(?=;|$)/gu)].map((match) => ({
    name: match[1],
    value: match[2].trim().replace(/\s+/gu, " "),
    important: /!important\s*$/u.test(match[2]),
  }));
}

function expandedCascadeDeclarations(declaration) {
  const value = declaration.value.replace(/\s*!important\s*$/u, "");
  const names = declaration.name === "background"
    ? ["background-color"]
    : declaration.name === "border"
      ? ["border-color", "border-style", "border-width"]
      : [declaration.name];
  return names.map((name) => ({ ...declaration, name, value }));
}

function compareSpecificity(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function addSpecificity(left, right) {
  return left.map((value, index) => value + right[index]);
}

function maxSpecificity(items) {
  return items.reduce(
    (winner, item) => compareSpecificity(item, winner) > 0 ? item : winner,
    [0, 0, 0],
  );
}

function matchingDelimiter(text, start, open, close) {
  let depth = 0;
  let quote = "";
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote && text[index - 1] !== "\\") quote = "";
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return text.length - 1;
}

function selectorSpecificity(selector) {
  let specificity = [0, 0, 0];
  let canStartType = true;
  for (let index = 0; index < selector.length;) {
    const character = selector[index];
    if (/\s|[>+~]/u.test(character)) {
      canStartType = true;
      index += 1;
    } else if (character === "#") {
      specificity[0] += 1;
      canStartType = false;
      index += 1;
      while (/[-_a-zA-Z0-9]/u.test(selector[index] ?? "")) index += 1;
    } else if (character === ".") {
      specificity[1] += 1;
      canStartType = false;
      index += 1;
      while (/[-_a-zA-Z0-9]/u.test(selector[index] ?? "")) index += 1;
    } else if (character === "[") {
      specificity[1] += 1;
      canStartType = false;
      index = matchingDelimiter(selector, index, "[", "]") + 1;
    } else if (character === ":") {
      const pseudoElement = selector[index + 1] === ":";
      index += pseudoElement ? 2 : 1;
      const nameStart = index;
      while (/[-a-zA-Z]/u.test(selector[index] ?? "")) index += 1;
      const name = selector.slice(nameStart, index);
      if (pseudoElement) {
        specificity[2] += 1;
      } else if (selector[index] === "(") {
        const end = matchingDelimiter(selector, index, "(", ")");
        const argument = selector.slice(index + 1, end);
        if (name !== "where") {
          const argumentSpecificity = ["is", "not", "has"].includes(name)
            ? maxSpecificity(splitSelectorList(argument).map(selectorSpecificity))
            : [0, 1, 0];
          specificity = addSpecificity(specificity, argumentSpecificity);
        }
        index = end + 1;
      } else {
        specificity[1] += 1;
      }
      canStartType = false;
    } else if (character === "*") {
      canStartType = false;
      index += 1;
    } else if (canStartType && /[-_a-zA-Z]/u.test(character)) {
      specificity[2] += 1;
      canStartType = false;
      while (/[-_a-zA-Z0-9]/u.test(selector[index] ?? "")) index += 1;
    } else {
      index += 1;
    }
  }
  return specificity;
}

function sidebarSelectorParts(selector) {
  const normalized = selector.replace(/^html\.codextheme-codex-skin /u, "");
  const labelSuffix = normalized.indexOf(" :is(.text-token-foreground");
  if (labelSuffix !== -1) {
    return { root: normalized.slice(0, labelSuffix), targets: new Set(["label", "glyph"]) };
  }
  const svgSuffix = normalized.lastIndexOf(" svg");
  if (svgSuffix !== -1) {
    return { root: normalized.slice(0, svgSuffix), targets: new Set(["glyph"]) };
  }
  return { root: normalized, targets: new Set(["surface"]) };
}

function sidebarSelectorMatches(selector, scenario, element) {
  const { root, targets } = sidebarSelectorParts(selector);
  if (!root.startsWith("aside.app-shell-left-panel ") || !targets.has(element)) return false;

  const rootPersistent = scenario.persistentOwner === "root";
  const primaryPersistent = scenario.persistentOwner === "primary";
  const rootDisabled = scenario.disabledTarget === "root" && (scenario.disabled || scenario.ariaDisabled);
  const primaryDisabled = scenario.disabledTarget === "primary" && (scenario.disabled || scenario.ariaDisabled);
  const quickDisabled = scenario.disabledTarget === "quick" && (scenario.disabled || scenario.ariaDisabled);

  let structuralMatch = false;
  if (root.startsWith("aside.app-shell-left-panel :is([aria-current=\"page\"]")) {
    structuralMatch = rootPersistent;
  } else if (root.startsWith("aside.app-shell-left-panel button:has(> .text-token-foreground)")) {
    structuralMatch = scenario.kind === "standalone";
  } else if (root.startsWith("aside.app-shell-left-panel .group:has(> button")) {
    structuralMatch = scenario.kind === "group";
  } else if (root.startsWith("aside.app-shell-left-panel [role=\"listitem\"] [role=\"button\"].group")) {
    structuralMatch = scenario.kind === "listitem";
  }
  if (!structuralMatch) return false;

  const childPersistentOwner = root.includes(":has(> button:is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"]) > .text-token-foreground)");
  const positiveChildPersistentOwner = childPersistentOwner
    && !root.includes(":not(:has(> button:is([aria-current=\"page\"]");
  if (positiveChildPersistentOwner && !primaryPersistent) return false;

  let positiveState = root.startsWith("aside.app-shell-left-panel :is([aria-current=\"page\"]")
    || positiveChildPersistentOwner;
  if (root.includes(":is(:hover, :focus-visible")) {
    positiveState ||= scenario.kind === "standalone"
      ? ["primary-hover", "primary-focus"].includes(scenario.transient)
      : scenario.kind === "group"
        ? ["root-hover", "root-focus", "primary-hover", "quick-hover"].includes(scenario.transient)
        : ["root-hover", "root-focus"].includes(scenario.transient);
    if (root.includes(":is(:hover, :focus-visible, [aria-current=\"page\"]")) positiveState ||= rootPersistent;
  }
  if (root.includes(":has(button:focus-visible)")) {
    positiveState ||= ["primary-focus", "quick-focus"].includes(scenario.transient);
  }
  if (root.includes("):is([aria-current=\"page\"], [aria-selected=\"true\"], [data-state=\"active\"])")) {
    positiveState ||= rootPersistent;
  }
  if (!positiveState) return false;

  if (rootPersistent && root.includes(":not(:is([aria-current=\"page\"]")) return false;
  if (primaryPersistent && root.includes(":not(:has(> button:is([aria-current=\"page\"]")) return false;
  if (rootDisabled && root.includes(":not(:disabled, [aria-disabled=\"true\"])")) return false;
  if (primaryDisabled && root.includes(":not(:has(> button:is(:disabled, [aria-disabled=\"true\"]) > .text-token-foreground))")) return false;
  if (
    primaryDisabled
    && scenario.transient === "primary-hover"
    && root.includes(":not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))")
  ) return false;
  if (
    quickDisabled
    && scenario.transient === "quick-hover"
    && root.includes(":not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))")
  ) return false;
  if (
    quickDisabled
    && scenario.transient === "quick-focus"
    && root.includes(":not(:has(button:focus-visible:is(:disabled, [aria-disabled=\"true\"])))")
  ) return false;
  return true;
}

function sidebarCascadeWinners(css, scenario) {
  const rootIdentity = {
    standalone: "standalone-button",
    group: "group-row",
    listitem: "project-task-row",
  }[scenario.kind];
  const winners = new Map();
  let sourceOrder = 0;

  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    for (const selector of splitSelectorList(rule[1].trim())) {
      sourceOrder += 1;
      const specificity = selectorSpecificity(selector);
      for (const element of ["surface", "label", "glyph"]) {
        if (!sidebarSelectorMatches(selector, scenario, element)) continue;
        for (const declaration of cssDeclarations(rule[2]).flatMap(expandedCascadeDeclarations)) {
          const relevant = element === "surface"
            ? isMaterialPaintDeclaration(declaration.name) || ["color", "border-radius"].includes(declaration.name)
            : ["color", "filter"].includes(declaration.name);
          if (!relevant) continue;
          const identity = element === "surface" ? rootIdentity : `${rootIdentity}-${element}`;
          const key = `${identity}:${declaration.name}`;
          const current = winners.get(key);
          const wins = !current
            || Number(declaration.important) > Number(current.important)
            || (
              declaration.important === current.important
              && (
                compareSpecificity(specificity, current.specificity) > 0
                || (
                  compareSpecificity(specificity, current.specificity) === 0
                  && sourceOrder > current.sourceOrder
                )
              )
            );
          if (wins) winners.set(key, { ...declaration, selector, sourceOrder, specificity });
        }
      }
    }
  }

  return {
    rootIdentity,
    declaration(element, name) {
      const identity = element === "surface" ? rootIdentity : `${rootIdentity}-${element}`;
      return winners.get(`${identity}:${name}`);
    },
    paintedRoots() {
      return [...new Set([...winners.keys()]
        .filter((key) => isMaterialPaintDeclaration(winners.get(key).name))
        .map((key) => key.split(":")[0]))];
    },
  };
}

test("settings clamp to the four editor controls", () => {
  assert.deepEqual(normalizePrivateSkinSettings({
    visibility: 200,
    overlay: -2,
    blur: 99,
    zoom: 120,
    positionX: 40,
    positionY: 65,
  }), {
    recipe: "cinematic",
    visibility: 100,
    overlay: 0,
    blur: 16,
    zoom: 120,
    positionX: 40,
    positionY: 65,
  });
  assert.equal(MAX_PROCESSED_IMAGE_BYTES, 1_200_000);
});

test("settings use safe defaults for missing and non-finite input", () => {
  assert.deepEqual(normalizePrivateSkinSettings({ visibility: Number.NaN, zoom: Infinity }), {
    recipe: "cinematic",
    visibility: 72,
    overlay: 42,
    blur: 2,
    zoom: 110,
    positionX: 50,
    positionY: 50,
  });
});

test("settings expose exactly the seven-field closed recipe schema", () => {
  assert.deepEqual(PRIVATE_SKIN_RECIPES, ["cinematic", "glass", "focus"]);
  assert.ok(Object.isFrozen(PRIVATE_SKIN_RECIPES));
  assert.deepEqual(DEFAULT_PRIVATE_SKIN_SETTINGS, {
    recipe: "cinematic",
    visibility: 72,
    overlay: 42,
    blur: 2,
    zoom: 110,
    positionX: 50,
    positionY: 50,
  });
  assert.equal(normalizePrivateSkinRecipe("focus"), "focus");
  assert.equal(normalizePrivateSkinRecipe("arbitrary-css"), "cinematic");
  assert.deepEqual(normalizePrivateSkinSettings({
    recipe: "glass",
    unknown: true,
    token: "#fff",
    css: "display:none",
    profile: {},
    palette: {},
  }), {
    recipe: "glass",
    visibility: 72,
    overlay: 42,
    blur: 2,
    zoom: 110,
    positionX: 50,
    positionY: 50,
  });
  assert.equal(normalizePrivateSkinSettings({ recipe: "arbitrary-css" }).recipe, "cinematic");
});

test("private ids expose expiry but retain 192 bits of randomness", () => {
  const id = createPrivateSkinId({
    now: new Date("2026-07-19T00:00:00Z"),
    randomBytes: () => Buffer.alloc(24, 7),
  });
  const parsed = parsePrivateSkinId(id);
  assert.equal(parsed.expiresAt.toISOString(), "2026-07-20T00:00:00.000Z");
  assert.match(id, /^[a-z0-9]+\.[A-Za-z0-9_-]{32}$/);
});

test("private ids reject malformed tokens before storage lookup", () => {
  for (const id of ["", "tomorrow.short", "abc!bad.value", "abc/def", "abc." + "a".repeat(31)]) {
    assert.throws(() => parsePrivateSkinId(id), { code: "E_INVALID_ID" });
  }
});

test("palette preserves the legacy compatibility colors", () => {
  assert.deepEqual(derivePalette({ red: 210, green: 70, blue: 120 }), {
    accent: "#b13e67",
    surface: "#271018",
    ink: "#f4f1eb",
    contrast: 74,
  });
  assert.deepEqual(derivePalette({ red: 10, green: 20, blue: 30 }), {
    accent: "#71777d",
    surface: "#07080a",
    ink: "#f4f1eb",
    contrast: 74,
  });
});

function assertSelectedCascade(cascade, selectionAlpha = 24) {
  assert.deepEqual(cascade.paintedRoots(), [cascade.rootIdentity], "Only the selected physical root may own surface paint.");
  assert.match(cascade.declaration("surface", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
  assert.match(
    cascade.declaration("surface", "background-color")?.value ?? "",
    new RegExp(`var\\(--codextheme-accent-soft\\) ${selectionAlpha}%`),
  );
  assert.match(cascade.declaration("surface", "border-color")?.value ?? "", /var\(--codextheme-accent\) 44%/u);
  assert.match(cascade.declaration("surface", "border-radius")?.value ?? "", /var\(--codextheme-radius\)/u);
  assert.match(cascade.declaration("surface", "box-shadow")?.value ?? "", /inset 3px 0 0 var\(--codextheme-accent\)/u);
  for (const name of ["background-color", "border-color", "box-shadow"]) {
    assert.doesNotMatch(
      cascade.declaration("surface", name)?.value ?? "",
      /--codextheme-icon-hover-(?:surface|border|glow)-alpha/u,
      `Selected ${name} must not be won by transient hover tokens.`,
    );
  }
}

function assertTransientCascade(cascade) {
  assert.deepEqual(cascade.paintedRoots(), [cascade.rootIdentity], "Only the hovered/focused physical root may own surface paint.");
  assert.match(cascade.declaration("surface", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
  assert.match(cascade.declaration("surface", "background-color")?.value ?? "", /--codextheme-icon-hover-surface-alpha/u);
  assert.match(cascade.declaration("surface", "border-color")?.value ?? "", /--codextheme-icon-hover-border-alpha/u);
  assert.match(cascade.declaration("surface", "box-shadow")?.value ?? "", /--codextheme-icon-hover-glow-alpha/u);
}

test("sidebar cascade keeps selected material persistent and transient material ephemeral", () => {
  const bundle = validateThemePackage(JSON.parse(buildPrivateSkinPackage({
    id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: normalizePrivateSkinSettings({}),
  })));
  const { css } = resolveThemeTarget(bundle, "codex");
  const materialSelectors = privateSkinLayerSelectors(css, "material");
  const glyphSelectors = privateSkinLayerSelectors(css, "glyph");

  const persistentStates = ["aria-current", "aria-selected", "data-state-active"];
  for (const persistentState of persistentStates) {
    for (const transient of [undefined, "primary-hover", "primary-focus", "quick-focus"]) {
      assertSelectedCascade(sidebarCascadeWinners(css, {
        kind: "group",
        persistentOwner: "primary",
        persistentState,
        transient,
      }));
    }
    for (const transient of [undefined, "root-hover", "root-focus", "primary-focus", "quick-focus"]) {
      assertSelectedCascade(sidebarCascadeWinners(css, {
        kind: "group",
        persistentOwner: "root",
        persistentState,
        transient,
      }));
    }
    for (const transient of [undefined, "primary-hover", "primary-focus"]) {
      assertSelectedCascade(sidebarCascadeWinners(css, {
        kind: "standalone",
        persistentOwner: "root",
        persistentState,
        transient,
      }));
    }
    for (const transient of [undefined, "root-hover", "root-focus"]) {
      assertSelectedCascade(sidebarCascadeWinners(css, {
        kind: "listitem",
        persistentOwner: "root",
        persistentState,
        transient,
      }));
    }
  }

  for (const scenario of [
    { kind: "standalone", transient: "primary-hover" },
    { kind: "standalone", transient: "primary-focus" },
    { kind: "group", transient: "primary-hover" },
    { kind: "group", transient: "primary-focus" },
    { kind: "group", transient: "quick-focus" },
    { kind: "listitem", transient: "root-hover" },
    { kind: "listitem", transient: "root-focus" },
  ]) {
    assertTransientCascade(sidebarCascadeWinners(css, scenario));
  }

  for (const disabledState of [{ disabled: true }, { ariaDisabled: true }]) {
    for (const scenario of [
      { kind: "standalone", transient: "primary-hover", disabledTarget: "root" },
      { kind: "group", transient: "primary-hover", disabledTarget: "primary" },
      { kind: "group", transient: "primary-focus", disabledTarget: "primary" },
      { kind: "group", transient: "quick-focus", disabledTarget: "quick" },
      { kind: "listitem", transient: "root-hover", disabledTarget: "root" },
      { kind: "listitem", transient: "root-focus", disabledTarget: "root" },
    ]) {
      assert.deepEqual(
        sidebarCascadeWinners(css, { ...scenario, ...disabledState }).paintedRoots(),
        [],
        `Disabled and aria-disabled controls must not receive transient material: ${JSON.stringify({ ...scenario, ...disabledState })}`,
      );
    }
    for (const scenario of [
      { kind: "standalone", persistentOwner: "root", disabledTarget: "root" },
      { kind: "group", persistentOwner: "primary", disabledTarget: "primary" },
      { kind: "listitem", persistentOwner: "root", disabledTarget: "root" },
    ]) {
      assertSelectedCascade(sidebarCascadeWinners(css, {
        ...scenario,
        persistentState: "aria-current",
        ...disabledState,
      }));
    }
  }

  for (const scenario of [
    { kind: "standalone", persistentOwner: "root", persistentState: "aria-current", transient: "primary-hover" },
    { kind: "group", persistentOwner: "primary", persistentState: "aria-selected", transient: "quick-focus" },
    { kind: "group", persistentOwner: "root", persistentState: "data-state-active", transient: "primary-focus" },
    { kind: "listitem", persistentOwner: "root", persistentState: "aria-selected", transient: "root-hover" },
  ]) {
    const selected = sidebarCascadeWinners(css, scenario);
    assert.match(selected.declaration("label", "color")?.value ?? selected.declaration("surface", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
    assert.match(selected.declaration("glyph", "color")?.value ?? selected.declaration("surface", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
    assert.equal(selected.declaration("label", "filter"), undefined, "Selected labels must not receive hover glow.");
    assert.equal(selected.declaration("glyph", "filter"), undefined, "Selected glyphs must not receive hover glow.");
  }

  for (const scenario of [
    { kind: "standalone", transient: "primary-hover" },
    { kind: "group", transient: "quick-focus" },
    { kind: "listitem", transient: "root-focus" },
  ]) {
    const transient = sidebarCascadeWinners(css, scenario);
    assert.match(transient.declaration("glyph", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
    assert.match(transient.declaration("glyph", "filter")?.value ?? "", /drop-shadow\(0 0 7px/u);
    if (scenario.kind !== "listitem") {
      assert.match(transient.declaration("label", "color")?.value ?? "", /var\(--codextheme-accent\)/u);
      assert.match(transient.declaration("label", "filter")?.value ?? "", /drop-shadow\(0 0 7px/u);
    }
  }

  assert.deepEqual(
    materialSelectors.filter((selector) => selector.startsWith("aside.app-shell-left-panel ")),
    [...PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS, ...PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS.filter((selector) => selector.startsWith("aside."))],
    "Sidebar material selectors must consist only of selected surfaces and guarded transient surfaces.",
  );
  assert.deepEqual(
    glyphSelectors.filter((selector) => selector.startsWith("aside.app-shell-left-panel ") && /\s(?:svg|:is\(\.text-token-foreground)/u.test(selector)),
    [
      ...PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS.filter((selector) => selector.startsWith("aside.")),
      ...PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS,
    ],
    "Sidebar glyph selectors must separate transient glow from persistent accent color.",
  );

  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    if (!/var\(--codextheme-icon-hover-(?:surface|border|glow)-alpha\)/u.test(rule[2])) continue;
    if (!cssDeclarations(rule[2]).some((declaration) => isMaterialPaintDeclaration(declaration.name))) continue;
    for (const selector of splitSelectorList(rule[1].trim())) {
      for (const scenario of [
        { kind: "standalone", persistentOwner: "root" },
        { kind: "group", persistentOwner: "root" },
        { kind: "group", persistentOwner: "primary" },
        { kind: "listitem", persistentOwner: "root" },
      ]) {
        assert.equal(
          sidebarSelectorMatches(selector, { ...scenario, persistentState: "aria-current" }, "surface"),
          false,
          `Sidebar persistent state must not match a hover-token material selector: ${selector}`,
        );
      }
    }
  }

  assert.deepEqual(
    privateSkinLayerSelectors(
      "html.codextheme-codex-skin aside.app-shell-left-panel button:has(> .text-token-foreground) { border: 1px solid red; background-image: linear-gradient(red, blue); }",
      "material",
    ),
    ["aside.app-shell-left-panel button:has(> .text-token-foreground)"],
    "Material audit must recognize paint shorthands and longhand background properties.",
  );

  assert.ok(PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[0].includes(":not(:disabled, [aria-disabled=\"true\"])"));
  assert.ok(PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[1].includes(":not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))"));
  assert.ok(PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[6].includes(":not(:has(button:focus-visible:is(:disabled, [aria-disabled=\"true\"])))"));
  assert.equal(
    PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[4],
    ".composer-surface-chrome button.border-token-border:is(:hover, :focus-visible, [data-state=\"open\"]):not(:disabled, [aria-disabled=\"true\"])",
    "Composer coverage must remain limited to enabled secondary controls, excluding Send.",
  );
  const composerOpen = cssRuleBlockForSelector(css, PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[4]);
  assert.match(composerOpen ?? "", /--codextheme-icon-hover-surface-alpha/u, "Composer open must retain full interaction material.");
  assert.match(composerOpen ?? "", /--codextheme-icon-hover-border-alpha/u, "Composer open must retain the interaction border.");
  assert.match(composerOpen ?? "", /--codextheme-icon-hover-glow-alpha/u, "Composer open must retain the interaction glow.");
  assert.equal(
    cssRuleBlockForSelector(css, PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[5]),
    composerOpen,
    "Composer open must retain full material even when the enabled-interaction selector does not match.",
  );
  assert.doesNotMatch(css, /\.size-token-button-composer/u, "Send must remain outside private icon material selectors.");
});

test("generated packages contain only local images and safe Codex CSS", () => {
  const serialized = buildPrivateSkinPackage({
    id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: normalizePrivateSkinSettings({}),
  });
  const bundle = validateThemePackage(JSON.parse(serialized));
  assert.equal(bundle.format, "codextheme-theme");
  assert.doesNotMatch(serialized, /codedrobe/iu);
  assertPrivateSkinLint(bundle);
  const target = resolveThemeTarget(bundle, "codex");
  assert.deepEqual(bundle.targets.codex.options.baseTheme, {
    mode: "dark",
    codeTheme: "codex",
    accent: "#c4b5fd",
    contrast: 74,
    ink: "#f4f1eb",
    surface: "#151921",
    opaqueWindows: true,
  });
  for (const palette of [
    {
      accent: "url(https://example.com/tracker)",
      surface: "#ffffff",
      contrast: 100,
    },
    { accent: ["#abcdef"], surface: "#ffffff", contrast: 74 },
    { accent: "#abcdef", surface: ["#ffffff"], contrast: 74 },
  ]) {
    const invalidPaletteBundle = validateThemePackage(JSON.parse(buildPrivateSkinPackage({
      id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      exportedAt: "2026-07-19T00:00:00.000Z",
      image: Buffer.from("safe-image"),
      settings: normalizePrivateSkinSettings({}),
      palette,
    })));
    assert.deepEqual(invalidPaletteBundle.targets.codex.options.baseTheme, bundle.targets.codex.options.baseTheme);
    assert.equal(invalidPaletteBundle.targets.codex.css, bundle.targets.codex.css);
  }
  assert.deepEqual(Object.keys(target.imageDataUrls).sort(), ["hero", "session-bg"]);
  assert.doesNotMatch(target.css, /@import|url\(\s*["']?https?:/i);
  assert.match(target.css, /background-position: 50% 50%/);
  const homeWindow = target.css.match(/body:has\(\.dream-home\)::before\s*\{([^}]*)\}/s);
  const homeSurface = target.css.match(/\.dream-home\s*\{([^}]*)\}/s);
  assert.ok(homeWindow, "Home must select its image on the fixed window layer.");
  assert.ok(homeSurface, "Home must retain its route-specific surface rule.");
  assert.match(homeWindow[1], /var\(--codextheme-image-hero\)/);
  assert.doesNotMatch(homeSurface[1], /var\(--codextheme-image-hero\)/);
});

test("owned selector audit rejects an unowned branch in a multiline selector list", () => {
  assert.throws(
    () => assertOwnedCssSelectors(`body,\n#codextheme-codex-skin-chrome .dream-signature { color: red; }`, "probe"),
    /unowned selector: body/u,
  );
});

test("SVG scope audit rejects a permanent branch hidden by a stateful sibling", () => {
  assert.throws(
    () => assertPrivateSkinIconRuleScopes(`html.codextheme-codex-skin :hover svg,
html.codextheme-codex-skin svg { color: red; }`, "probe"),
    /unapproved private icon selector/u,
  );
});

test("SVG scope audit rejects negated hover as a positive interaction state", () => {
  assert.throws(
    () => assertPrivateSkinIconRuleScopes(
      "html.codextheme-codex-skin svg:not(:hover) { color: red; }",
      "probe",
    ),
    /unapproved private icon selector/u,
  );
});

test("SVG scope audit rejects a permissive state pseudo-class branch", () => {
  assert.throws(
    () => assertPrivateSkinIconRuleScopes(
      "html.codextheme-codex-skin :is(*, :hover) svg { color: red; }",
      "probe",
    ),
    /unapproved private icon selector/u,
  );
});

test("icon rule audit rejects same-line material appended to a transition-only rule", () => {
  const selector = `html.codextheme-codex-skin ${PRIVATE_SKIN_BASE_GLYPH_SELECTORS[4]}`;
  assert.throws(
    () => assertPrivateSkinIconRuleScopes(
      `${selector} { transition: color .16s ease, filter .16s ease; color: red; }`,
      "probe",
    ),
    /transition-only/u,
  );
});

test("recipe profiles generate distinct complete adaptive surface systems", () => {
  const profile = analyzeImagePixels({
    data: new Uint8Array([
      240, 40, 80,
      30, 180, 210,
      40, 60, 220,
      240, 200, 40,
    ]),
    width: 2,
    height: 2,
    channels: 3,
  });
  const expectations = {
    cinematic: {
      sidebarAlpha: 78,
      mainAlpha: 32,
      headerAlpha: 60,
      composerAlpha: 94,
      codeAlpha: 92,
      selectionAlpha: 24,
      sidebarBlur: 20,
      mainBlur: 0,
      headerBlur: 18,
      composerBlur: 22,
      borderAlpha: 38,
      radius: 12,
      iconHoverSurfaceAlpha: 30,
      iconHoverBorderAlpha: 52,
      iconHoverGlowAlpha: 28,
      artworkBlur: 0,
      saturation: "1.04",
      imageContrast: "1.06",
      shadow: "0 22px 58px rgba(0,0,0,.42)",
    },
    glass: {
      sidebarAlpha: 62,
      mainAlpha: 20,
      headerAlpha: 44,
      composerAlpha: 76,
      codeAlpha: 78,
      selectionAlpha: 16,
      sidebarBlur: 26,
      mainBlur: 0,
      headerBlur: 24,
      composerBlur: 28,
      borderAlpha: 30,
      radius: 16,
      iconHoverSurfaceAlpha: 20,
      iconHoverBorderAlpha: 40,
      iconHoverGlowAlpha: 18,
      artworkBlur: 0,
      saturation: "1.08",
      imageContrast: "1.02",
      shadow: "0 18px 42px rgba(0,0,0,.30)",
    },
    focus: {
      sidebarAlpha: 94,
      mainAlpha: 82,
      headerAlpha: 92,
      composerAlpha: 98,
      codeAlpha: 98,
      selectionAlpha: 10,
      sidebarBlur: 10,
      mainBlur: 0,
      headerBlur: 10,
      composerBlur: 12,
      borderAlpha: 18,
      radius: 8,
      iconHoverSurfaceAlpha: 10,
      iconHoverBorderAlpha: 28,
      iconHoverGlowAlpha: 0,
      artworkBlur: 1,
      saturation: "0.92",
      imageContrast: "1.00",
      shadow: "0 12px 28px rgba(0,0,0,.24)",
    },
  };
  const cssByRecipe = [];

  for (const [recipe, expected] of Object.entries(expectations)) {
    const serialized = buildPrivateSkinPackage({
      id: `mtest123.${recipe[0].repeat(32)}`,
      exportedAt: "2026-07-19T00:00:00.000Z",
      image: Buffer.from("safe-image"),
      settings: deriveRecipeDefaults(profile, recipe),
      profile,
    });
    const bundle = validateThemePackage(JSON.parse(serialized));
    assertPrivateSkinLint(bundle);
    const target = resolveThemeTarget(bundle, "codex");
    const { css } = target;
    cssByRecipe.push(css);

    assert.deepEqual(Object.keys(target.imageDataUrls).sort(), ["hero", "session-bg"]);
    assert.doesNotMatch(css, /@import|url\(\s*["']?https?:/i);
    assert.doesNotMatch(css, /__[A-Z0-9_]+__/u);
    assertOwnedCssSelectors(css, recipe);
    for (const selector of [
      "aside.app-shell-left-panel",
      "main.main-surface",
      "header.app-header-tint",
      ".composer-surface-chrome",
      "[aria-current=\"page\"]",
      ":is(pre, code, [data-language])",
    ]) {
      assert.ok(css.includes(selector), `${recipe} CSS must retain ${selector}.`);
    }
    for (const variable of [
      "--codextheme-accent",
      "--codextheme-accent-soft",
      "--codextheme-surface",
      "--codextheme-surface-raised",
      "--codextheme-ink",
      "--codextheme-muted-ink",
      "--codextheme-line",
      "--codextheme-radius",
      "--codextheme-icon-hover-surface-alpha",
      "--codextheme-icon-hover-border-alpha",
      "--codextheme-icon-hover-glow-alpha",
    ]) {
      assert.ok(css.includes(`${variable}:`), `${recipe} CSS must define ${variable}.`);
    }

    const sidebar = css.match(/aside\.app-shell-left-panel\s*\{([^}]*)\}/s);
    const main = css.match(/main\.main-surface\s*\{([^}]*)\}/s);
    const header = css.match(/header\.app-header-tint\s*\{([^}]*)\}/s);
    const composer = css.match(/\.composer-surface-chrome\s*\{([^}]*)\}/s);
    const selected = cssRuleBlockForSelector(css, PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS[0]);
    const code = css.match(/:is\(pre, code, \[data-language\]\)\s*\{([^}]*)\}/s);
    const baseTransition = cssRuleBlockForSelector(css, PRIVATE_SKIN_BASE_ICON_SELECTORS[4]);
    const baseGlyphTransition = cssRuleBlockForSelector(css, PRIVATE_SKIN_BASE_GLYPH_SELECTORS[4]);
    const stateMaterial = cssRuleBlockForSelector(css, PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[4]);
    const stateGlyph = cssRuleBlockForSelector(css, PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS[4]);
    assert.ok(sidebar, `${recipe} CSS must include the owned sidebar rule.`);
    assert.ok(main, `${recipe} CSS must include the main surface rule.`);
    assert.ok(header, `${recipe} CSS must include the header rule.`);
    assert.ok(composer, `${recipe} CSS must include the composer rule.`);
    assert.ok(selected, `${recipe} CSS must scope selected states to the owned sidebar.`);
    assert.ok(code, `${recipe} CSS must include the code surface rule.`);
    for (const selector of [
      ...PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS,
      ...PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS,
      ...PRIVATE_SKIN_TRANSIENT_GLYPH_SELECTORS,
      ...PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS,
    ]) {
      assert.ok(css.includes(selector), `${recipe} CSS must scope icon material to ${selector}.`);
    }
    assert.ok(baseTransition, `${recipe} CSS must transition secondary composer controls.`);
    assert.ok(baseGlyphTransition, `${recipe} CSS must transition secondary composer glyphs.`);
    assert.ok(stateMaterial, `${recipe} CSS must materialize only secondary composer controls on interaction.`);
    assert.ok(stateGlyph, `${recipe} CSS must accent secondary composer glyphs on interaction.`);
    assert.ok(
      css.includes("aside.app-shell-left-panel .group:has(> button > .text-token-foreground):has(button:focus-visible)"),
      `${recipe} CSS must materialize grouped rows when a child button receives keyboard focus.`,
    );
    for (const selector of PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS.filter((_, index) => index !== 5)) {
      assert.match(selector, /:not\([^)]*(?:disabled|aria-disabled)/u, `${recipe} interaction selector must exclude disabled controls: ${selector}`);
    }
    for (const selector of PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS.slice(1, 3)) {
      assert.ok(
        selector.includes(":not(:has(button:hover:is(:disabled, [aria-disabled=\"true\"])))"),
        `${recipe} grouped interaction selector must exclude a hovered disabled child: ${selector}`,
      );
    }
    for (const selector of [
      ...PRIVATE_SKIN_SELECTED_SURFACE_SELECTORS,
      ...PRIVATE_SKIN_PERSISTENT_GLYPH_SELECTORS,
      PRIVATE_SKIN_TRANSIENT_ICON_SELECTORS[5],
    ]) {
      assert.doesNotMatch(selector, /:not\([^)]*(?:disabled|aria-disabled)/u, `${recipe} persistent selector must retain disabled selected/open states: ${selector}`);
    }
    assert.match(sidebar[1], new RegExp(`surface\\) ${expected.sidebarAlpha}%`));
    assert.match(sidebar[1], new RegExp(`accent\\) ${expected.borderAlpha}%`));
    assert.match(sidebar[1], new RegExp(`blur\\(${expected.sidebarBlur}px\\) saturate\\(1\\.08\\)`));
    assert.match(main[1], new RegExp(`surface\\) ${expected.mainAlpha}%`));
    assert.match(main[1], new RegExp(`accent\\) ${expected.borderAlpha}%`));
    assert.match(main[1], new RegExp(`blur\\(${expected.mainBlur}px\\) saturate\\(1\\.03\\)`));
    assert.match(header[1], new RegExp(`surface-raised\\) ${expected.headerAlpha}%`));
    assert.match(header[1], new RegExp(`accent\\) ${expected.borderAlpha}%`));
    assert.match(header[1], new RegExp(`blur\\(${expected.headerBlur}px\\)`));
    assert.match(composer[1], new RegExp(`surface-raised\\) ${expected.composerAlpha}%`));
    assert.match(composer[1], new RegExp(`accent\\) ${expected.borderAlpha}%`));
    assert.match(composer[1], /border-radius:\s*var\(--codextheme-radius\)/);
    assert.ok(composer[1].includes(`box-shadow: ${expected.shadow}`));
    assert.match(composer[1], new RegExp(`blur\\(${expected.composerBlur}px\\) saturate\\(1\\.08\\)`));
    assert.match(selected, new RegExp(`accent-soft\\) ${expected.selectionAlpha}%`));
    assert.match(selected, /accent\) 44%/);
    assert.match(selected, /inset 3px 0 0 var\(--codextheme-accent\)/);
    assert.match(selected, /border-radius:\s*var\(--codextheme-radius\)/);
    assert.match(code[1], new RegExp(`surface\\) ${expected.codeAlpha}%`));
    assert.match(stateMaterial, /color:\s*var\(--codextheme-accent\)\s*!important;/);
    assert.match(stateMaterial, /background-color:\s*color-mix\(in srgb, var\(--codextheme-accent\) var\(--codextheme-icon-hover-surface-alpha\), transparent\)/);
    assert.match(stateMaterial, /border-color:\s*color-mix\(in srgb, var\(--codextheme-accent\) var\(--codextheme-icon-hover-border-alpha\), transparent\)\s*!important;/);
    assert.match(stateMaterial, /box-shadow:\s*inset 0 0 0 1px color-mix\(in srgb, var\(--codextheme-accent\) var\(--codextheme-icon-hover-border-alpha\), transparent\),\s*0 0 18px color-mix\(in srgb, var\(--codextheme-accent\) var\(--codextheme-icon-hover-glow-alpha\), transparent\)/s);
    assert.match(baseTransition, /transition:\s*color \.16s ease, background-color \.16s ease, border-color \.16s ease, box-shadow \.16s ease;/);
    assert.doesNotMatch(baseTransition, /filter/u);
    assert.match(baseGlyphTransition, /transition:\s*color \.16s ease, filter \.16s ease;/);
    assert.match(stateGlyph, /color:\s*var\(--codextheme-accent\)\s*!important;/);
    assert.match(stateGlyph, /filter:\s*drop-shadow\(0 0 7px color-mix\(in srgb, var\(--codextheme-accent\) var\(--codextheme-icon-hover-glow-alpha\), transparent\)\);/);
    assert.doesNotMatch(css, /(?:\.dream-home|\.composer-surface-chrome) :is\(button, \[role="button"\]\) svg\s*\{/u);
    assert.doesNotMatch(css, /aside\.app-shell-left-panel :is\(button, a, \[role="button"\]\) svg\s*\{/u);
    assert.doesNotMatch(css, /\[data-message-author-role="assistant"\] svg\s*\{/u);
    assertPrivateSkinIconRuleScopes(css, recipe);
    assert.doesNotMatch(css, /\.size-token-button-composer/u);
    assert.deepEqual(
      [...css.matchAll(/--codextheme-icon-[a-z-]+:/gu)].map((match) => match[0]),
      [
        "--codextheme-icon-hover-surface-alpha:",
        "--codextheme-icon-hover-border-alpha:",
        "--codextheme-icon-hover-glow-alpha:",
      ],
    );
    assert.match(css, new RegExp(`--codextheme-icon-hover-surface-alpha: ${expected.iconHoverSurfaceAlpha}%`));
    assert.match(css, new RegExp(`--codextheme-icon-hover-border-alpha: ${expected.iconHoverBorderAlpha}%`));
    assert.match(css, new RegExp(`--codextheme-icon-hover-glow-alpha: ${expected.iconHoverGlowAlpha}%`));
    assert.match(css, new RegExp(`--codextheme-radius: ${expected.radius}px`));

    const sessionWindow = css.match(/body::before\s*\{([^}]*)\}/s);
    assert.ok(sessionWindow, "Session must retain the fixed window layer.");
    assert.match(sessionWindow[1], /position:\s*fixed;[^}]*inset:\s*-5%;/s);
    assert.match(sessionWindow[1], /var\(--codextheme-image-session-bg\)/);
    assert.match(sessionWindow[1], new RegExp(`filter: blur\\(${expected.artworkBlur}px\\) saturate\\(${expected.saturation}\\) contrast\\(${expected.imageContrast}\\)`));
    const homeWindow = css.match(/body:has\(\.dream-home\)::before\s*\{([^}]*)\}/s);
    const homeSurface = css.match(/\.dream-home\s*\{([^}]*)\}/s);
    assert.ok(homeWindow, "Home must select its image on the fixed window layer.");
    assert.ok(homeSurface, "Home must retain its route-specific surface rule.");
    assert.match(homeWindow[1], /var\(--codextheme-image-hero\)/);
    assert.doesNotMatch(homeSurface[1], /var\(--codextheme-image-hero\)/);

    const baseTheme = bundle.targets.codex.options.baseTheme;
    assert.match(css, new RegExp(`--codextheme-accent: ${baseTheme.accent}`));
    assert.match(css, new RegExp(`--codextheme-ink: ${baseTheme.ink}`));
    assert.match(css, new RegExp(`--codextheme-surface: ${baseTheme.surface}`));
    assert.equal(baseTheme.contrast, Math.min(100, Math.max(60, profile.contrast)));
  }

  assert.equal(new Set(cssByRecipe).size, 3);

  const packageInput = {
    id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: deriveRecipeDefaults(profile, "cinematic"),
    profile,
  };
  const profileOnly = JSON.parse(buildPrivateSkinPackage(packageInput));
  const withLegacyPalette = JSON.parse(buildPrivateSkinPackage({
    ...packageInput,
    palette: {
      accent: "#ffffff",
      surface: "#ffffff",
      contrast: 100,
    },
  }));
  assert.deepEqual(withLegacyPalette.targets.codex, profileOnly.targets.codex);
});

test("browser upload accepts only bounded raster sources", () => {
  assert.deepEqual(validateSourceFile({ type: "image/jpeg", size: 200_000 }), { ok: true });
  assert.deepEqual(validateSourceFile({ type: "image/svg+xml", size: 200_000 }), {
    ok: false,
    error: "Choose a JPEG, PNG, or WebP image.",
  });
  assert.deepEqual(validateSourceFile({ type: "image/png", size: 10_000_001 }), {
    ok: false,
    error: "Choose an image smaller than 10 MB.",
  });
});

test("upload request retains only the normalized seven-field settings contract", () => {
  const body = buildPrivateSkinForm({
    image: new Blob(["x"], { type: "image/webp" }),
    settings: {
      recipe: "glass",
      visibility: 90,
      profile: { primary: "#ffffff" },
      palette: { accent: "#ffffff" },
      filename: "private.webp",
      unknown: "discard",
    },
  });
  assert.deepEqual([...body.keys()], ["image", "settings"]);
  const settings = JSON.parse(String(body.get("settings")));
  assert.deepEqual(settings, {
    recipe: "glass",
    visibility: 90,
    overlay: 42,
    blur: 2,
    zoom: 110,
    positionX: 50,
    positionY: 50,
  });
  assert.deepEqual(Object.keys(settings), [
    "recipe",
    "visibility",
    "overlay",
    "blur",
    "zoom",
    "positionX",
    "positionY",
  ]);
  for (const key of ["profile", "unknown", "palette", "filename"]) {
    assert.equal(Object.hasOwn(settings, key), false);
  }
});

test("browser sampling fails clearly when a 2D canvas is unavailable", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  try {
    assert.throws(
      () => sampledPixels({}),
      /2D canvas context is unavailable/u,
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("browser processing returns the shared profile from a bounded RGBA sample", async () => {
  const previousDocument = globalThis.document;
  const previousCreateImageBitmap = globalThis.createImageBitmap;
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 220;
    pixels[index + 1] = index % 8 === 0 ? 180 : 48;
    pixels[index + 2] = 76;
    pixels[index + 3] = 255;
  }
  let canvasCount = 0;
  let closed = false;
  globalThis.document = {
    createElement(type) {
      assert.equal(type, "canvas");
      canvasCount += 1;
      if (canvasCount === 1) {
        return {
          getContext: () => ({
            fillRect() {},
            drawImage() {},
            set fillStyle(value) {},
          }),
          toBlob(callback) {
            callback(new Blob(["normalized"], { type: "image/webp" }));
          },
        };
      }
      return {
        getContext: () => ({
          drawImage() {},
          getImageData: () => ({ data: pixels }),
        }),
      };
    },
  };
  globalThis.createImageBitmap = async () => ({
    width: 800,
    height: 500,
    close() { closed = true; },
  });

  try {
    const processed = await processBrowserImage(new Blob(["source"], { type: "image/png" }));
    assert.deepEqual(processed.profile, analyzeImagePixels({
      data: pixels,
      width: 32,
      height: 32,
      channels: 4,
    }));
    assert.equal(Object.hasOwn(processed, "palette"), false);
    assert.equal(processed.width, 800);
    assert.equal(processed.height, 500);
    assert.equal(closed, true);
    URL.revokeObjectURL(processed.url);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousCreateImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = previousCreateImageBitmap;
  }
});
