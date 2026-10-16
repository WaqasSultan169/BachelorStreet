import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { AppError, ERROR_CODES, ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Server-side image uploads for hero slides.
 *
 * Storage is Cloudinary, which the project already uses for catalog
 * photography (`scripts/cloudinary-upload.mjs`). Credentials stay on the
 * server; the browser never sees the API secret. Uploads use Cloudinary's
 * signed API with a dependency-free `fetch` + `FormData` request.
 *
 * Required environment variables (server only):
 *   CLOUDINARY_CLOUD_NAME  (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * When these are absent the endpoint fails with a clear 503 rather than
 * silently writing to a local folder that would not persist in production.
 */

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/** Read Cloudinary credentials from the environment, or null when unset. */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_HERO_FOLDER ?? "bachelor-street/hero",
  };
}

export function isUploadConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/** Detect an image MIME type from the file's magic bytes. */
export function sniffImageMime(buffer: Buffer): AllowedImageMime | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  if (startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buffer.subarray(8, 12).toString("latin1").toLowerCase();
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * Validate size + type on the server (never trust the browser). The declared
 * MIME type must match what the bytes actually are.
 */
export function validateImageFile(input: {
  data: Buffer;
  declaredType?: string;
  filename?: string;
}): AllowedImageMime {
  const { data, declaredType } = input;
  if (data.length === 0) {
    throw new ValidationError([{ field: "file", message: "The selected file is empty." }]);
  }
  if (data.length > MAX_IMAGE_BYTES) {
    const mb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
    throw new ValidationError([{ field: "file", message: `Images must be ${mb} MB or smaller.` }]);
  }
  const sniffed = sniffImageMime(data);
  if (!sniffed) {
    throw new ValidationError([
      { field: "file", message: "Unsupported image. Use a JPG, PNG, WebP or AVIF file." },
    ]);
  }
  if (declaredType && declaredType !== sniffed && !(declaredType === "image/jpg" && sniffed === "image/jpeg")) {
    throw new ValidationError([
      { field: "file", message: "The file type does not match its contents." },
    ]);
  }
  return sniffed;
}

function safeBaseName(filename: string | undefined): string {
  const base = (filename ?? "hero")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "hero";
}

function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}

/**
 * Upload an image buffer to Cloudinary and return its secure URL plus metadata.
 * Each upload gets a unique public id, so it can never overwrite another slide.
 */
export async function uploadHeroImage(input: {
  data: Buffer;
  declaredType?: string;
  filename?: string;
}): Promise<UploadedImage> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new ServiceUnavailableError(
      "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }

  const mimeType = validateImageFile(input);

  const timestamp = Math.floor(Date.now() / 1000);
  const now = new Date();
  const publicId = `${config.folder}/${now.getUTCFullYear()}/${now.getUTCMonth() + 1}-${safeBaseName(
    input.filename,
  )}-${randomUUID()}`;

  // The public id already contains the folder path, so it is not sent
  // separately (doing both duplicates the folder in the stored path).
  const signed = { public_id: publicId, timestamp: String(timestamp) };
  const signature = sha1(
    Object.keys(signed)
      .sort()
      .map((key) => `${key}=${signed[key as keyof typeof signed]}`)
      .join("&") + config.apiSecret,
  );

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(input.data)], { type: mimeType }), `${safeBaseName(input.filename)}`);
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("signature", signature);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    logger.error("Cloudinary request failed", error);
    throw new AppError({
      code: ERROR_CODES.INTERNAL,
      status: 502,
      message: "The image service could not be reached. Please try again.",
    });
  }

  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; width?: number; height?: number; bytes?: number; format?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.secure_url) {
    logger.error("Cloudinary upload rejected", {
      status: response.status,
      message: payload?.error?.message,
    });
    throw new AppError({
      code: ERROR_CODES.INTERNAL,
      status: 502,
      message: "The image could not be uploaded. Please try again.",
    });
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id ?? publicId,
    width: payload.width ?? 0,
    height: payload.height ?? 0,
    bytes: payload.bytes ?? input.data.length,
    format: payload.format ?? "",
  };
}
