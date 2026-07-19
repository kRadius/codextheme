function channel(value) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(Math.min(255, Math.max(0, number)));
}

function hex(red, green, blue) {
  return `#${[red, green, blue].map((value) => channel(value).toString(16).padStart(2, "0")).join("")}`;
}

function mix(value, target, ratio) {
  return channel(value + (target - value) * ratio);
}

export function derivePalette({ red, green, blue } = {}) {
  const source = [channel(red), channel(green), channel(blue)];
  const luminance = source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722;
  const accent = luminance < 95
    ? source.map((value) => mix(value, 255, 0.42))
    : source.map((value) => mix(value, 24, 0.18));
  const surface = source.map((value) => mix(value, 6, 0.84));
  return {
    accent: hex(...accent),
    surface: hex(...surface),
    ink: "#f4f1eb",
    contrast: 74,
  };
}
