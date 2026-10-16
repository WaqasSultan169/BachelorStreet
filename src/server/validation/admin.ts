import { z } from "zod";
import { objectIdSchema } from "@/server/validation/common";
import { ROLES } from "@/lib/constants";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const adminProductUpdateSchema = z.object({
  id: objectIdSchema,
  price: z.number().finite().min(0).max(1_000_000),
  stockQuantity: z.number().int().min(0).nullable(),
  isAvailable: z.boolean(),
  isActive: z.boolean(),
});

export const adminProductCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  description: optionalText(1000),
  price: z.number().finite().min(0).max(1_000_000),
  categoryId: objectIdSchema,
  stockQuantity: z.number().int().min(0).nullable(),
});

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  description: optionalText(300),
});

export const adminCategoryUpdateSchema = z.object({
  id: objectIdSchema,
  isActive: z.boolean(),
});

export const adminBranchUpdateSchema = z.object({
  id: objectIdSchema,
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(500),
  phone: optionalText(20),
  city: z.string().trim().min(2).max(80),
  isActive: z.boolean(),
  deliveryAvailable: z.boolean(),
  pickupAvailable: z.boolean(),
  hours: z.array(z.object({
    day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
    open: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    close: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    closed: z.boolean(),
  })).length(7),
});

export const adminBranchCreateSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(500),
  phone: optionalText(20),
  city: z.string().trim().min(2).max(80),
});

export const adminZoneUpdateSchema = z.object({
  id: objectIdSchema,
  name: z.string().trim().min(2).max(80),
  areas: z.array(z.string().trim().min(2).max(80)).max(100),
  deliveryFee: z.number().finite().min(0).max(100_000),
  freeAbove: z.number().finite().min(0).max(1_000_000).optional(),
  minOrder: z.number().finite().min(0).max(1_000_000).optional(),
  etaMinutes: z.number().int().min(5).max(240),
  isActive: z.boolean(),
});

export const adminZoneCreateSchema = z.object({
  branchId: objectIdSchema,
  name: z.string().trim().min(2).max(80),
  areas: z.array(z.string().trim().min(2).max(80)).max(100),
  deliveryFee: z.number().finite().min(0).max(100_000),
  freeAbove: z.number().finite().min(0).max(1_000_000).optional(),
  minOrder: z.number().finite().min(0).max(1_000_000).optional(),
  etaMinutes: z.number().int().min(5).max(240),
});

export const adminPromotionSchema = z.object({
  id: objectIdSchema.optional(),
  title: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().min(3).max(32).optional().or(z.literal("")),
  description: optionalText(500),
  imageUrl: z.string().trim().max(2048).url()
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Use an HTTP or HTTPS image URL.")
    .optional().or(z.literal("")),
  discountPercent: z.number().finite().min(0).max(100).optional(),
  minOrder: z.number().finite().min(0).max(1_000_000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isBanner: z.boolean(),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (value.code && !value.discountPercent) {
    context.addIssue({
      code: "custom",
      path: ["discountPercent"],
      message: "A discount code requires a positive discount percentage.",
    });
  }
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "The end time must be after the start time.",
    });
  }
});

export const adminStaffUpdateSchema = z.object({
  id: objectIdSchema,
  role: z.enum(ROLES),
  isActive: z.boolean(),
});

export const adminCustomerStatusSchema = z.object({
  id: objectIdSchema,
  isActive: z.boolean(),
});

export const adminStoreSettingsSchema = z.object({
  deliveryRadiusKm: z.number().finite().min(0.1).max(50),
  deliveryEnabled: z.boolean(),
});

export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;
export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminBranchUpdateInput = z.infer<typeof adminBranchUpdateSchema>;
export type AdminZoneUpdateInput = z.infer<typeof adminZoneUpdateSchema>;
export const adminHeroSlideSchema = z.object({
  id: objectIdSchema.optional(),
  title: z.string().trim().min(2).max(120),
  subtitle: optionalText(240),
  desktopImage: z.string().trim().max(2048),
  mobileImage: optionalText(2048).or(z.literal("")),
  imageSource: z.enum(["upload", "url"]).optional(),
  mobileImageSource: z.enum(["upload", "url"]).optional(),
  ctaLabel: optionalText(40),
  ctaUrl: optionalText(2048),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
  startsAt: z.string().datetime().optional().or(z.literal("")),
  endsAt: z.string().datetime().optional().or(z.literal("")),
}).superRefine((value, context) => {
  try {
    const url = new URL(value.desktopImage, value.desktopImage.startsWith("/") ? "http://localhost" : undefined);
    if (!["https:", "http:"].includes(url.protocol) && !value.desktopImage.startsWith("/")) {
      context.addIssue({ code: "custom", path: ["desktopImage"], message: "Use a safe local or HTTP image URL." });
    }
  } catch {
    if (!value.desktopImage.startsWith("/")) {
      context.addIssue({ code: "custom", path: ["desktopImage"], message: "Use a valid image URL." });
    }
  }

  if (value.mobileImage) {
    try {
      const url = new URL(value.mobileImage, value.mobileImage.startsWith("/") ? "http://localhost" : undefined);
      if (!["https:", "http:"].includes(url.protocol) && !value.mobileImage.startsWith("/")) {
        context.addIssue({ code: "custom", path: ["mobileImage"], message: "Use a safe local or HTTP image URL." });
      }
    } catch {
      if (!value.mobileImage.startsWith("/")) {
        context.addIssue({ code: "custom", path: ["mobileImage"], message: "Use a valid image URL." });
      }
    }
  }

  if (value.ctaUrl) {
    const url = value.ctaUrl;
    if (url.startsWith("/") ) {
      // internal route allowed
    } else {
      try {
        const parsed = new URL(url);
        if (!["https:", "http:"].includes(parsed.protocol)) {
          throw new Error("bad");
        }
      } catch {
        context.addIssue({ code: "custom", path: ["ctaUrl"], message: "Use a relative path or HTTPS URL." });
      }
    }
  }

  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    context.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "The end time must be after the start time.",
    });
  }
});

export type AdminHeroSlideInput = z.infer<typeof adminHeroSlideSchema>;
export type AdminPromotionInput = z.infer<typeof adminPromotionSchema>;
export type AdminStaffUpdateInput = z.infer<typeof adminStaffUpdateSchema>;
