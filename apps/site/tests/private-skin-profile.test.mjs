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
    { recipe: "cinematic", visibility: 84, overlay: 38, blur: 0, zoom: 108, positionX: 35, positionY: 65 },
    { recipe: "glass", visibility: 76, overlay: 44, blur: 1, zoom: 110, positionX: 35, positionY: 65 },
    { recipe: "focus", visibility: 48, overlay: 60, blur: 6, zoom: 112, positionX: 35, positionY: 65 },
  ]);
  assert.deepEqual(tokens.map((value) => value.recipe), ["cinematic", "glass", "focus"]);
  for (const key of ["sidebarAlpha", "mainAlpha", "composerAlpha", "selectionAlpha"]) {
    assert.equal(new Set(tokens.map((value) => value[key])).size, 3);
  }
  assert.equal(tokens[2].positionX, 35);
  assert.equal(tokens[2].positionY, 65);
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
    panelBlur: 26,
    composerBlur: 28,
    borderAlpha: 30,
    radius: 16,
    saturation: 108,
    imageContrast: 102,
    shadow: "0 18px 42px rgba(0,0,0,.30)",
  });
  assert.deepEqual(derivePaletteFromProfile(profile), {
    accent: "#f0b0d0",
    surface: "#1a0e1a",
    ink: "#f4f1eb",
    contrast: 60,
  });
  for (const contrast of [Number.NaN, Infinity, -Infinity]) {
    assert.equal(derivePaletteFromProfile({ ...profile, contrast }).contrast, 74);
  }
});
