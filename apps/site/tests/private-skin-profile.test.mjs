import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeImagePixels,
  derivePaletteFromProfile,
  deriveRecipeDefaults,
  deriveSkinTokens,
  recommendRecipe,
} from "../app/lib/private-skin-profile.mjs";

function solid(red, green, blue, width = 4, height = 4) {
  const data = new Uint8Array(width * height * 3);
  for (let index = 0; index < data.length; index += 3) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }
  return { data, width, height, channels: 3 };
}

function relativeLuminance(color) {
  const channels = color.slice(1).match(/../gu).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function hsl(color) {
  const [red, green, blue] = color
    .slice(1)
    .match(/../gu)
    .map((value) => Number.parseInt(value, 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  if (range > 0) {
    if (maximum === red) hue = ((green - blue) / range) % 6;
    else if (maximum === green) hue = (blue - red) / range + 2;
    else hue = (red - green) / range + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = range === 0
    ? 0
    : range / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

function hueDistance(first, second) {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
}

test("pixel analysis is deterministic and bounded", () => {
  const first = analyzeImagePixels(solid(180, 52, 76));
  const second = analyzeImagePixels(solid(180, 52, 76));
  assert.deepEqual(first, second);
  assert.match(first.primary, /^#[0-9a-f]{6}$/);
  assert.match(first.secondary, /^#[0-9a-f]{6}$/);
  assert.match(first.highlight, /^#[0-9a-f]{6}$/);
  for (const key of ["luminance", "saturation", "contrast", "complexity"]) {
    assert.ok(first[key] >= 0 && first[key] <= 100);
  }
});

test("pixel analysis locks the weighted color and neighborhood formulas", () => {
  assert.deepEqual(analyzeImagePixels({
    data: new Uint8Array([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 0,
    ]),
    width: 2,
    height: 2,
    channels: 4,
  }), {
    primary: "#555555",
    secondary: "#00ff00",
    highlight: "#04d504",
    luminance: 33,
    saturation: 100,
    contrast: 88,
    complexity: 82,
    recommendedRecipe: "focus",
  });
  assert.deepEqual(analyzeImagePixels({
    data: new Uint8Array([255, 0, 0, 100, 100, 100]),
    width: 2,
    height: 1,
    channels: 3,
  }), {
    primary: "#f40707",
    secondary: "#ff0000",
    highlight: "#ff6161",
    luminance: 30,
    saturation: 50,
    contrast: 29,
    complexity: 48,
    recommendedRecipe: "cinematic",
  });
});

test("pixel analysis covers neutral fallback and both highlight branches", () => {
  assert.deepEqual(analyzeImagePixels(solid(120, 120, 120, 1, 1)), {
    primary: "#787878",
    secondary: "#71777f",
    highlight: "#a7abb0",
    luminance: 47,
    saturation: 0,
    contrast: 0,
    complexity: 0,
    recommendedRecipe: "glass",
  });
  assert.deepEqual(analyzeImagePixels(solid(240, 180, 60, 1, 1)), {
    primary: "#f0b43c",
    secondary: "#f0b43c",
    highlight: "#c99836",
    luminance: 72,
    saturation: 71,
    contrast: 0,
    complexity: 0,
    recommendedRecipe: "glass",
  });
});

test("pixel analysis validates shape and ignores transparent pixels", () => {
  assert.throws(
    () => analyzeImagePixels({ data: new Uint8Array(3), width: 1, height: 1, channels: 2 }),
    /channels/i,
  );
  assert.throws(
    () => analyzeImagePixels({ data: new Uint8Array(2), width: 1, height: 1, channels: 3 }),
    /data/i,
  );
  assert.deepEqual(analyzeImagePixels({
    data: new Uint8Array([255, 0, 0, 127]),
    width: 1,
    height: 1,
    channels: 4,
  }), {
    primary: "#64748b",
    secondary: "#8b5cf6",
    highlight: "#c4b5fd",
    luminance: 0,
    saturation: 0,
    contrast: 0,
    complexity: 0,
    recommendedRecipe: "glass",
  });
});

test("pixel analysis accepts only bounded byte samples", () => {
  for (const data of [
    [10, 20, 30],
    new Float32Array([Number.NaN, 20, 30]),
    new Float32Array([Infinity, 20, 30]),
  ]) {
    assert.throws(
      () => analyzeImagePixels({ data, width: 1, height: 1, channels: 3 }),
      { name: "TypeError", message: /Uint8Array|byte buffer/i },
    );
  }

  for (const [width, height] of [
    [0, 1],
    [-1, 1],
    [Number.MAX_SAFE_INTEGER + 1, 1],
  ]) {
    assert.throws(
      () => analyzeImagePixels({ data: new Uint8Array(3), width, height, channels: 3 }),
      { name: "TypeError", message: /positive safe integers/i },
    );
  }
  assert.throws(
    () => analyzeImagePixels({
      data: new Uint8Array(65 * 64 * 3),
      width: 65,
      height: 64,
      channels: 3,
    }),
    { name: "TypeError", message: /4096/i },
  );

  assert.doesNotThrow(() => analyzeImagePixels({
    data: new Uint8ClampedArray([10, 20, 30]),
    width: 1,
    height: 1,
    channels: 3,
  }));
  assert.doesNotThrow(() => analyzeImagePixels({
    data: Buffer.from([10, 20, 30]),
    width: 1,
    height: 1,
    channels: 3,
  }));
  assert.doesNotThrow(() => analyzeImagePixels({
    data: new Uint8Array(64 * 64 * 3),
    width: 64,
    height: 64,
    channels: 3,
  }));
});

test("recommendation follows the three closed thresholds", () => {
  assert.equal(recommendRecipe({ complexity: 58, luminance: 40, contrast: 40 }), "focus");
  assert.equal(recommendRecipe({ complexity: 40, luminance: 76, contrast: 40 }), "focus");
  assert.equal(recommendRecipe({ complexity: 40, luminance: 40, contrast: 72 }), "focus");
  assert.equal(recommendRecipe({ complexity: 34, luminance: 40, contrast: 48 }), "glass");
  assert.equal(recommendRecipe({ complexity: 35, luminance: 40, contrast: 48 }), "cinematic");
  assert.equal(recommendRecipe({ complexity: 34, luminance: 40, contrast: 49 }), "cinematic");
});

test("recipes produce distinct complete surface systems", () => {
  const profile = analyzeImagePixels(solid(180, 52, 76));
  const settings = ["cinematic", "glass", "focus"].map((recipe) => (
    deriveRecipeDefaults(profile, recipe, { positionX: 35, positionY: 65 })
  ));
  const tokens = settings.map((value) => deriveSkinTokens(profile, value));

  assert.deepEqual(settings.map(({ recipe, visibility, overlay, blur, zoom, positionX, positionY }) => ({
    recipe,
    visibility,
    overlay,
    blur,
    zoom,
    positionX,
    positionY,
  })), [
    { recipe: "cinematic", visibility: 92, overlay: 28, blur: 0, zoom: 108, positionX: 35, positionY: 65 },
    { recipe: "glass", visibility: 90, overlay: 30, blur: 0, zoom: 110, positionX: 35, positionY: 65 },
    { recipe: "focus", visibility: 78, overlay: 44, blur: 1, zoom: 112, positionX: 35, positionY: 65 },
  ]);
  assert.deepEqual(tokens.map((value) => value.recipe), ["cinematic", "glass", "focus"]);
  for (const key of ["sidebarAlpha", "mainAlpha", "composerAlpha", "selectionAlpha"]) {
    assert.equal(new Set(tokens.map((value) => value[key])).size, 3);
  }
  assert.deepEqual(tokens.map(({
    sidebarBlur,
    mainBlur,
    headerBlur,
    composerBlur,
  }) => ({ sidebarBlur, mainBlur, headerBlur, composerBlur })), [
    { sidebarBlur: 20, mainBlur: 0, headerBlur: 18, composerBlur: 22 },
    { sidebarBlur: 26, mainBlur: 0, headerBlur: 24, composerBlur: 28 },
    { sidebarBlur: 10, mainBlur: 0, headerBlur: 10, composerBlur: 12 },
  ]);
  assert.equal(tokens[2].positionX, 35);
  assert.equal(tokens[2].positionY, 65);
  assert.deepEqual(tokens.map((value) => ({
    recipe: value.recipe,
    iconHoverSurfaceAlpha: value.iconHoverSurfaceAlpha,
    iconHoverBorderAlpha: value.iconHoverBorderAlpha,
    iconHoverGlowAlpha: value.iconHoverGlowAlpha,
  })), [
    { recipe: "cinematic", iconHoverSurfaceAlpha: 30, iconHoverBorderAlpha: 52, iconHoverGlowAlpha: 28 },
    { recipe: "glass", iconHoverSurfaceAlpha: 20, iconHoverBorderAlpha: 40, iconHoverGlowAlpha: 18 },
    { recipe: "focus", iconHoverSurfaceAlpha: 10, iconHoverBorderAlpha: 28, iconHoverGlowAlpha: 0 },
  ]);
  for (const token of tokens) {
    for (const field of ["iconSurfaceAlpha", "iconBorderAlpha", "iconGlowAlpha", "iconGlyphOnAccent"]) {
      assert.equal(field in token, false);
    }
  }
});

test("recipe defaults treat non-finite luminance as neutral", () => {
  for (const luminance of [Number.NaN, Infinity, -Infinity]) {
    assert.deepEqual(deriveRecipeDefaults({ luminance }, "glass"), {
      recipe: "glass",
      visibility: 90,
      overlay: 30,
      blur: 0,
      zoom: 110,
      positionX: 50,
      positionY: 50,
    });
  }
  assert.equal(deriveRecipeDefaults({ luminance: 120 }, "glass").overlay, 44);
});

test("skin tokens and compatibility palettes normalize invalid profiles", () => {
  const defaults = deriveSkinTokens({}, {});
  assert.deepEqual({
    accent: defaults.accent,
    accentSoft: defaults.accentSoft,
    surface: defaults.surface,
    surfaceRaised: defaults.surfaceRaised,
  }, {
    accent: "#c4b5fd",
    accentSoft: "#8b5cf6",
    surface: "#151921",
    surfaceRaised: "#1d1832",
  });

  const invalid = deriveSkinTokens({
    primary: "#bad",
    secondary: "not-a-color",
    highlight: undefined,
  }, { recipe: "glass" });
  assert.deepEqual({
    accent: invalid.accent,
    accentSoft: invalid.accentSoft,
    surface: invalid.surface,
    surfaceRaised: invalid.surfaceRaised,
  }, {
    accent: "#c4b5fd",
    accentSoft: "#8b5cf6",
    surface: "#151921",
    surfaceRaised: "#271e44",
  });
  for (const key of ["accent", "accentSoft", "surface", "surfaceRaised"]) {
    assert.match(defaults[key], /^#[0-9a-f]{6}$/);
    assert.match(invalid[key], /^#[0-9a-f]{6}$/);
  }

  assert.deepEqual(derivePaletteFromProfile({
    primary: "#bad",
    secondary: null,
    highlight: "url(https://example.com)",
    contrast: Number.NaN,
  }), {
    accent: "#566376",
    surface: "#15181b",
    ink: "#f4f1eb",
    contrast: 74,
  });
});

test("skin accents meet text contrast without changing an already vivid readable highlight", () => {
  const lowContrast = deriveSkinTokens({
    primary: "#ffffff",
    secondary: "#616175",
    highlight: "#616175",
  }, { recipe: "cinematic" });
  assert.equal(lowContrast.surface, "#2e3034");
  assert.ok(
    contrastRatio(lowContrast.accent, lowContrast.surface) >= 4.5,
    `${lowContrast.accent} must contrast with ${lowContrast.surface}`,
  );
  assert.match(lowContrast.accent, /^#[0-9a-f]{6}$/u);

  const readable = deriveSkinTokens({
    primary: "#ffffff",
    secondary: "#8b5cf6",
    highlight: "#f0b0d0",
  }, { recipe: "cinematic" });
  assert.ok(hsl("#f0b0d0").saturation >= 41.5);
  assert.ok(contrastRatio("#f0b0d0", readable.surface) >= 4.5);
  assert.equal(readable.accent, "#f0b0d0");
});

test("low-chroma highlights become vivid, hue-preserving interaction accents", () => {
  const profile = {
    primary: "#3e372f",
    secondary: "#8d6a45",
    highlight: "#948475",
    luminance: 38,
    saturation: 12,
    contrast: 24,
    complexity: 18,
  };
  const tokens = deriveSkinTokens(profile, { recipe: "cinematic" });
  const accentHsl = hsl(tokens.accent);

  assert.ok(accentHsl.saturation >= 41.5);
  assert.ok(hueDistance(accentHsl.hue, hsl(profile.highlight).hue) <= 2);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("warm low-chroma photographs use a cool complementary interaction accent", () => {
  const profile = analyzeImagePixels(solid(148, 137, 121, 32, 32));
  const tokens = deriveSkinTokens(profile, { recipe: profile.recommendedRecipe });
  const accentHsl = hsl(tokens.accent);
  const primaryHsl = hsl(profile.primary);
  const complementaryHue = (primaryHsl.hue + 180) % 360;

  assert.ok(
    hueDistance(accentHsl.hue, complementaryHue) <= 2,
    `${tokens.accent} should complement ${profile.primary} instead of amplifying it into gold`,
  );
  assert.ok(accentHsl.saturation >= 41.5);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("vivid readable highlights remain unchanged interaction accents", () => {
  const tokens = deriveSkinTokens({
    primary: "#08253b",
    secondary: "#0a8fb4",
    highlight: "#27c7ee",
    luminance: 35,
    saturation: 78,
    contrast: 52,
    complexity: 24,
  }, { recipe: "glass" });

  assert.equal(tokens.accent, "#27c7ee");
});

test("achromatic highlights borrow a vivid interaction hue from the secondary", () => {
  const profile = {
    primary: "#303030",
    secondary: "#7350a8",
    highlight: "#9a9a9a",
    luminance: 35,
    saturation: 3,
    contrast: 20,
    complexity: 10,
  };
  const tokens = deriveSkinTokens(profile, { recipe: "focus" });
  const accentHsl = hsl(tokens.accent);

  assert.ok(hueDistance(accentHsl.hue, hsl(profile.secondary).hue) <= 2);
  assert.ok(accentHsl.saturation >= 41.5);
});

test("black achromatic highlights retain the borrowed secondary hue", () => {
  const profile = {
    primary: "#303030",
    secondary: "#7350a8",
    highlight: "#000000",
  };
  const tokens = deriveSkinTokens(profile, { recipe: "focus" });
  const accentHsl = hsl(tokens.accent);

  assert.ok(hueDistance(accentHsl.hue, hsl(profile.secondary).hue) <= 2);
  assert.ok(accentHsl.saturation >= 41.5);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("white achromatic highlights retain the borrowed secondary hue", () => {
  const profile = {
    primary: "#303030",
    secondary: "#7350a8",
    highlight: "#ffffff",
  };
  const tokens = deriveSkinTokens(profile, { recipe: "focus" });
  const accentHsl = hsl(tokens.accent);

  assert.ok(hueDistance(accentHsl.hue, hsl(profile.secondary).hue) <= 2);
  assert.ok(accentHsl.saturation >= 41.5);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("analyzed low-chroma colors keep a quantized vivid interaction accent", () => {
  const profile = analyzeImagePixels(solid(167, 150, 207));
  const tokens = deriveSkinTokens(profile, { recipe: profile.recommendedRecipe });
  const accentHsl = hsl(tokens.accent);

  assert.ok(hueDistance(accentHsl.hue, hsl(profile.highlight).hue) <= 2);
  assert.ok(accentHsl.saturation >= 41.5);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("fully neutral profiles receive a vivid readable interaction accent", () => {
  const tokens = deriveSkinTokens({
    primary: "#303030",
    secondary: "#777777",
    highlight: "#9a9a9a",
  }, { recipe: "focus" });

  assert.ok(hsl(tokens.accent).saturation >= 41.5);
  assert.ok(contrastRatio(tokens.accent, tokens.surface) >= 4.5);
});

test("skin tokens expose only the closed semantic contract", () => {
  const profile = {
    primary: "#803060",
    secondary: "#4080c0",
    highlight: "#f0b0d0",
    contrast: 32,
  };
  const tokens = deriveSkinTokens(profile, {
    recipe: "glass",
    visibility: 76,
    overlay: 44,
    blur: 1,
    zoom: 110,
    positionX: 30,
    positionY: 70,
    arbitraryCss: "display:none",
  });

  assert.deepEqual(tokens, {
    recipe: "glass",
    accent: "#f0b0d0",
    accentSoft: "#4080c0",
    surface: "#1a0e1a",
    surfaceRaised: "#172638",
    ink: "#f4f1eb",
    mutedInk: "#b9bbc1",
    visibility: 76,
    overlay: 44,
    blur: 1,
    zoom: 110,
    positionX: 30,
    positionY: 70,
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
    saturation: 108,
    imageContrast: 102,
    shadow: "0 18px 42px rgba(0,0,0,.30)",
  });
  assert.deepEqual(derivePaletteFromProfile(profile), {
    accent: "#b587a3",
    surface: "#1a0d14",
    ink: "#f4f1eb",
    contrast: 74,
  });
  for (const contrast of [Number.NaN, Infinity, -Infinity]) {
    assert.equal(derivePaletteFromProfile({ ...profile, contrast }).contrast, 74);
  }
});
