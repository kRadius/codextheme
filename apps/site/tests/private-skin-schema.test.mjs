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
  const allowed = /^(?::root\.codedrobe-codex-skin|html\.codedrobe-codex-skin|#codedrobe-codex-skin-chrome)/u;
  for (const match of css.matchAll(/([^{}]+)\{/gu)) {
    const prelude = match[1].trim();
    if (prelude.startsWith("@media")) continue;
    for (const selector of splitSelectorList(prelude)) {
      assert.match(selector, allowed, `${label} CSS contains an unowned selector: ${selector}`);
    }
  }
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

test("generated packages contain only local images and safe Codex CSS", () => {
  const serialized = buildPrivateSkinPackage({
    id: "mtest123.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exportedAt: "2026-07-19T00:00:00.000Z",
    image: Buffer.from("safe-image"),
    settings: normalizePrivateSkinSettings({}),
  });
  const bundle = validateThemePackage(JSON.parse(serialized));
  assert.deepEqual(lintThemePackage(bundle), []);
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
  assert.deepEqual(Object.keys(target.imageDataUrls).sort(), ["hero", "session-bg"]);
  assert.doesNotMatch(target.css, /@import|url\(\s*["']?https?:/i);
  assert.match(target.css, /background-position: 50% 50%/);
  const homeWindow = target.css.match(/body:has\(\.dream-home\)::before\s*\{([^}]*)\}/s);
  const homeSurface = target.css.match(/\.dream-home\s*\{([^}]*)\}/s);
  assert.ok(homeWindow, "Home must select its image on the fixed window layer.");
  assert.ok(homeSurface, "Home must retain its route-specific surface rule.");
  assert.match(homeWindow[1], /var\(--codedrobe-image-hero\)/);
  assert.doesNotMatch(homeSurface[1], /var\(--codedrobe-image-hero\)/);
});

test("owned selector audit rejects an unowned branch in a multiline selector list", () => {
  assert.throws(
    () => assertOwnedCssSelectors(`body,\n#codedrobe-codex-skin-chrome .dream-signature { color: red; }`, "probe"),
    /unowned selector: body/u,
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
      mainBlur: 8,
      headerBlur: 18,
      composerBlur: 22,
      borderAlpha: 38,
      radius: 12,
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
      mainBlur: 14,
      headerBlur: 24,
      composerBlur: 28,
      borderAlpha: 30,
      radius: 16,
      artworkBlur: 1,
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
      mainBlur: 6,
      headerBlur: 10,
      composerBlur: 12,
      borderAlpha: 18,
      radius: 8,
      artworkBlur: 6,
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
    assert.deepEqual(lintThemePackage(bundle), []);
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
    ]) {
      assert.ok(css.includes(`${variable}:`), `${recipe} CSS must define ${variable}.`);
    }

    const sidebar = css.match(/aside\.app-shell-left-panel\s*\{([^}]*)\}/s);
    const main = css.match(/main\.main-surface\s*\{([^}]*)\}/s);
    const header = css.match(/header\.app-header-tint\s*\{([^}]*)\}/s);
    const composer = css.match(/\.composer-surface-chrome\s*\{([^}]*)\}/s);
    const selected = css.match(/aside\.app-shell-left-panel\s+:is\(\[aria-current="page"\],\s*\[aria-selected="true"\],\s*\[data-state="active"\]\)\s*\{([^}]*)\}/s);
    const code = css.match(/:is\(pre, code, \[data-language\]\)\s*\{([^}]*)\}/s);
    assert.ok(sidebar, `${recipe} CSS must include the owned sidebar rule.`);
    assert.ok(main, `${recipe} CSS must include the main surface rule.`);
    assert.ok(header, `${recipe} CSS must include the header rule.`);
    assert.ok(composer, `${recipe} CSS must include the composer rule.`);
    assert.ok(selected, `${recipe} CSS must scope selected states to the owned sidebar.`);
    assert.ok(code, `${recipe} CSS must include the code surface rule.`);
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
    assert.match(selected[1], new RegExp(`accent-soft\\) ${expected.selectionAlpha}%`));
    assert.match(selected[1], /accent\) 44%/);
    assert.match(selected[1], /inset 3px 0 0 var\(--codextheme-accent\)/);
    assert.match(selected[1], /border-radius:\s*var\(--codextheme-radius\)/);
    assert.match(code[1], new RegExp(`surface\\) ${expected.codeAlpha}%`));
    assert.match(css, new RegExp(`--codextheme-radius: ${expected.radius}px`));
    assert.equal((css.match(/\[aria-current="page"\]/gu) ?? []).length, 1);
    assert.equal((css.match(/\[aria-selected="true"\]/gu) ?? []).length, 1);
    assert.equal((css.match(/\[data-state="active"\]/gu) ?? []).length, 1);

    const sessionWindow = css.match(/body::before\s*\{([^}]*)\}/s);
    assert.ok(sessionWindow, "Session must retain the fixed window layer.");
    assert.match(sessionWindow[1], /position:\s*fixed;[^}]*inset:\s*-5%;/s);
    assert.match(sessionWindow[1], /var\(--codedrobe-image-session-bg\)/);
    assert.match(sessionWindow[1], new RegExp(`filter: blur\\(${expected.artworkBlur}px\\) saturate\\(${expected.saturation}\\) contrast\\(${expected.imageContrast}\\)`));
    const homeWindow = css.match(/body:has\(\.dream-home\)::before\s*\{([^}]*)\}/s);
    const homeSurface = css.match(/\.dream-home\s*\{([^}]*)\}/s);
    assert.ok(homeWindow, "Home must select its image on the fixed window layer.");
    assert.ok(homeSurface, "Home must retain its route-specific surface rule.");
    assert.match(homeWindow[1], /var\(--codedrobe-image-hero\)/);
    assert.doesNotMatch(homeSurface[1], /var\(--codedrobe-image-hero\)/);

    const baseTheme = bundle.targets.codex.options.baseTheme;
    assert.match(css, new RegExp(`--codextheme-accent: ${baseTheme.accent}`));
    assert.match(css, new RegExp(`--codextheme-ink: ${baseTheme.ink}`));
    assert.match(css, new RegExp(`--codextheme-surface: ${baseTheme.surface}`));
    assert.equal(baseTheme.contrast, Math.min(100, Math.max(60, profile.contrast)));
  }

  assert.equal(new Set(cssByRecipe).size, 3);
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

test("upload request omits filename, palette, and source metadata", () => {
  const body = buildPrivateSkinForm({
    image: new Blob(["x"], { type: "image/webp" }),
    settings: { visibility: 90, unknown: "discard" },
  });
  assert.deepEqual([...body.keys()], ["image", "settings"]);
  assert.deepEqual(JSON.parse(String(body.get("settings"))), normalizePrivateSkinSettings({ visibility: 90 }));
});
