import { Schema, model, models, type Model, type Types } from "mongoose";

export interface DeliveryZoneShape {
  _id: Types.ObjectId;
  branch: Types.ObjectId;
  name: string;
  areas: string[];
  deliveryFee: number;
  freeAbove?: number;
  minOrder?: number;
  etaMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryZoneSchema = new Schema<DeliveryZoneShape>(
  {
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    areas: { type: [String], default: [] },
    deliveryFee: { type: Number, required: true, min: 0 },
    freeAbove: { type: Number, min: 0 },
    minOrder: { type: Number, min: 0 },
    etaMinutes: { type: Number, required: true, min: 5 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deliveryZoneSchema.index({ branch: 1, isActive: 1 });

export type DeliveryZoneModel = Model<DeliveryZoneShape>;

export function getDeliveryZoneModel(): DeliveryZoneModel {
  return (models.DeliveryZone as DeliveryZoneModel | undefined) ??
    model<DeliveryZoneShape>("DeliveryZone", deliveryZoneSchema);
}