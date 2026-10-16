/**
 * Cloudinary image helpers shared by client and server.
 *
 * Images can be referenced in three ways:
 *   - a full URL (`https://res.cloudinary.com/...`, `https://live.staticflickr.com/...`)
 *   - a `cloudinary:<public-id>` reference
 *   - a bare Cloudinary public id (`bachelor-street/classic-smash`)
 *
 * The cloud name comes from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` so the same
 * helper works on the server and in the browser bundle. When no cloud name is
 * configured, bare ids are returned unchanged so nothing breaks in dev.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";

export function isCloudinaryConfigured(): boolean {
  return CLOUD_NAME.length > 0;
}

export type CloudinaryTransform = {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "thumb";
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg";
  gravity?: "auto" | "face" | "center";
};

function transformSegment(options?: CloudinaryTransform): string {
  const parts = [
    `f_${options?.format ?? "auto"}`,
    `q_${options?.quality ?? "auto"}`,
  ];
  if (options?.width) parts.push(`w_${options.width}`);
  if (options?.height) parts.push(`h_${options.height}`);
  if (options?.crop) parts.push(`c_${options.crop}`);
  if (options?.gravity) parts.push(`g_${options.gravity}`);
  if (options?.crop && options?.width && options?.height) {
    parts.push("dpr_auto");
  }
  return parts.join(",");
}

/** Build a delivery URL for a Cloudinary public id. */
export function cloudinaryUrl(
  publicId: string,
  options?: CloudinaryTransform,
): string | undefined {
  if (!CLOUD_NAME) return undefined;
  const id = publicId.replace(/^\/+/, "");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformSegment(options)}/${id}`;
}

/**
 * Resolve a stored image reference into a usable `src`.
 * Full URLs pass through untouched; bare/`cloudinary:` ids are turned into
 * optimized Cloudinary delivery URLs when a cloud name is configured.
 */
export function resolveImageUrl(
  src?: string | null,
  options?: CloudinaryTransform,
): string | undefined {
  if (!src) return undefined;
  const value = src.trim();
  if (!value) return undefined;
  // Absolute URLs, data URIs and app-relative paths (e.g. /images/food/x.jpg)
  // are used as-is. Only bare ids and `cloudinary:` refs are transformed.
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  const publicId = value.startsWith("cloudinary:")
    ? value.slice("cloudinary:".length)
    : value;
  return cloudinaryUrl(publicId, options) ?? publicId;
}
