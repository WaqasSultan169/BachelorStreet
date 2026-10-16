import { Schema, model, models, type Model, type Types } from "mongoose";

export interface StoreSettingsShape {
  _id: Types.ObjectId;
  key: "store";
  deliveryRadiusKm: number;
  deliveryEnabled: boolean;
  updatedAt: Date;
}

const storeSettingsSchema = new Schema<StoreSettingsShape>(
  {
    key: { type: String, enum: ["store"], default: "store", unique: true },
    deliveryRadiusKm: { type: Number, min: 0.1, max: 50, default: 5 },
    deliveryEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type StoreSettingsModel = Model<StoreSettingsShape>;

export function getStoreSettingsModel(): StoreSettingsModel {
  return (models.StoreSettings as StoreSettingsModel | undefined) ??
    model<StoreSettingsShape>("StoreSettings", storeSettingsSchema);
}
