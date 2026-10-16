import { Schema, model, models, type Model, type Types } from "mongoose";

export interface BranchHours {
  day: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface BranchShape {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  address: string;
  phone?: string;
  city: string;
  hours: BranchHours[];
  coordinates?: { lat: number; lng: number };
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<BranchShape>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, default: "Islamabad", trim: true },
    hours: {
      type: [
        {
          day: { type: String, required: true },
          open: String,
          close: String,
          closed: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    deliveryAvailable: { type: Boolean, default: true },
    pickupAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type BranchModel = Model<BranchShape>;

export function getBranchModel(): BranchModel {
  return (models.Branch as BranchModel | undefined) ??
    model<BranchShape>("Branch", branchSchema);
}