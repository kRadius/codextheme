import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";
import { del, get, list, put } from "@vercel/blob";
import sharp from "sharp";
import { buildPrivateSkinPackage } from "./private-skin-package.mjs";
import { analyzeImagePixels } from "./private-skin-profile.mjs";
import {
  MAX_PRIVATE_PACKAGE_BYTES,
  MAX_SOURCE_IMAGE_BYTES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  createPrivateSkinId,
  normalizePrivateSkinSettings,
  parsePrivateSkinId,
  privateSkinPathname,
} from "./private-skin-schema.mjs";

const MAX_NORMALIZED_IMAGE_BYTES = 900_000;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const GET_TYPED_ARRAY_BUFFER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const GET_TYPED_ARRAY_BYTE_LENGTH = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const GET_TYPED_ARRAY_BYTE_OFFSET = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset").get;
const GET_ARRAY_BUFFER_BYTE_LENGTH = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
const GET_SHARED_ARRAY_BUFFER_BYTE_LENGTH = Object.getOwnPropertyDescriptor(
  SharedArrayBuffer.prototype,
  "byteLength",
).get;

function serviceError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function streamText(stream) {
  return new Response(stream).text();
}

function snapshotPixelSample(sample) {
  const data = sample?.data;
  if (!ArrayBuffer.isView(data)) return null;
  const isUint8Array = utilTypes.isUint8Array(data);
  const isUint8ClampedArray = utilTypes.isUint8ClampedArray(data);
  if (!isUint8Array && !isUint8ClampedArray) return null;
  const expectedDataTag = isUint8Array ? "[object Uint8Array]" : "[object Uint8ClampedArray]";
  if (Object.prototype.toString.call(data) !== expectedDataTag) return null;
  const byteLength = GET_TYPED_ARRAY_BYTE_LENGTH.call(data);
  if (byteLength > 4096) return null;
  const backing = GET_TYPED_ARRAY_BUFFER.call(data);
  const isArrayBuffer = utilTypes.isArrayBuffer(backing);
  const isSharedArrayBuffer = utilTypes.isSharedArrayBuffer(backing);
  if (!isArrayBuffer && !isSharedArrayBuffer) return null;
  const expectedBackingTag = isArrayBuffer ? "[object ArrayBuffer]" : "[object SharedArrayBuffer]";
  if (Object.prototype.toString.call(backing) !== expectedBackingTag) return null;
  const backingByteLength = isArrayBuffer
    ? GET_ARRAY_BUFFER_BYTE_LENGTH.call(backing)
    : GET_SHARED_ARRAY_BUFFER_BYTE_LENGTH.call(backing);
  if (backingByteLength > 4096) return null;
  if (sample.channels !== 3 && sample.channels !== 4) return null;
  if (!Number.isSafeInteger(sample.width) || sample.width <= 0) return null;
  if (!Number.isSafeInteger(sample.height) || sample.height <= 0) return null;
  const pixelCount = sample.width * sample.height;
  if (!Number.isSafeInteger(pixelCount) || pixelCount > 4096) return null;
  const requiredLength = pixelCount * sample.channels;
  if (!Number.isSafeInteger(requiredLength) || byteLength < requiredLength) return null;
  const byteOffset = GET_TYPED_ARRAY_BYTE_OFFSET.call(data);
  const snapshot = new Uint8Array(byteLength);
  snapshot.set(new Uint8Array(backing, byteOffset, byteLength));
  return {
    data: snapshot,
    width: sample.width,
    height: sample.height,
    channels: sample.channels,
  };
}

export const vercelPrivateBlob = {
  async put(pathname, body) {
    return put(pathname, body, {
      access: "private",
      contentType: "application/vnd.codextheme.theme+json",
      cacheControlMaxAge: 60,
    });
  },
  async get(pathname) {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return { body: await streamText(result.stream) };
  },
  async list(options) {
    return list(options);
  },
  async del(urls) {
    return del(urls);
  },
};

