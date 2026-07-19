import {
  analyzeImagePixels,
  derivePaletteFromProfile,
} from "./private-skin-profile.mjs";

function channel(value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(Math.min(255, Math.max(0, number)));
}

export function derivePalette({ red, green, blue } = {}) {
  const profile = analyzeImagePixels({
    data: new Uint8Array([channel(red), channel(green), channel(blue)]),
    width: 1,
    height: 1,
    channels: 3,
  });
  return derivePaletteFromProfile(profile);
}
