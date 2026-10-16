import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireRole } from "@/server/middleware/require-auth";
import { MAX_IMAGE_BYTES, uploadHeroImage } from "@/server/services/upload.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 256 * 1024; // image + multipart overhead

/**
 * POST /api/admin/hero/upload
 *
 * Admin-only image upload for hero slides. Accepts `multipart/form-data` with a
 * `file` field, validates type/size on the server and stores the image in
 * Cloudinary. Returns `{ url, publicId, width, height, bytes, format }`.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const actor = await requireRole(["admin"]);
  await enforceRateLimit("staffOrderUpdate", actor.id);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    const mb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
    throw new BadRequestError(`Images must be ${mb} MB or smaller.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new BadRequestError("Expected a multipart/form-data upload.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new BadRequestError("Attach an image in the 'file' field.");
  }

  const uploaded = await uploadHeroImage({
    data: Buffer.from(await file.arrayBuffer()),
    declaredType: file.type || undefined,
    filename: file.name || undefined,
  });

  return ok(uploaded, { message: "Image uploaded." });
});