export async function normalizeUploadedImage(source) {
  if (!(source instanceof Uint8Array) || source.byteLength === 0) {
    throw serviceError("E_INVALID_UPLOAD", "The image is missing.");
  }
  if (source.byteLength > MAX_SOURCE_IMAGE_BYTES) {
    throw serviceError("E_UPLOAD_TOO_LARGE", "The source image exceeds 10 MB.");
  }

  let metadata;
  try {
    metadata = await sharp(source, { animated: false, failOn: "warning" }).metadata();
  } catch {
    throw serviceError("E_INVALID_UPLOAD", "The image could not be decoded.");
  }
  if (!new Set(["jpeg", "png", "webp"]).has(metadata.format)) {
    throw serviceError("E_INVALID_UPLOAD", "Only JPEG, PNG, and WebP images are accepted.");
  }
  const swapsDimensions = new Set([5, 6, 7, 8]).has(metadata.orientation);
  const orientedWidth = metadata.autoOrient?.width
    ?? (swapsDimensions ? metadata.height : metadata.width);
  const orientedHeight = metadata.autoOrient?.height
    ?? (swapsDimensions ? metadata.width : metadata.height);
  if (!orientedWidth || !orientedHeight || orientedWidth < MIN_IMAGE_WIDTH || orientedHeight < MIN_IMAGE_HEIGHT) {
    throw serviceError("E_IMAGE_TOO_SMALL", "The image must be at least 800 by 500 pixels.");
  }

  const { data: sampledData, info: sampledInfo } = await sharp(source, { animated: false })
    .rotate()
    .resize({ width: 32, height: 32, fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sample = {
    data: new Uint8Array(sampledData),
    width: sampledInfo.width,
    height: sampledInfo.height,
    channels: sampledInfo.channels,
  };

  for (const width of [1920, 1600, 1280]) {
    for (const quality of [82, 72, 62, 52]) {
      const { data, info } = await sharp(source, { animated: false })
        .rotate()
        .resize({ width, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      if (data.byteLength <= MAX_NORMALIZED_IMAGE_BYTES) {
        return {
          buffer: data,
          width: info.width,
          height: info.height,
          sample,
        };
      }
    }
  }
  throw serviceError("E_UPLOAD_TOO_LARGE", "The processed image could not fit the private theme limit.");
}

export function createPrivateSkinService({
  blob = vercelPrivateBlob,
  imageProcessor = normalizeUploadedImage,
  randomBytes,
} = {}) {
  return {
    async create({ image, settings, now = new Date() }) {
      const processed = await imageProcessor(image);
      if (!(processed?.buffer instanceof Uint8Array) || processed.buffer.byteLength > MAX_NORMALIZED_IMAGE_BYTES) {
        throw serviceError("E_INVALID_UPLOAD", "The processed image is invalid.");
      }
      const sample = snapshotPixelSample(processed.sample);
      if (!sample) {
        throw serviceError("E_INVALID_UPLOAD", "The processed image sample is invalid.");
      }
      const id = createPrivateSkinId({ now, randomBytes });
      const { expiresAt } = parsePrivateSkinId(id);
      const normalized = normalizePrivateSkinSettings(settings);
      const profile = analyzeImagePixels(sample);
      const serialized = buildPrivateSkinPackage({
        id,
        exportedAt: now.toISOString(),
        image: processed.buffer,
        settings: normalized,
        profile,
      });
      try {
        await blob.put(privateSkinPathname(id), serialized);
      } catch {
        throw serviceError("E_STORAGE", "Private storage is temporarily unavailable.");
      }
      return {
        id,
        expiresAt: expiresAt.toISOString(),
        command: `npx --yes @codextheme/cli@0.2.6 apply-private ${id}`,
      };
    },

    async retrieve(id, now = new Date()) {
      const parsed = parsePrivateSkinId(id);
      if (now.getTime() >= parsed.expiresAt.getTime()) {
        throw serviceError("E_EXPIRED", "This private skin link has expired.");
      }
      let stored;
      try {
        stored = await blob.get(privateSkinPathname(id));
      } catch {
        throw serviceError("E_STORAGE", "Private storage is temporarily unavailable.");
      }
      if (!stored) throw serviceError("E_NOT_FOUND", "Private skin not found.");
      const serialized = String(stored.body ?? "");
      if (!serialized || Buffer.byteLength(serialized) > MAX_PRIVATE_PACKAGE_BYTES) {
        throw serviceError("E_INVALID_PACKAGE", "Private skin package is invalid.");
      }
      return {
        serialized,
        sha256: createHash("sha256").update(serialized).digest("hex"),
      };
    },

    async cleanup(now = new Date()) {
      let cursor;
      let scanned = 0;
      let deleted = 0;
      do {
        const page = await blob.list({ prefix: "private-skins/", limit: 1000, cursor });
        const expired = [];
        for (const item of page.blobs ?? []) {
          if (!item.pathname?.startsWith("private-skins/") || !item.pathname.endsWith(".codextheme-theme")) continue;
          const id = item.pathname.slice("private-skins/".length, -".codextheme-theme".length);
          let parsed;
          try {
            parsed = parsePrivateSkinId(id);
          } catch {
            continue;
          }
          scanned += 1;
          if (now.getTime() >= parsed.expiresAt.getTime()) expired.push(item.url ?? item.pathname);
        }
        if (expired.length) {
          await blob.del(expired);
          deleted += expired.length;
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return { scanned, deleted };
    },
  };
}

export const privateSkinService = createPrivateSkinService();
