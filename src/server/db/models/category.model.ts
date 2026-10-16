import { Schema, model, models, type Model, type Types } from "mongoose";

export interface CategoryShape {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryShape>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryModel = Model<CategoryShape>;

export function getCategoryModel(): CategoryModel {
  return (models.Category as CategoryModel | undefined) ??
    model<CategoryShape>("Category", categorySchema);
}