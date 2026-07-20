import {
  normalizePrivateSkinRecipe,
  normalizePrivateSkinSettings,
} from "./private-skin-schema.mjs";

const BASES = Object.freeze({
  cinematic: Object.freeze({
    visibility: 92,
    overlay: 28,
    blur: 0,
    zoom: 108,
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
    iconSurfaceAlpha: 92,
    iconBorderAlpha: 58,
    iconGlowAlpha: 42,
    iconGlyphOnAccent: true,
    saturation: 104,
    imageContrast: 106,
    shadow: "0 22px 58px rgba(0,0,0,.42)",
  }),
  glass: Object.freeze({
    visibility: 90,
    overlay: 30,
    blur: 0,
    zoom: 110,
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
    iconSurfaceAlpha: 24,
    iconBorderAlpha: 44,
    iconGlowAlpha: 24,
    iconGlyphOnAccent: false,
    saturation: 108,
    imageContrast: 102,
    shadow: "0 18px 42px rgba(0,0,0,.30)",
  }),
  focus: Object.freeze({
    visibility: 78,
    overlay: 44,
    blur: 1,
    zoom: 112,
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
    iconSurfaceAlpha: 12,
    iconBorderAlpha: 26,
    iconGlowAlpha: 0,
    iconGlyphOnAccent: false,
    saturation: 92,
    imageContrast: 100,
    shadow: "0 12px 28px rgba(0,0,0,.24)",
  }),
});

