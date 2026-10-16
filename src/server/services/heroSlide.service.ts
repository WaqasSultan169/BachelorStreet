import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getHeroSlideModel, type HeroSlideShape } from "@/server/db/models";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { recordAuditEvent } from "@/server/services/audit.service";
import type { AdminHeroSlideInput } from "@/server/validation/admin";

export type HeroImageSource = "upload" | "url";

export type HeroSlideDto = {
  id: string;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  imageSource?: HeroImageSource;
  mobileImageSource?: HeroImageSource;
  ctaLabel?: string;
  ctaUrl?: string;
  sortOrder: number;
  isActive: boolean;
  /** True for rows created by the demo seeder. Never set by the admin UI. */
  isDemo: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
};

const CLOUDINARY_HOST = "res.cloudinary.com";

/**
 * Legacy rows (and any row without an explicit source) are classified from the
 * stored URL so the admin UI can still show an "Uploaded image" / "External URL"
 * indicator without a migration.
 */
function inferImageSource(url: string | undefined): HeroImageSource | undefined {
  if (!url) return undefined;
  if (url.startsWith("/")) return "url";
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === CLOUDINARY_HOST || host.endsWith(`.${CLOUDINARY_HOST}`) ? "upload" : "url";
  } catch {
    return undefined;
  }
}

function toDto(doc: HeroSlideShape): HeroSlideDto {
  return {
    id: doc._id.toString(),
    title: doc.title,
    subtitle: doc.subtitle,
    desktopImage: doc.desktopImage,
    mobileImage: doc.mobileImage,
    imageSource: doc.imageSource ?? inferImageSource(doc.desktopImage),
    mobileImageSource: doc.mobileImageSource ?? inferImageSource(doc.mobileImage),
    ctaLabel: doc.ctaLabel,
    ctaUrl: doc.ctaUrl,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    isDemo: doc.isDemo ?? false,
    startsAt: doc.startsAt?.toISOString(),
    endsAt: doc.endsAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function activeQuery(now: Date) {
  return {
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
    ],
  };
}

export async function getActiveHeroSlides(): Promise<HeroSlideDto[]> {
  await connectDb();
  const Slide = getHeroSlideModel();
  const now = new Date();
  const rows = await Slide.find(activeQuery(now)).sort({ sortOrder: 1, createdAt: -1 }).lean<HeroSlideShape[]>();
  return rows.map((row) => toDto(row as unknown as HeroSlideShape));
}

export async function listHeroSlides(): Promise<HeroSlideDto[]> {
  await connectDb();
  const Slide = getHeroSlideModel();
  const rows = await Slide.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean<HeroSlideShape[]>();
  return rows.map((row) => toDto(row as unknown as HeroSlideShape));
}

export async function createHeroSlide(actorId: string, data: AdminHeroSlideInput): Promise<HeroSlideDto> {
  await connectDb();
  const Slide = getHeroSlideModel();
  const doc = await Slide.create({
    title: data.title,
    subtitle: data.subtitle || undefined,
    desktopImage: data.desktopImage.trim(),
    mobileImage: data.mobileImage ? data.mobileImage.trim() : undefined,
    imageSource: data.imageSource ?? inferImageSource(data.desktopImage),
    mobileImageSource: data.mobileImage
      ? (data.mobileImageSource ?? inferImageSource(data.mobileImage))
      : undefined,
    ctaLabel: data.ctaLabel ? data.ctaLabel.trim() : undefined,
    ctaUrl: data.ctaUrl ? data.ctaUrl.trim() : undefined,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
    startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
    endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
  });
  const dto = toDto(doc.toObject());
  await recordAuditEvent({ actorId, action: "create", targetType: "heroSlide", targetId: dto.id });
  return dto;
}

export async function updateHeroSlide(actorId: string, data: AdminHeroSlideInput & { id: string }): Promise<HeroSlideDto> {
  await connectDb();
  if (!Types.ObjectId.isValid(data.id)) throw new ValidationError([{ field: "id", message: "Invalid slide." }], "Invalid slide");
  const Slide = getHeroSlideModel();
  const doc = await Slide.findByIdAndUpdate(
    data.id,
    {
      $set: {
        title: data.title,
        subtitle: data.subtitle || undefined,
        desktopImage: data.desktopImage.trim(),
        mobileImage: data.mobileImage ? data.mobileImage.trim() : undefined,
        imageSource: data.imageSource ?? inferImageSource(data.desktopImage),
        mobileImageSource: data.mobileImage
          ? (data.mobileImageSource ?? inferImageSource(data.mobileImage))
          : undefined,
        ctaLabel: data.ctaLabel ? data.ctaLabel.trim() : undefined,
        ctaUrl: data.ctaUrl ? data.ctaUrl.trim() : undefined,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    },
    { new: true },
  );
  if (!doc) throw new NotFoundError("Slide not found.");
  const dto = toDto(doc.toObject());
  await recordAuditEvent({ actorId, action: "update", targetType: "heroSlide", targetId: dto.id });
  return dto;
}

export async function deleteHeroSlide(actorId: string, id: string): Promise<void> {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) throw new ValidationError([{ field: "id", message: "Invalid slide." }], "Invalid slide");
  const Slide = getHeroSlideModel();
  await Slide.findByIdAndDelete(id).orFail();
  await recordAuditEvent({ actorId, action: "delete", targetType: "heroSlide", targetId: id });
}