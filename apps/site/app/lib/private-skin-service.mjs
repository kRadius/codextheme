import { createHash } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import sharp from "sharp";
import { buildPrivateSkinPackage } from "./private-skin-package.mjs";
import { derivePalette } from "./private-skin-palette.mjs";
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

function serviceError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function streamText(stream) {
  return new Response(stream).text();
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
  if (!metadata.width || !metadata.height || metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
    throw serviceError("E_IMAGE_TOO_SMALL", "The image must be at least 800 by 500 pixels.");
  }

  const dominantStats = await sharp(source, { animated: false }).rotate().resize({
    width: 48,
    height: 48,
    fit: "cover",
  }).stats();

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
          dominant: dominantStats.dominant,
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
      const id = createPrivateSkinId({ now, randomBytes });
      const { expiresAt } = parsePrivateSkinId(id);
      const normalized = normalizePrivateSkinSettings(settings);
      const palette = derivePalette(processed.dominant);
      const serialized = buildPrivateSkinPackage({
        id,
        exportedAt: now.toISOString(),
        image: processed.buffer,
        settings: normalized,
        palette,
      });
      try {
        await blob.put(privateSkinPathname(id), serialized);
      } catch {
        throw serviceError("E_STORAGE", "Private storage is temporarily unavailable.");
      }
      return {
        id,
        expiresAt: expiresAt.toISOString(),
        command: `npx --yes @codextheme/cli@0.2.2 apply-private ${id}`,
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
