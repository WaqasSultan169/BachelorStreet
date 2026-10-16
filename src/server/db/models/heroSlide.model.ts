import { Schema, model, models, type Model, type Types } from "mongoose";

/** How an image was provided by an administrator. */
export const HERO_IMAGE_SOURCES = ["upload", "url"] as const;
export type HeroImageSource = (typeof HERO_IMAGE_SOURCES)[number];

export interface HeroSlideShape {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  /**
   * How the desktop image was supplied. Optional so every slide created before
   * uploads existed still loads; the service infers a value from the URL for
   * rows that predate this field.
   */
  imageSource?: HeroImageSource;
  mobileImageSource?: HeroImageSource;
  ctaLabel?: string;
  ctaUrl?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  /**
   * Marks rows created by the demo seeder so they can be identified and never
   * overwritten. Administrator-created slides leave this unset/false.
   */
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const heroSlideSchema = new Schema<HeroSlideShape>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 240 },
    desktopImage: { type: String, required: true, trim: true, maxlength: 2048 },
    mobileImage: { type: String, trim: true, maxlength: 2048 },
    imageSource: { type: String, enum: HERO_IMAGE_SOURCES },
    mobileImageSource: { type: String, enum: HERO_IMAGE_SOURCES },
    ctaLabel: { type: String, trim: true, maxlength: 40 },
    ctaUrl: { type: String, trim: true, maxlength: 2048 },
    sortOrder: { type: Number, min: 0, max: 9999, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

heroSlideSchema.index({ isActive: 1, sortOrder: 1, startsAt: 1, endsAt: 1 });
heroSlideSchema.index({ isDemo: 1 });

export type HeroSlideModel = Model<HeroSlideShape>;

export function getHeroSlideModel(): HeroSlideModel {
  return (models.HeroSlide as HeroSlideModel | undefined) ??
    model<HeroSlideShape>("HeroSlide", heroSlideSchema);
}
