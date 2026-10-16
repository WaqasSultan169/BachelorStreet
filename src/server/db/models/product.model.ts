import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ProductOptionShape {
  key: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
}

export interface ProductOptionGroupShape {
  key: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  /** Multi-select groups only: maximum number of options that may be chosen. */
  max?: number;
  options: ProductOptionShape[];
}

export interface ProductShape {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category: Types.ObjectId;
  images: string[];
  tags: string[];
  optionGroups: ProductOptionGroupShape[];
  calories?: number;
  preparationMinutes?: number;
  isAvailable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  /** Null means unlimited; otherwise this is the available physical quantity. */
  stockQuantity?: number | null;
  /** Heuristic weight used for "most popular" ordering and bestsellers. */
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<ProductOptionShape>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    priceDelta: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const optionGroupSchema = new Schema<ProductOptionGroupShape>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ["single", "multi"], default: "single" },
    required: { type: Boolean, default: false },
    max: { type: Number, min: 1 },
    options: { type: [optionSchema], default: [] },
  },
  { _id: false },
);

const productSchema = new Schema<ProductShape>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    optionGroups: { type: [optionGroupSchema], default: [] },
    calories: { type: Number, min: 0 },
    preparationMinutes: { type: Number, min: 0 },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    stockQuantity: { type: Number, min: 0, default: null },
    popularity: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, isActive: 1, isAvailable: 1 });
productSchema.index({ isActive: 1, popularity: -1 });
productSchema.index({ name: "text", description: "text", tags: "text" });

export type ProductModel = Model<ProductShape>;

export function getProductModel(): ProductModel {
  return (models.Product as ProductModel | undefined) ??
    model<ProductShape>("Product", productSchema);
}