const FALLBACK_COLORS = Object.freeze({
  primary: "#64748b",
  secondary: "#8b5cf6",
  highlight: "#c4b5fd",
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function channel(value) {
  return Math.round(clamp(Number(value), 0, 255));
}

function hex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => channel(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function normalizeHex(value, fallback) {
  const match = /^#([0-9a-f]{6})$/iu.exec(typeof value === "string" ? value : "");
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function parseHex(value, fallback) {
  const source = normalizeHex(value, fallback).slice(1);
  return [
    Number.parseInt(source.slice(0, 2), 16),
    Number.parseInt(source.slice(2, 4), 16),
    Number.parseInt(source.slice(4, 6), 16),
  ];
}

function safeMetric(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function safeProfile(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    primary: normalizeHex(source.primary, FALLBACK_COLORS.primary),
    secondary: normalizeHex(source.secondary, FALLBACK_COLORS.secondary),
    highlight: normalizeHex(source.highlight, FALLBACK_COLORS.highlight),
    luminance: safeMetric(source.luminance, 45),
    saturation: safeMetric(source.saturation, 0),
    contrast: safeMetric(source.contrast, 0),
    complexity: safeMetric(source.complexity, 0),
  };
}

function mixRgb(source, target, ratio) {
  return source.map((value, index) => channel(value + (target[index] - value) * ratio));
}

function mixHex(source, target, ratio) {
  return hex(...mixRgb(parseHex(source, "#64748b"), parseHex(target, "#06080d"), ratio));
}

function relativeLuminance(color) {
  const [red, green, blue] = parseHex(color, "#64748b").map((channelValue) => {
    const value = channelValue / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableAccent(accent, surface) {
  if (contrastRatio(accent, surface) >= 4.5) return accent;
  for (let percentage = 1; percentage <= 100; percentage += 1) {
    const candidate = mixHex(accent, "#ffffff", percentage / 100);
    if (contrastRatio(candidate, surface) >= 4.5) return candidate;
  }
  return "#ffffff";
}

function pixelLuminance(red, green, blue) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 * 100;
}

function pixelSaturation(red, green, blue) {
  return (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255 * 100;
}

function hueOf(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  if (range === 0) return 0;
  let hue;
  if (maximum === red) hue = ((green - blue) / range) % 6;
  else if (maximum === green) hue = (blue - red) / range + 2;
  else hue = (red - green) / range + 4;
  return (hue * 60 + 360) % 360;
}

function hueDistance(first, second) {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
}

function fallbackProfile() {
  const profile = {
    ...FALLBACK_COLORS,
    luminance: 0,
    saturation: 0,
    contrast: 0,
    complexity: 0,
  };
  return { ...profile, recommendedRecipe: recommendRecipe(profile) };
}

export function recommendRecipe(profile = {}) {
  if (profile.complexity >= 58 || profile.luminance >= 76 || profile.contrast >= 72) return "focus";
  if (profile.complexity <= 34 && profile.contrast <= 48) return "glass";
  return "cinematic";
}

export function deriveRecipeDefaults(profile, recipe, position = {}) {
  const id = normalizePrivateSkinRecipe(recipe);
  const base = BASES[id];
  const safe = safeProfile(profile);
  const brightnessCorrection = clamp(
    Math.round((safe.luminance - 45) * 0.24),
    0,
    14,
  );
  return normalizePrivateSkinSettings({
    recipe: id,
    visibility: base.visibility,
    overlay: base.overlay + brightnessCorrection,
    blur: base.blur,
    zoom: base.zoom,
    positionX: position.positionX ?? 50,
    positionY: position.positionY ?? 50,
  });
}

export function analyzeImagePixels({ data, width, height, channels } = {}) {
  if (!(data instanceof Uint8Array) && !(data instanceof Uint8ClampedArray)) {
    throw new TypeError("Image data must be a Uint8Array or Uint8ClampedArray byte buffer.");
  }
  if (channels !== 3 && channels !== 4) {
    throw new TypeError("Image channels must be 3 or 4.");
  }
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new TypeError("Image width and height must be positive safe integers.");
  }
  const pixelCount = width * height;
  if (!Number.isSafeInteger(pixelCount) || pixelCount > 4096) {
    throw new TypeError("Image sample must contain at most 4096 pixels.");
  }
  const requiredLength = pixelCount * channels;
  if (data.length < requiredLength) {
    throw new TypeError("Image data is shorter than its dimensions require.");
  }

  const pixels = new Array(pixelCount);
  const hueBuckets = Array.from({ length: 12 }, () => ({
    weight: 0,
    red: 0,
    green: 0,
    blue: 0,
  }));
  let opaqueCount = 0;
  let luminanceSum = 0;
  let luminanceSquareSum = 0;
  let saturationSum = 0;
  let primaryWeight = 0;
  let primaryRed = 0;
  let primaryGreen = 0;
  let primaryBlue = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * channels;
    if (channels === 4 && data[offset + 3] < 128) {
      pixels[index] = null;
      continue;
    }
    const red = channel(data[offset]);
    const green = channel(data[offset + 1]);
    const blue = channel(data[offset + 2]);
    const luminance = pixelLuminance(red, green, blue);
    const saturation = pixelSaturation(red, green, blue);
    const weight = Math.max(8, saturation) / 100;
    pixels[index] = [red, green, blue];
    opaqueCount += 1;
    luminanceSum += luminance;
    luminanceSquareSum += luminance * luminance;
    saturationSum += saturation;
    primaryWeight += weight;
    primaryRed += red * weight;
    primaryGreen += green * weight;
    primaryBlue += blue * weight;

    if (saturation >= 12) {
      const bucket = hueBuckets[Math.floor(hueOf(red, green, blue) / 30) % 12];
      bucket.weight += weight;
      bucket.red += red * weight;
      bucket.green += green * weight;
      bucket.blue += blue * weight;
    }
  }

  if (opaqueCount === 0) return fallbackProfile();

  const primaryRgb = [
    channel(primaryRed / primaryWeight),
    channel(primaryGreen / primaryWeight),
    channel(primaryBlue / primaryWeight),
  ];
  const primaryHue = hueOf(...primaryRgb);
  let selectedBucket = null;
  let selectedScore = -1;
  for (const bucket of hueBuckets) {
    if (bucket.weight === 0) continue;
    const bucketRgb = [
      bucket.red / bucket.weight,
      bucket.green / bucket.weight,
      bucket.blue / bucket.weight,
    ];
    const score = bucket.weight * hueDistance(hueOf(...bucketRgb), primaryHue);
    if (score > selectedScore) {
      selectedBucket = bucket;
      selectedScore = score;
    }
  }
  const secondaryRgb = selectedBucket
    ? [
      channel(selectedBucket.red / selectedBucket.weight),
      channel(selectedBucket.green / selectedBucket.weight),
      channel(selectedBucket.blue / selectedBucket.weight),
    ]
    : mixRgb(primaryRgb, [100, 116, 139], 0.35);
  const highlightSource = pixelSaturation(...secondaryRgb) > pixelSaturation(...primaryRgb)
    ? secondaryRgb
    : primaryRgb;
  const highlightRgb = pixelLuminance(...highlightSource) < 62
    ? mixRgb(highlightSource, [255, 255, 255], 0.38)
    : mixRgb(highlightSource, [24, 24, 24], 0.18);

  let neighborDistance = 0;
  let neighborCount = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const current = pixels[index];
    if (!current) continue;
    const x = index % width;
    const neighbors = [];
    if (x > 0) neighbors.push(pixels[index - 1]);
    if (index >= width) neighbors.push(pixels[index - width]);
    for (const neighbor of neighbors) {
      if (!neighbor) continue;
      neighborDistance += Math.hypot(
        current[0] - neighbor[0],
        current[1] - neighbor[1],
        current[2] - neighbor[2],
      );
      neighborCount += 1;
    }
  }

  const meanLuminance = luminanceSum / opaqueCount;
  const luminanceVariance = Math.max(
    0,
    luminanceSquareSum / opaqueCount - meanLuminance * meanLuminance,
  );
  const profile = {
    primary: hex(...primaryRgb),
    secondary: hex(...secondaryRgb),
    highlight: hex(...highlightRgb),
    luminance: Math.round(clamp(meanLuminance, 0, 100)),
    saturation: Math.round(clamp(saturationSum / opaqueCount, 0, 100)),
    contrast: Math.round(clamp(Math.sqrt(luminanceVariance) * 3.2, 0, 100)),
    complexity: Math.round(clamp(
      neighborCount === 0 ? 0 : neighborDistance / neighborCount / 441.67 * 100,
      0,
      100,
    )),
  };
  return { ...profile, recommendedRecipe: recommendRecipe(profile) };
}

export function deriveSkinTokens(profile = {}, settings = {}) {
  const normalized = normalizePrivateSkinSettings(settings);
  const recipe = normalized.recipe;
  const base = BASES[recipe];
  const safe = safeProfile(profile);
  const surface = mixHex(safe.primary, "#06080d", recipe === "focus" ? 0.90 : 0.84);
  return {
    recipe,
    accent: readableAccent(safe.highlight, surface),
    accentSoft: safe.secondary,
    surface,
    surfaceRaised: mixHex(safe.secondary, "#0b0d12", recipe === "glass" ? 0.78 : 0.86),
    ink: "#f4f1eb",
    mutedInk: "#b9bbc1",
    visibility: normalized.visibility,
    overlay: normalized.overlay,
    blur: normalized.blur,
    zoom: normalized.zoom,
    positionX: normalized.positionX,
    positionY: normalized.positionY,
    sidebarAlpha: base.sidebarAlpha,
    mainAlpha: base.mainAlpha,
    headerAlpha: base.headerAlpha,
    composerAlpha: base.composerAlpha,
    codeAlpha: base.codeAlpha,
    selectionAlpha: base.selectionAlpha,
    sidebarBlur: base.sidebarBlur,
    mainBlur: base.mainBlur,
    headerBlur: base.headerBlur,
    composerBlur: base.composerBlur,
    borderAlpha: base.borderAlpha,
    radius: base.radius,
    iconSurfaceAlpha: base.iconSurfaceAlpha,
    iconBorderAlpha: base.iconBorderAlpha,
    iconGlowAlpha: base.iconGlowAlpha,
    iconGlyphOnAccent: base.iconGlyphOnAccent,
    saturation: base.saturation,
    imageContrast: base.imageContrast,
    shadow: base.shadow,
  };
}

export function derivePaletteFromProfile(profile = {}) {
  const safe = safeProfile(profile);
  const primary = parseHex(safe.primary, FALLBACK_COLORS.primary);
  const luminance = 0.2126 * primary[0] + 0.7152 * primary[1] + 0.0722 * primary[2];
  const accent = luminance < 95
    ? mixRgb(primary, [255, 255, 255], 0.42)
    : mixRgb(primary, [24, 24, 24], 0.18);
  return {
    accent: hex(...accent),
    surface: hex(...mixRgb(primary, [6, 6, 6], 0.84)),
    ink: "#f4f1eb",
    contrast: 74,
  };
}
