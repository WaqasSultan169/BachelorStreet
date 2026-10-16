/**
 * Socket.IO event contract shared by the server and the browser client so
 * payloads stay type-safe on both sides.
 */
import { z } from "zod";
import { ORDER_STATUSES, ORDER_TYPES } from "@/lib/constants";

export const SOCKET_NAMESPACE = "/";

export const SOCKET_EVENTS = {
  orderJoin: "order:join",
  orderJoined: "order:joined",
  orderError: "order:error",
  orderStatusChanged: "order:status-changed",
  orderAssigned: "order:assigned",
  deliveryLocation: "order:delivery-location",
  orderCreated: "order:created",
} as const;

export type SocketOrderStatusPayload = {
  eventId: string;
  version: number;
  orderId: string;
  trackingId: string;
  status: import("@/lib/constants").OrderStatus;
  statusLabel: string;
  fulfillmentType: import("@/lib/constants").OrderType;
  updatedAt: string;
  changedAt: string;
  note?: string;
};

export type SocketOrderAssignedPayload = {
  eventId: string;
  version: number;
  orderId: string;
  trackingId: string;
  deliveryBoyName: string;
  assignedAt: string;
  updatedAt: string;
};

export type SocketDeliveryLocationPayload = {
  eventId: string;
  version: number;
  orderId: string;
  trackingId: string;
  coordinates: { lat: number; lng: number };
  updatedAt: string;
};

export type SocketOrderCreatedPayload = {
  type: "order:created";
  eventId: string;
  version: number;
  orderId: string;
  trackingId: string;
  orderNumber: string;
  status: import("@/lib/constants").OrderStatus;
  fulfillmentType: import("@/lib/constants").OrderType;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type SocketOrderJoinPayload = {
  trackingId: string;
};

export type SocketOrderErrorPayload = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" | "INVALID_REQUEST";
  message: string;
};

export type SocketOrderJoinedPayload = {
  orders: { orderId: string; version: number }[];
};

export type SocketOrderEvent =
  | ({ type: "order:status-changed" } & SocketOrderStatusPayload)
  | ({ type: "order:assigned" } & SocketOrderAssignedPayload)
  | ({ type: "order:delivery-location" } & SocketDeliveryLocationPayload)
  | SocketOrderCreatedPayload;

const socketEventBaseSchema = z.object({
  eventId: z.string().uuid(),
  version: z.number().int().positive(),
  orderId: z.string().regex(/^[a-f\d]{24}$/i),
  trackingId: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  updatedAt: z.string().datetime(),
});

export const socketOrderEventSchema = z.discriminatedUnion("type", [
  socketEventBaseSchema.extend({
    type: z.literal(SOCKET_EVENTS.orderStatusChanged),
    status: z.enum(ORDER_STATUSES),
    statusLabel: z.string().min(1).max(80),
    fulfillmentType: z.enum(ORDER_TYPES),
    changedAt: z.string().datetime(),
    note: z.string().max(300).optional(),
  }),
  socketEventBaseSchema.extend({
    type: z.literal(SOCKET_EVENTS.orderAssigned),
    deliveryBoyName: z.string().min(1).max(80),
    assignedAt: z.string().datetime(),
  }),
  socketEventBaseSchema.extend({
    type: z.literal(SOCKET_EVENTS.deliveryLocation),
    coordinates: z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    }),
  }),
  socketEventBaseSchema.extend({
    type: z.literal(SOCKET_EVENTS.orderCreated),
    orderNumber: z.string().min(1).max(40),
    status: z.enum(ORDER_STATUSES),
    fulfillmentType: z.enum(ORDER_TYPES),
    total: z.number().finite().nonnegative(),
    createdAt: z.string().datetime(),
  }),
]);

/** Room names used for scoped delivery. */
export const socketRooms = {
  order: (orderId: string) => `order:${orderId}`,
} as const;
