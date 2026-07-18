import { derivePalette } from "./private-skin-palette.mjs";
import {
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MAX_PROCESSED_IMAGE_BYTES,
  MAX_SOURCE_IMAGE_BYTES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  normalizePrivateSkinSettings,
} from "./private-skin-schema.mjs";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateSourceFile(file) {
  if (!file || !ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_SOURCE_IMAGE_BYTES) {
    return { ok: false, error: "Choose an image smaller than 10 MB." };
  }
  return { ok: true };
}

export function buildPrivateSkinForm({ image, settings }) {
  const form = new FormData();
  form.append("image", image, "custom-skin.webp");
  form.append("settings", JSON.stringify(normalizePrivateSkinSettings(settings)));
  return form;
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function sampledColor(canvas) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  context.drawImage(canvas, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const maximum = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]);
    const minimum = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
    const saturationWeight = Math.max(1, maximum - minimum);
    red += pixels[index] * saturationWeight;
    green += pixels[index + 1] * saturationWeight;
    blue += pixels[index + 2] * saturationWeight;
    weight += saturationWeight;
  }
  return weight
    ? { red: red / weight, green: green / weight, blue: blue / weight }
    : { red: 120, green: 100, blue: 180 };
}

export async function processBrowserImage(file) {
  const validation = validateSourceFile(file);
  if (!validation.ok) throw new Error(validation.error);

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be opened. Try exporting it as JPEG or PNG.");
  }
  try {
    if (bitmap.width < MIN_IMAGE_WIDTH || bitmap.height < MIN_IMAGE_HEIGHT) {
      throw new Error("Choose an image at least 800 × 500 pixels.");
    }
    const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width, MAX_IMAGE_HEIGHT / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#07080d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob = null;
    for (const quality of [0.86, 0.76, 0.66, 0.56]) {
      blob = await canvasBlob(canvas, quality);
      if (blob && blob.size <= MAX_PROCESSED_IMAGE_BYTES) break;
    }
    if (!blob || blob.size > MAX_PROCESSED_IMAGE_BYTES) {
      throw new Error("This image stays too large after processing. Try a simpler or smaller image.");
    }
    return {
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      palette: derivePalette(sampledColor(canvas)),
    };
  } finally {
    bitmap.close();
  }
}
