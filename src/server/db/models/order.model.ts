import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";

/** Snapshot of a chosen customization. Prices are frozen at order time. */
export interface OrderItemOptionShape {
  groupKey: string;
  groupName: string;
  optionKey: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItemShape {
  product: Types.ObjectId;
  /** Snapshots so the order stays readable even if the product changes. */
  name: string;
  slug: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string;
  options: OrderItemOptionShape[];
}

export interface OrderStatusHistoryEntry {
  eventId?: string;
  status: OrderStatus;
  changedBy?: Types.ObjectId;
  changedAt: Date;
  note?: string;
}

export interface CustomerContactShape {
  name: string;
  email: string;
  phone: string;
}

export interface DeliveryAddressShape {
  label: string;
  street?: string;
  area?: string;
  city?: string;
  phone?: string;
  instructions?: string;
  coordinates?: { lat: number; lng: number };
}

export interface DeliveryDetailsShape {
  type: OrderType;
  /** Populated fields on purpose — the address is a snapshot at order time. */
  address?: DeliveryAddressShape;
  branch?: Types.ObjectId;
  branchName?: string;
  branchAddress?: string;
  deliveryZone?: Types.ObjectId;
  zoneName?: string;
  etaMinutes?: number;
  deliveryBoy?: Types.ObjectId;
  deliveryBoyName?: string;
  assignedAt?: Date;
  lastLocation?: {
    coordinates: { lat: number; lng: number };
    updatedAt: Date;
  };
}

export interface OrderFulfillmentHistoryEntry {
  eventId: string;
  type: "assigned" | "delivery_location";
  actor: Types.ObjectId;
  at: Date;
  deliveryBoy?: Types.ObjectId;
  deliveryBoyName?: string;
  coordinates?: { lat: number; lng: number };
}

export interface PaymentDetailsShape {
  method: PaymentMethod;
  status: PaymentStatus;
  /** Provider identifier once a real online integration is wired. */
  provider?: string;
  transactionId?: string;
  paidAt?: Date;
}

export interface OrderShape {
  _id: Types.ObjectId;
  orderNumber: string;
  /** Non-guessable public identifier used for the confirmation/tracking page. */
  trackingId: string;
  /** Null for guest checkout; set when an authenticated customer orders. */
  user?: Types.ObjectId | null;
  contact: CustomerContactShape;
  items: OrderItemShape[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  promotionCode?: string;
  total: number;
  currency: string;
  delivery: DeliveryDetailsShape;
  payment: PaymentDetailsShape;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  fulfillmentHistory: OrderFulfillmentHistoryEntry[];
  version: number;
  /** Unique per submission; prevents duplicate orders on retry/refresh. */
  idempotencyKey?: string;
  /** Binds an idempotency key to its original payload and account. */
  requestHash?: string;
  customerNote?: string;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  /** True for records created by the development-only demo seeder. */
  isDemo: boolean;
}

const orderSchema = new Schema<OrderShape>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    trackingId: { type: String, required: true, unique: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    contact: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },
    items: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          name: { type: String, required: true },
          slug: { type: String, default: "" },
          image: String,
          unitPrice: { type: Number, required: true, min: 0 },
          quantity: { type: Number, required: true, min: 1 },
          lineTotal: { type: Number, required: true, min: 0 },
          note: String,
          options: {
            type: [
              {
                groupKey: String,
                groupName: String,
                optionKey: String,
                optionName: String,
                priceDelta: { type: Number, default: 0 },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    promotionCode: { type: String, trim: true, uppercase: true, maxlength: 32 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    delivery: {
      type: {
        type: String,
        enum: ORDER_TYPES,
        required: true,
      },
      address: {
        label: String,
        street: String,
        area: String,
        city: String,
        phone: String,
        instructions: String,
        coordinates: { lat: Number, lng: Number },
      },
      branch: { type: Schema.Types.ObjectId, ref: "Branch" },
      branchName: String,
      branchAddress: String,
      deliveryZone: { type: Schema.Types.ObjectId, ref: "DeliveryZone" },
      zoneName: String,
      etaMinutes: Number,
      deliveryBoy: { type: Schema.Types.ObjectId, ref: "User" },
      deliveryBoyName: String,
      assignedAt: Date,
      lastLocation: {
        coordinates: { lat: Number, lng: Number },
        updatedAt: Date,
      },
    },
    payment: {
      type: {
        method: { type: String, enum: PAYMENT_METHODS, required: true },
        status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
        provider: String,
        transactionId: String,
        paidAt: Date,
      },
      required: true,
    },
    status: {
      type: String,
      enum: [...ORDER_STATUSES, "ready", "out-for-delivery"],
      default: "pending",
      index: true,
    },
    statusHistory: {
      type: [
        {
          eventId: String,
          status: {
            type: String,
            enum: [...ORDER_STATUSES, "ready", "out-for-delivery"],
            required: true,
          },
          changedBy: { type: Schema.Types.ObjectId, ref: "User" },
          changedAt: { type: Date, default: Date.now },
          note: String,
        },
      ],
      default: [],
    },
    fulfillmentHistory: {
      type: [
        {
          eventId: { type: String, required: true },
          type: { type: String, enum: ["assigned", "delivery_location"], required: true },
          actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
          at: { type: Date, required: true },
          deliveryBoy: { type: Schema.Types.ObjectId, ref: "User" },
          deliveryBoyName: { type: String, trim: true, maxlength: 80 },
          coordinates: { lat: Number, lng: Number },
        },
      ],
      default: [],
    },
    version: { type: Number, default: 1, min: 1 },
    idempotencyKey: { type: String },
    requestHash: { type: String },
    customerNote: { type: String },
    placedAt: { type: Date, default: Date.now },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ user: 1, placedAt: -1 });
orderSchema.index({ "delivery.deliveryBoy": 1, status: 1 });
// Unique only when present (sparse) so guest orders without a key are allowed.
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export type OrderModel = Model<OrderShape>;

export function getOrderModel(): OrderModel {
  return (models.Order as OrderModel | undefined) ??
    model<OrderShape>("Order", orderSchema);
}