export const MAX_SOURCE_IMAGE_BYTES = 10_000_000;
export const MAX_PROCESSED_IMAGE_BYTES = 1_200_000;
export const MAX_PRIVATE_PACKAGE_BYTES = 3_800_000;
export const MIN_IMAGE_WIDTH = 800;
export const MIN_IMAGE_HEIGHT = 500;
export const MAX_IMAGE_WIDTH = 1920;
export const MAX_IMAGE_HEIGHT = 1200;
export const PRIVATE_SKIN_TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_PRIVATE_SKIN_SETTINGS = Object.freeze({
  visibility: 72,
  overlay: 42,
  blur: 2,
  zoom: 110,
  positionX: 50,
  positionY: 50,
});

const ID_PATTERN = /^([a-z0-9]+)\.([A-Za-z0-9_-]{32})$/;

function finiteOr(value, fallback) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum, fallback) {
  return Math.round(Math.min(maximum, Math.max(minimum, finiteOr(value, fallback))));
}

export function normalizePrivateSkinSettings(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    visibility: clamp(source.visibility, 20, 100, DEFAULT_PRIVATE_SKIN_SETTINGS.visibility),
    overlay: clamp(source.overlay, 0, 80, DEFAULT_PRIVATE_SKIN_SETTINGS.overlay),
    blur: clamp(source.blur, 0, 16, DEFAULT_PRIVATE_SKIN_SETTINGS.blur),
    zoom: clamp(source.zoom, 100, 160, DEFAULT_PRIVATE_SKIN_SETTINGS.zoom),
    positionX: clamp(source.positionX, 0, 100, DEFAULT_PRIVATE_SKIN_SETTINGS.positionX),
    positionY: clamp(source.positionY, 0, 100, DEFAULT_PRIVATE_SKIN_SETTINGS.positionY),
  };
}

function randomBytesDefault(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function base64Url(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64url");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function invalidId() {
  return Object.assign(new Error("Invalid private skin id."), { code: "E_INVALID_ID" });
}

export function createPrivateSkinId({ now = new Date(), randomBytes = randomBytesDefault } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw invalidId();
  const entropy = randomBytes(24);
  if (!(entropy instanceof Uint8Array) || entropy.byteLength !== 24) throw invalidId();
  const expiry = (now.getTime() + PRIVATE_SKIN_TTL_MS).toString(36);
  return `${expiry}.${base64Url(entropy)}`;
}

export function parsePrivateSkinId(id) {
  if (typeof id !== "string") throw invalidId();
  const match = ID_PATTERN.exec(id);
  if (!match) throw invalidId();
  const expiry = Number.parseInt(match[1], 36);
  if (!Number.isSafeInteger(expiry) || expiry <= 0) throw invalidId();
  const expiresAt = new Date(expiry);
  if (Number.isNaN(expiresAt.getTime())) throw invalidId();
  return { id, expiresAt };
}

export function privateSkinPathname(id) {
  parsePrivateSkinId(id);
  return `private-skins/${id}.codextheme-theme`;
}
