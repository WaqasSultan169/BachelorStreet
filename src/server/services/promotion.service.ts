import "server-only";
import { connectDb } from "@/server/db";
import { getPromotionModel } from "@/server/db/models";
import { BadRequestError } from "@/lib/errors";

export async function calculatePromotionDiscount(
  code: string | undefined,
  subtotal: number,
): Promise<{ code?: string; discount: number; title?: string }> {
  if (!code?.trim()) return { discount: 0 };
  await connectDb();
  const now = new Date();
  const promotion = await getPromotionModel().findOne({
    code: code.trim().toUpperCase(),
    isActive: true,
    discountPercent: { $gt: 0 },
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
    ],
  }).select("title code discountPercent minOrder").lean<{
    title: string;
    code: string;
    discountPercent: number;
    minOrder?: number;
  } | null>();
  if (!promotion) {
    throw new BadRequestError("That promotion code is invalid or no longer active.");
  }
  if (promotion.minOrder != null && subtotal < promotion.minOrder) {
    throw new BadRequestError(
      `This code requires a subtotal of at least PKR ${promotion.minOrder}.`,
    );
  }
  const discount = Math.min(
    subtotal,
    Math.round(subtotal * promotion.discountPercent / 100),
  );
  return { code: promotion.code, discount, title: promotion.title };
}

export async function listActivePromotionBanners(): Promise<{
  title: string;
  description?: string;
  imageUrl?: string;
  code?: string;
  discountPercent?: number;
}[]> {
  await connectDb();
  const now = new Date();
  const banners = await getPromotionModel().find({
    isActive: true,
    isBanner: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
    ],
  }).sort({ createdAt: -1 }).limit(3)
    .select("title description imageUrl code discountPercent")
    .lean();
  return banners.map((banner) => ({
    title: banner.title,
    description: banner.description ?? undefined,
    imageUrl: banner.imageUrl?.startsWith("https://") || banner.imageUrl?.startsWith("http://")
      ? banner.imageUrl
      : undefined,
    code: banner.code ?? undefined,
    discountPercent: banner.discountPercent ?? undefined,
  }));
}
