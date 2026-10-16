import { Schema, model, models, type Model, type Types } from "mongoose";

export interface PromotionShape {
  _id: Types.ObjectId;
  title: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  discountPercent?: number;
  minOrder?: number;
  startsAt?: Date;
  endsAt?: Date;
  isBanner: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<PromotionShape>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    description: { type: String, trim: true, maxlength: 500 },
    imageUrl: { type: String, trim: true, maxlength: 2048 },
    discountPercent: { type: Number, min: 0, max: 100 },
    minOrder: { type: Number, min: 0 },
    startsAt: Date,
    endsAt: Date,
    isBanner: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type PromotionModel = Model<PromotionShape>;

export function getPromotionModel(): PromotionModel {
  return (models.Promotion as PromotionModel | undefined) ??
    model<PromotionShape>("Promotion", promotionSchema);
}
