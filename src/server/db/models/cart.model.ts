import { Schema, model, models, type Model, type Types } from "mongoose";

export interface CartItemShape {
  product: Types.ObjectId;
  name: string;
  unitPrice: number;
  quantity: number;
  note?: string;
}

export interface CartShape {
  _id: Types.ObjectId;
  owner:
    | { user: Types.ObjectId }
    | { guestId: string };
  items: CartItemShape[];
  currency: string;
  updatedAt: Date;
  createdAt: Date;
}

const cartSchema = new Schema<CartShape>(
  {
    owner: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    items: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          name: { type: String, required: true },
          unitPrice: { type: Number, required: true, min: 0 },
          quantity: { type: Number, required: true, min: 1 },
          note: String,
        },
      ],
      default: [],
    },
    currency: { type: String, default: "PKR" },
  },
  { timestamps: true },
);

cartSchema.index({ "owner.user": 1 }, { sparse: true });
cartSchema.index({ "owner.guestId": 1 }, { sparse: true });

export type CartModel = Model<CartShape>;

export function getCartModel(): CartModel {
  return (models.Cart as CartModel | undefined) ??
    model<CartShape>("Cart", cartSchema);
}